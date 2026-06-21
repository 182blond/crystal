import {
  JOHTO_BADGES,
  JOHTO_BADGES_ADDRESS,
  KANTO_BADGES,
  KANTO_BADGES_ADDRESS,
  BadgeDefinition
} from "./crystal-badge-data";
import { PARTY_COUNT_ADDRESS, PLAYER_NAME_ADDRESS } from "./crystal-party-data";
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

const LOSS_READS_REQUIRED = 3;

function countBits(value: number): number {
  let count = 0;
  let byte = value & 0xff;

  while (byte) {
    count += byte & 1;
    byte >>= 1;
  }

  return count;
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

export function mapBadgesFromByte(
  definitions: BadgeDefinition[],
  badgeByte: number
): BadgeState[] {
  return mapBadges(definitions, badgeByte);
}

export function createBadgeRegionSyncState(): BadgeRegionSyncState {
  return {
    byte: null,
    pendingByte: null,
    pendingCount: 0
  };
}

/** Ignore an all-zero badge read before the save has actually loaded into WRAM. */
export function hasSaveActivity(gameboy: GameBoyInstance): boolean {
  const partyCount = gameboy.readByte(PARTY_COUNT_ADDRESS) & 0xff;
  if (partyCount > 0 && partyCount <= 6) {
    return true;
  }

  const nameByte = gameboy.readByte(PLAYER_NAME_ADDRESS) & 0xff;
  return nameByte !== 0 && nameByte !== 0xff;
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
 * Accept badge-byte updates. Gains apply immediately; losses need repeated reads.
 */
export function acceptRegionByte(
  incomingByte: number,
  state: BadgeRegionSyncState,
  gameboy: GameBoyInstance,
  force = false
): boolean {
  const incoming = incomingByte & 0xff;

  if (force) {
    state.pendingByte = null;
    state.pendingCount = 0;
    return true;
  }

  if (state.byte === null) {
    if (incoming === 0 && hasSaveActivity(gameboy)) {
      return false;
    }
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

  if (countBits(incoming) >= countBits(previous) && (incoming & previous) === previous) {
    state.pendingByte = null;
    state.pendingCount = 0;
    return true;
  }

  if (state.pendingByte === incoming) {
    state.pendingCount++;
  } else {
    state.pendingByte = incoming;
    state.pendingCount = 1;
  }

  if (state.pendingCount >= LOSS_READS_REQUIRED) {
    state.pendingByte = null;
    state.pendingCount = 0;
    return true;
  }

  return false;
}

export function countEarnedBadges(byte: number): number {
  return countBits(byte);
}
