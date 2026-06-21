import {
  PARTY_MON1_BASE,
  PARTY_MON_EXP_OFFSET,
  PARTY_MON_STRUCT_LENGTH,
  byteToHex,
  getPartySlotMap
} from "./crystal-party-data";
import { MemoryPatchInput } from "./party-patches";
import { clampPartyLevel } from "./party-memory";

const growthRateCache = new Map<number, string>();
const growthRatePending = new Map<number, Promise<string>>();

function toAddress(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function slotBaseAddress(slot: number): number {
  return PARTY_MON1_BASE + (slot - 1) * PARTY_MON_STRUCT_LENGTH;
}

async function fetchGrowthRate(dexId: number): Promise<string> {
  try {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon-species/" + dexId);
    if (!response.ok) {
      return "medium-fast";
    }

    const payload = await response.json();
    if (payload.growth_rate && payload.growth_rate.name) {
      return payload.growth_rate.name;
    }
  } catch (error) {
    // fall through
  }

  return "medium-fast";
}

export async function getGrowthRate(dexId: number): Promise<string> {
  const cached = growthRateCache.get(dexId);
  if (cached) {
    return cached;
  }

  const inFlight = growthRatePending.get(dexId);
  if (inFlight) {
    return inFlight;
  }

  const request = fetchGrowthRate(dexId).then(function(rate) {
    growthRatePending.delete(dexId);
    growthRateCache.set(dexId, rate);
    return rate;
  });

  growthRatePending.set(dexId, request);
  return request;
}

/** Gen II total experience required to reach a level (minimum exp for that level). */
export function calcExpAtLevel(level: number, growthRate: string): number {
  const clampedLevel = clampPartyLevel(level);
  if (clampedLevel <= 1) {
    return 0;
  }

  const n = clampedLevel;
  let exp = 0;

  switch (growthRate) {
    case "fast":
      exp = Math.floor((4 * n * n * n) / 5);
      break;
    case "medium-slow":
      exp = Math.floor((6 * n * n * n) / 5 - 15 * n * n + 100 * n - 140);
      break;
    case "slow":
      exp = Math.floor((5 * n * n * n) / 4);
      break;
    case "medium-fast":
    default:
      exp = n * n * n;
      break;
  }

  return Math.max(0, Math.min(0xffffff, exp));
}

export function buildLevelExpPatches(
  slot: number,
  level: number,
  exp: number
): MemoryPatchInput[] {
  const map = getPartySlotMap(slot);
  const base = slotBaseAddress(slot);
  const clampedLevel = clampPartyLevel(level);
  const clampedExp = Math.max(0, Math.min(0xffffff, exp));

  return [
    { address: map.level, value: byteToHex(clampedLevel) },
    { address: toAddress(base + PARTY_MON_EXP_OFFSET), value: byteToHex((clampedExp >> 16) & 0xff) },
    {
      address: toAddress(base + PARTY_MON_EXP_OFFSET + 1),
      value: byteToHex((clampedExp >> 8) & 0xff)
    },
    { address: toAddress(base + PARTY_MON_EXP_OFFSET + 2), value: byteToHex(clampedExp & 0xff) }
  ];
}
