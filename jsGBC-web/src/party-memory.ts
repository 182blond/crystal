import {
  PARTY_COUNT_ADDRESS,
  PARTY_LENGTH,
  PartySlotSnapshot,
  byteToHex,
  getPartySlotMap,
  isShinyDVs,
  DEFAULT_NEW_MON_LEVEL
} from "./crystal-party-data";
import { GameBoyInstance } from "./jsgbc-globals";
import {
  isPartyRamConsistent,
  isValidPartySpeciesByte
} from "./crystal-game-state";

export interface PartySnapshot {
  partyCount: number;
  slots: PartySlotSnapshot[];
}

/** Max valid level in Crystal (and sane RAM guard during battle/menu glitches). */
export const MAX_PARTY_LEVEL = 100;

export interface PartySlotStabilityContext {
  partyCount: number;
  previousPartyCount: number | null;
}

export function isStableSlotSnapshot(
  snapshot: PartySlotSnapshot,
  previous?: PartySlotSnapshot,
  context?: PartySlotStabilityContext
): boolean {
  if (snapshot.occupied) {
    if (snapshot.speciesId === "00") {
      return false;
    }
    if (!isValidPartySpeciesByte(parseInt(snapshot.speciesId, 16))) {
      return false;
    }
    if (snapshot.level < 1 || snapshot.level > MAX_PARTY_LEVEL) {
      return false;
    }
  }

  if (
    previous &&
    previous.occupied &&
    snapshot.occupied &&
    previous.speciesId !== snapshot.speciesId
  ) {
    return false;
  }

  if (previous && previous.occupied && !snapshot.occupied) {
    if (context) {
      if (
        context.previousPartyCount !== null &&
        context.partyCount < context.previousPartyCount
      ) {
        return true;
      }
      if (snapshot.slot > context.partyCount) {
        return true;
      }
    }
    return false;
  }

  return true;
}

export function isStablePartySnapshot(
  snapshot: PartySnapshot,
  previousPartyCount: number | null,
  gameboy?: GameBoyInstance,
  force = false
): boolean {
  if (
    previousPartyCount !== null &&
    previousPartyCount > 0 &&
    snapshot.partyCount === 0
  ) {
    return false;
  }

  if (!force && gameboy && !isPartyRamConsistent(gameboy, snapshot.partyCount)) {
    return false;
  }

  return true;
}

function readByte(gameboy: GameBoyInstance, address: string): number {
  return gameboy.readByte(address);
}

export function readPartySnapshot(gameboy: GameBoyInstance): PartySnapshot {
  const partyCount = Math.min(readByte(gameboy, PARTY_COUNT_ADDRESS), PARTY_LENGTH);
  const slots: PartySlotSnapshot[] = [];

  for (let slot = 1; slot <= PARTY_LENGTH; slot++) {
    const map = getPartySlotMap(slot);
    const species = readByte(gameboy, map.speciesStruct);
    const occupied = slot <= partyCount && species !== 0;

    const moves: string[] = [];
    for (const moveAddress of map.moves) {
      moves.push(byteToHex(readByte(gameboy, moveAddress)));
    }

    const dv1 = readByte(gameboy, map.shiny[0]);
    const dv2 = readByte(gameboy, map.shiny[1]);

    slots.push({
      slot,
      occupied,
      speciesId: occupied ? byteToHex(species) : "00",
      shiny: occupied ? isShinyDVs(dv1, dv2) : false,
      level: occupied ? readByte(gameboy, map.level) : 0,
      moves: moves as [string, string, string, string]
    });
  }

  return { partyCount, slots };
}

export function isSlotVacant(gameboy: GameBoyInstance, slot: number): boolean {
  const map = getPartySlotMap(slot);
  const species = readByte(gameboy, map.speciesStruct);
  if (species === 0) {
    return true;
  }

  const partyCount = Math.min(readByte(gameboy, PARTY_COUNT_ADDRESS), PARTY_LENGTH);
  return slot > partyCount;
}

export function allMovesEmpty(moves: [string, string, string, string]): boolean {
  for (let index = 0; index < moves.length; index++) {
    if (moves[index] && moves[index] !== "00") {
      return false;
    }
  }
  return true;
}

export function readEffectiveLevel(gameboy: GameBoyInstance, slot: number): number {
  if (isSlotVacant(gameboy, slot)) {
    return DEFAULT_NEW_MON_LEVEL;
  }

  const map = getPartySlotMap(slot);
  const level = readByte(gameboy, map.level);
  return clampPartyLevel(level);
}

export function clampPartyLevel(level: number): number {
  if (isNaN(level)) {
    return DEFAULT_NEW_MON_LEVEL;
  }

  return Math.max(1, Math.min(MAX_PARTY_LEVEL, Math.floor(level)));
}

export function readSlotLevelInput(root: HTMLElement, slot: number): number {
  const levelInput = root.querySelector(
    ".party-level[data-slot='" + slot + "']"
  ) as HTMLInputElement;

  if (!levelInput) {
    return DEFAULT_NEW_MON_LEVEL;
  }

  return clampPartyLevel(parseInt(levelInput.value, 10));
}
