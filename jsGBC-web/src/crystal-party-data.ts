/** Crystal WRAM party layout (pret / Data Crystal). */
export const PARTY_COUNT_ADDRESS = "DCD7";
export const PARTY_SPECIES_LIST_BASE = 0xdcd8;
export const PARTY_MON1_BASE = 0xdcdf;
export const PARTY_MON_STRUCT_LENGTH = 0x30;
export const PARTY_LENGTH = 6;
/** Level byte offset within each 0x30 party mon struct. */
export const PARTY_MON_LEVEL_OFFSET = 0x1f;
/** Experience (3 bytes, big-endian) within each party mon struct. */
export const PARTY_MON_EXP_OFFSET = 0x08;
/** Move PP bytes (one per move) within each party mon struct. */
export const PARTY_MON_MOVE_PP_OFFSETS = [0x17, 0x18, 0x19, 0x1a];
export const PARTY_MON_HAPPINESS_OFFSET = 0x1b;
export const PARTY_MON_STATUS_OFFSET = 0x20;
export const DEFAULT_NEW_MON_LEVEL = 1;
export const PARTY_NICKNAME_BASE = 0xde41;
export const PARTY_NICKNAME_LENGTH = 11;
export const PARTY_NICKNAME_STRIDE = 0x0b;
export const PARTY_OT_NAME_BASE = 0xddff;
export const PARTY_OT_NAME_STRIDE = 0x0b;
export const PLAYER_ID_ADDRESS = "D47B";
export const PLAYER_NAME_ADDRESS = "D47D";
export const PARTY_MON_OT_ID_OFFSET = 0x06;
export const PARTY_MON_POKERUS_OFFSET = 0x1c;
export const PARTY_MON_CAUGHT_DATA_OFFSET = 0x1d;

export const SHINY_DV_VALUES: [string, string] = ["EA", "AA"];
/** Generic non-shiny DVs used when clearing a forced shiny override. */
export const NON_SHINY_DV_VALUES: [string, string] = ["37", "29"];

export interface PartySlotMap {
  slot: number;
  /** Species byte inside the party mon struct. */
  speciesStruct: string;
  /** Species byte in the wPartySpecies list. */
  speciesList: string;
  nickname: string;
  shiny: [string, string];
  level: string;
  moves: [string, string, string, string];
}

export interface PartySlotConfig {
  slot: number;
  speciesId: string;
  shiny: boolean;
  level: number;
  moves: [string, string, string, string];
  /** When set, DVs are forced every frame (shiny on/off). */
  dvPatch?: [string, string];
}

export interface PartySlotSnapshot {
  slot: number;
  occupied: boolean;
  speciesId: string;
  shiny: boolean;
  level: number;
  moves: [string, string, string, string];
}

export interface GamesharkEntry {
  id: string;
  name: string;
}

function toAddress(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

/** Build RAM addresses for one party slot (1-6). */
export function getPartySlotMap(slot: number): PartySlotMap {
  if (slot < 1 || slot > PARTY_LENGTH) {
    throw new Error("Invalid slot " + slot);
  }

  const base = PARTY_MON1_BASE + (slot - 1) * PARTY_MON_STRUCT_LENGTH;

  return {
    slot,
    speciesStruct: toAddress(base),
    speciesList: toAddress(PARTY_SPECIES_LIST_BASE + slot - 1),
    nickname: toAddress(PARTY_NICKNAME_BASE + (slot - 1) * PARTY_NICKNAME_STRIDE),
    shiny: [toAddress(base + 0x15), toAddress(base + 0x16)],
    level: toAddress(base + PARTY_MON_LEVEL_OFFSET),
    moves: [
      toAddress(base + 0x2),
      toAddress(base + 0x3),
      toAddress(base + 0x4),
      toAddress(base + 0x5)
    ]
  };
}

export const PARTY_SLOT_MAPS: PartySlotMap[] = Array.from(
  { length: PARTY_LENGTH },
  (_, index) => getPartySlotMap(index + 1)
);

/**
 * GameShark codes like 91xxe1dc store the address as swapped bytes (e1dc -> DCE1).
 */
export function decodeGamesharkAddress(codeSuffix: string): number {
  const cleaned = codeSuffix.trim().replace(/^0x/i, "").toUpperCase();
  if (!/^[0-9A-F]{4}$/.test(cleaned)) {
    throw new Error("Invalid GameShark address: " + codeSuffix);
  }

  const byte1 = parseInt(cleaned.slice(0, 2), 16);
  const byte2 = parseInt(cleaned.slice(2, 4), 16);
  return (byte2 << 8) | byte1;
}

export function byteToHex(value: number): string {
  return (value & 0xff).toString(16).toUpperCase().padStart(2, "0");
}

export function isShinyDVs(dv1: number, dv2: number): boolean {
  if (dv1 === 0xea && dv2 === 0xaa) {
    return true;
  }

  const attack = dv1 & 0x0f;
  const defense = (dv1 & 0xf0) >> 4;
  const speed = dv2 & 0x0f;
  const special = (dv2 & 0xf0) >> 4;

  if ((defense ^ speed ^ special) !== 0) {
    return false;
  }

  return [2, 3, 6, 7, 10, 11, 14, 15].indexOf(attack) !== -1;
}
