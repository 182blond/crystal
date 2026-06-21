import {
  byteToHex,
  PARTY_MON1_BASE,
  PARTY_MON_MOVE_PP_OFFSETS,
  PARTY_MON_STRUCT_LENGTH
} from "./crystal-party-data";
import { MemoryPatchInput } from "./party-patches";

const ppCache = new Map<number, number>();
const ppPending = new Map<number, Promise<number | null>>();

function toAddress(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function slotBaseAddress(slot: number): number {
  return PARTY_MON1_BASE + (slot - 1) * PARTY_MON_STRUCT_LENGTH;
}

/** Gen 2 stores current PP in the low 6 bits of each PP byte. */
function encodePpByte(maxPp: number): number {
  return Math.max(0, Math.min(63, maxPp)) & 0x3f;
}

async function fetchMoveMaxPp(moveId: number): Promise<number | null> {
  if (moveId < 1 || moveId > 251) {
    return null;
  }

  const cached = ppCache.get(moveId);
  if (cached !== undefined) {
    return cached;
  }

  const inFlight = ppPending.get(moveId);
  if (inFlight) {
    return inFlight;
  }

  const request = fetch("https://pokeapi.co/api/v2/move/" + moveId)
    .then(function(response) {
      if (!response.ok) {
        return null;
      }
      return response.json();
    })
    .then(function(payload) {
      if (!payload || typeof payload.pp !== "number") {
        return null;
      }
      return payload.pp;
    })
    .catch(function() {
      return null;
    })
    .then(function(pp) {
      ppPending.delete(moveId);
      if (pp !== null) {
        ppCache.set(moveId, pp);
      }
      return pp;
    });

  ppPending.set(moveId, request);
  return request;
}

export async function getMoveMaxPp(moveIdHex: string): Promise<number> {
  if (!moveIdHex || moveIdHex === "00") {
    return 0;
  }

  const moveId = parseInt(moveIdHex, 16);
  if (isNaN(moveId)) {
    return 0;
  }

  const pp = await fetchMoveMaxPp(moveId);
  return pp !== null ? pp : 20;
}

export async function buildMovePpPatches(
  slot: number,
  moves: [string, string, string, string]
): Promise<MemoryPatchInput[]> {
  const base = slotBaseAddress(slot);
  const patches: MemoryPatchInput[] = [];

  for (let index = 0; index < 4; index++) {
    const maxPp = await getMoveMaxPp(moves[index]);
    patches.push({
      address: toAddress(base + PARTY_MON_MOVE_PP_OFFSETS[index]),
      value: byteToHex(encodePpByte(maxPp))
    });
  }

  return patches;
}
