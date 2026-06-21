import { GameBoyInstance } from "./jsgbc-globals";
import {
  PARTY_LENGTH,
  PARTY_SPECIES_LIST_BASE,
  getPartySlotMap
} from "./crystal-party-data";

/** Highest valid Crystal internal species id (inclusive). */
export const MAX_PARTY_SPECIES_ID = 251;

export function isValidPartySpeciesByte(value: number): boolean {
  const species = value & 0xff;
  return species >= 1 && species <= MAX_PARTY_SPECIES_ID;
}

/**
 * Party WRAM should stay self-consistent outside of brief glitches.
 * During battle menus the struct/list bytes can temporarily disagree.
 */
export function isPartyRamConsistent(
  gameboy: GameBoyInstance,
  partyCount: number
): boolean {
  if (partyCount < 0 || partyCount > PARTY_LENGTH) {
    return false;
  }

  for (let slot = 1; slot <= partyCount; slot++) {
    const map = getPartySlotMap(slot);
    const inStruct = gameboy.readByte(map.speciesStruct) & 0xff;
    const inList = gameboy.readByte(map.speciesList) & 0xff;

    if (!isValidPartySpeciesByte(inStruct) || inStruct !== inList) {
      return false;
    }
  }

  for (let slot = partyCount + 1; slot <= PARTY_LENGTH; slot++) {
    const listSpecies = gameboy.readByte(getPartySlotMap(slot).speciesList) & 0xff;
    if (listSpecies !== 0 && listSpecies !== 0xff) {
      return false;
    }
  }

  if (partyCount < PARTY_LENGTH) {
    const terminatorAddress = (PARTY_SPECIES_LIST_BASE + partyCount)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
    const terminator = gameboy.readByte(terminatorAddress) & 0xff;
    if (terminator !== 0xff) {
      return false;
    }
  }

  return true;
}
