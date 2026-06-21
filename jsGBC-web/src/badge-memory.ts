import {
  JOHTO_BADGES,
  JOHTO_BADGES_ADDRESS,
  KANTO_BADGES,
  KANTO_BADGES_ADDRESS,
  BadgeDefinition
} from "./crystal-badge-data";
import { GameBoyInstance } from "./jsgbc-globals";

export interface BadgeState extends BadgeDefinition {
  earned: boolean;
}

export interface BadgeSnapshot {
  johtoByte: number;
  kantoByte: number;
  johto: BadgeState[];
  kanto: BadgeState[];
  johtoCount: number;
  kantoCount: number;
  totalCount: number;
}

export interface BadgeRegionSyncState {
  byte: number | null;
  pendingByte: number | null;
  pendingCount: number;
}

const STABLE_READS_REQUIRED = 3;
const CLEAR_BADGES_READS_REQUIRED = 4;

function countBits(value: number): number {
  let count = 0;
  let byte = value & 0xff;

  while (byte) {
    count += byte & 1;
    byte >>= 1;
  }

  return count;
}

function countBitChanges(previous: number, incoming: number): number {
  return countBits((previous ^ incoming) & 0xff);
}

function mapBadges(
  definitions: BadgeDefinition[],
  badgeByte: number
): BadgeState[] {
  return definitions.map(function(definition) {
    return {
      id: definition.id,
      name: definition.name,
      bit: definition.bit,
      imageUrl: definition.imageUrl,
      earned: (badgeByte & (1 << definition.bit)) !== 0
    };
  });
}

export function createBadgeRegionSyncState(): BadgeRegionSyncState {
  return {
    byte: null,
    pendingByte: null,
    pendingCount: 0
  };
}

export function readBadgeSnapshot(gameboy: GameBoyInstance): BadgeSnapshot {
  const johtoByte = gameboy.readByte(JOHTO_BADGES_ADDRESS) & 0xff;
  const kantoByte = gameboy.readByte(KANTO_BADGES_ADDRESS) & 0xff;
  const johto = mapBadges(JOHTO_BADGES, johtoByte);
  const kanto = mapBadges(KANTO_BADGES, kantoByte);
  const johtoCount = countBits(johtoByte);
  const kantoCount = countBits(kantoByte);

  return {
    johtoByte: johtoByte,
    kantoByte: kantoByte,
    johto: johto,
    kanto: kanto,
    johtoCount: johtoCount,
    kantoCount: kantoCount,
    totalCount: johtoCount + kantoCount
  };
}

/**
 * Accept badge-byte updates after repeated identical reads, so battle/menu
 * glitches do not flash. Any real change (save load, new badge) can still
 * settle within a few sync ticks — do not hard-reject multi-badge jumps.
 */
export function acceptRegionByte(
  incomingByte: number,
  state: BadgeRegionSyncState,
  force = false
): boolean {
  const incoming = incomingByte & 0xff;

  if (force || state.byte === null) {
    state.pendingByte = null;
    state.pendingCount = 0;
    return true;
  }

  const previous = state.byte & 0xff;
  if (incoming === previous) {
    state.pendingByte = null;
    state.pendingCount = 0;
    return true;
  }

  let requiredReads = STABLE_READS_REQUIRED;
  if (incoming === 0 && previous !== 0) {
    requiredReads = CLEAR_BADGES_READS_REQUIRED;
  } else if (countBitChanges(previous, incoming) > 1) {
    requiredReads = STABLE_READS_REQUIRED + 1;
  }

  if (state.pendingByte === incoming) {
    state.pendingCount++;
  } else {
    state.pendingByte = incoming;
    state.pendingCount = 1;
  }

  if (state.pendingCount >= requiredReads) {
    state.pendingByte = null;
    state.pendingCount = 0;
    return true;
  }

  return false;
}

export function countEarnedBadges(byte: number): number {
  return countBits(byte);
}
