import {
  GamesharkEntry,
  PARTY_NICKNAME_LENGTH,
  PARTY_NICKNAME_STRIDE,
  PARTY_NICKNAME_BASE,
  byteToHex
} from "./crystal-party-data";
import {
  encodeDefaultSpeciesNickname,
  nicknameBytesEqual
} from "./crystal-text";
import { GameBoyInstance } from "./jsgbc-globals";
import { MemoryPatchInput } from "./party-patches";

function readNicknameBytes(gameboy: GameBoyInstance, slot: number): number[] {
  const base = PARTY_NICKNAME_BASE + (slot - 1) * PARTY_NICKNAME_STRIDE;
  const bytes: number[] = [];

  for (let index = 0; index < PARTY_NICKNAME_LENGTH; index++) {
    bytes.push(gameboy.readByte(base + index));
  }

  return bytes;
}

function getSpeciesName(
  speciesId: string,
  speciesById: Map<string, GamesharkEntry>
): string | null {
  const entry = speciesById.get(speciesId.toUpperCase());
  return entry ? entry.name : null;
}

/**
 * If the current nickname still matches the old species default, return bytes
 * for the new species default name.
 */
export function encodeNewMonNickname(
  speciesId: string,
  speciesById: Map<string, GamesharkEntry>
): number[] | null {
  const entry = speciesById.get(speciesId.toUpperCase());
  if (!entry) {
    return null;
  }

  return encodeDefaultSpeciesNickname(speciesId, entry.name);
}

export function resolveNicknameOverride(
  gameboy: GameBoyInstance,
  slot: number,
  oldSpeciesId: string,
  newSpeciesId: string,
  speciesById: Map<string, GamesharkEntry>
): { bytes: number[] | null; updated: boolean; newRomName?: string } {
  if (oldSpeciesId === newSpeciesId || oldSpeciesId === "00" || newSpeciesId === "00") {
    return { bytes: null, updated: false };
  }

  const oldName = getSpeciesName(oldSpeciesId, speciesById);
  const newName = getSpeciesName(newSpeciesId, speciesById);
  if (!oldName || !newName) {
    return { bytes: null, updated: false };
  }

  const currentNickname = readNicknameBytes(gameboy, slot);
  const oldDefault = encodeDefaultSpeciesNickname(oldSpeciesId, oldName);

  if (!nicknameBytesEqual(currentNickname, oldDefault)) {
    return { bytes: null, updated: false };
  }

  return {
    bytes: encodeDefaultSpeciesNickname(newSpeciesId, newName),
    updated: true,
    newRomName: newName.toUpperCase()
  };
}
