import {
  PARTY_COUNT_ADDRESS,
  PARTY_MON1_BASE,
  PARTY_MON_HAPPINESS_OFFSET,
  PARTY_MON_STATUS_OFFSET,
  PARTY_MON_STRUCT_LENGTH,
  PARTY_MON_OT_ID_OFFSET,
  PARTY_MON_POKERUS_OFFSET,
  PARTY_MON_CAUGHT_DATA_OFFSET,
  PARTY_NICKNAME_BASE,
  PARTY_NICKNAME_LENGTH,
  PARTY_NICKNAME_STRIDE,
  PARTY_OT_NAME_BASE,
  PARTY_OT_NAME_STRIDE,
  PLAYER_ID_ADDRESS,
  PLAYER_NAME_ADDRESS,
  PARTY_SPECIES_LIST_BASE,
  PARTY_SLOT_MAPS,
  PartySlotConfig,
  NON_SHINY_DV_VALUES,
  SHINY_DV_VALUES,
  byteToHex,
  isShinyDVs,
  getPartySlotMap
} from "./crystal-party-data";
import { GameBoyInstance } from "./jsgbc-globals";

export interface MemoryPatchInput {
  address: string;
  value: string;
}

function toAddress(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

/** Decide which DV bytes to force for this apply (shiny on, or clear shiny). */
export function resolveDvPatch(
  gameboy: GameBoyInstance,
  config: PartySlotConfig,
  hadShinyOverride: boolean
): [string, string] | undefined {
  const map = PARTY_SLOT_MAPS[config.slot - 1];
  if (!map) {
    return undefined;
  }

  if (config.shiny) {
    return SHINY_DV_VALUES;
  }

  const dv1 = gameboy.readByte(map.shiny[0]);
  const dv2 = gameboy.readByte(map.shiny[1]);

  if (hadShinyOverride || isShinyDVs(dv1, dv2)) {
    return NON_SHINY_DV_VALUES;
  }

  return undefined;
}

export function withDvPatch(
  gameboy: GameBoyInstance,
  config: PartySlotConfig,
  hadShinyOverride: boolean
): PartySlotConfig {
  const dvPatch = resolveDvPatch(gameboy, config, hadShinyOverride);
  if (!dvPatch) {
    return config;
  }

  return {
    slot: config.slot,
    speciesId: config.speciesId,
    shiny: config.shiny,
    level: config.level,
    moves: config.moves,
    dvPatch: dvPatch
  };
}

export function buildSlotPatches(config: PartySlotConfig): MemoryPatchInput[] {
  const map = PARTY_SLOT_MAPS[config.slot - 1];
  if (!map) {
    throw new Error("Invalid slot " + config.slot);
  }

  const patches: MemoryPatchInput[] = [
    { address: map.speciesStruct, value: config.speciesId },
    { address: map.speciesList, value: config.speciesId }
  ];

  if (config.dvPatch) {
    patches.push(
      { address: map.shiny[0], value: config.dvPatch[0] },
      { address: map.shiny[1], value: config.dvPatch[1] }
    );
  }

  config.moves.forEach(function(moveId, index) {
    patches.push({
      address: map.moves[index],
      value: moveId || "00"
    });
  });

  return patches;
}

export function buildNicknamePatches(
  slot: number,
  bytes: number[]
): MemoryPatchInput[] {
  const base = PARTY_NICKNAME_BASE + (slot - 1) * PARTY_NICKNAME_STRIDE;

  return bytes.slice(0, PARTY_NICKNAME_LENGTH).map(function(value, index) {
    return {
      address: toAddress(base + index),
      value: byteToHex(value)
    };
  });
}

export function buildOtNamePatches(
  gameboy: GameBoyInstance,
  slot: number
): MemoryPatchInput[] {
  const base = PARTY_OT_NAME_BASE + (slot - 1) * PARTY_OT_NAME_STRIDE;
  const playerNameBase = parseInt(PLAYER_NAME_ADDRESS, 16);
  const patches: MemoryPatchInput[] = [];

  for (let index = 0; index < PARTY_NICKNAME_LENGTH; index++) {
    patches.push({
      address: toAddress(base + index),
      value: byteToHex(gameboy.readByte(playerNameBase + index))
    });
  }

  return patches;
}

function readPlayerOtIdBytes(gameboy: GameBoyInstance): [number, number] {
  const base = parseInt(PLAYER_ID_ADDRESS, 16);
  return [gameboy.readByte(base), gameboy.readByte(base + 1)];
}

/** Initialize OT id, happiness and sane defaults for a brand-new party slot. */
export function buildNewMonBootstrapPatches(
  gameboy: GameBoyInstance,
  slot: number
): MemoryPatchInput[] {
  const base = PARTY_MON1_BASE + (slot - 1) * PARTY_MON_STRUCT_LENGTH;
  const otId = readPlayerOtIdBytes(gameboy);

  return [
    { address: toAddress(base + PARTY_MON_OT_ID_OFFSET), value: byteToHex(otId[0]) },
    {
      address: toAddress(base + PARTY_MON_OT_ID_OFFSET + 1),
      value: byteToHex(otId[1])
    },
    { address: toAddress(base + 1), value: "00" },
    { address: toAddress(base + PARTY_MON_HAPPINESS_OFFSET), value: byteToHex(70) },
    { address: toAddress(base + PARTY_MON_POKERUS_OFFSET), value: "00" },
    { address: toAddress(base + PARTY_MON_CAUGHT_DATA_OFFSET), value: "00" },
    { address: toAddress(base + PARTY_MON_CAUGHT_DATA_OFFSET + 1), value: "00" },
    { address: toAddress(base + PARTY_MON_STATUS_OFFSET), value: "00" },
    { address: toAddress(base + 0x21), value: "00" }
  ];
}

export function mergePartyPatches(
  slotConfigs: PartySlotConfig[],
  nicknameBytesBySlot: Map<number, number[]>,
  statPatchesBySlot?: Map<number, MemoryPatchInput[]>
): MemoryPatchInput[] {
  const patches: MemoryPatchInput[] = [];

  for (const config of slotConfigs) {
    patches.push.apply(patches, buildSlotPatches(config));

    const nicknameBytes = nicknameBytesBySlot.get(config.slot);
    if (nicknameBytes) {
      patches.push.apply(patches, buildNicknamePatches(config.slot, nicknameBytes));
    }

    if (statPatchesBySlot) {
      const statPatches = statPatchesBySlot.get(config.slot);
      if (statPatches) {
        patches.push.apply(patches, statPatches);
      }
    }
  }

  return patches;
}

/** Extend party count and species-list terminator when adding a higher slot. */
export function buildPartyCountPatches(
  gameboy: GameBoyInstance,
  highestSlot: number
): MemoryPatchInput[] {
  if (highestSlot < 1) {
    return [];
  }

  const currentCount = gameboy.readByte(PARTY_COUNT_ADDRESS) & 0xff;
  if (highestSlot <= currentCount) {
    return [];
  }

  return [
    { address: PARTY_COUNT_ADDRESS, value: byteToHex(highestSlot) },
    {
      address: toAddress(PARTY_SPECIES_LIST_BASE + highestSlot),
      value: "FF"
    }
  ];
}

/** Write party edits once to WRAM; do not keep GameShark-style persistent patches. */
export function applyMemoryPatchesOnce(
  gameboy: GameBoyInstance,
  patches: MemoryPatchInput[]
): void {
  for (const patch of patches) {
    gameboy.writeByte(patch.address, patch.value);
  }

  gameboy.clearMemoryPatches();
}
