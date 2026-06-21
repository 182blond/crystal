import {
  byteToHex,
  getPartySlotMap,
  PARTY_MON1_BASE,
  PARTY_MON_STRUCT_LENGTH
} from "./crystal-party-data";
import { BaseStats } from "./pokeapi-stats";
import { GameBoyInstance } from "./jsgbc-globals";
import { MemoryPatchInput } from "./party-patches";

const STAT_EXP_OFFSETS = [0x0b, 0x0d, 0x0f, 0x11, 0x13];
const STAT_VALUE_OFFSETS = {
  maxHp: 0x24,
  attack: 0x26,
  defense: 0x28,
  speed: 0x2a,
  specialAttack: 0x2c,
  specialDefense: 0x2e
};

export interface CalculatedStats {
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack: number;
  specialDefense: number;
}

function toAddress(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function slotBaseAddress(slot: number): number {
  return PARTY_MON1_BASE + (slot - 1) * PARTY_MON_STRUCT_LENGTH;
}

function readU16Be(gameboy: GameBoyInstance, address: number): number {
  const hi = gameboy.readByte(address);
  const lo = gameboy.readByte(address + 1);
  return ((hi & 0xff) << 8) | (lo & 0xff);
}

function readStatExp(gameboy: GameBoyInstance, base: number, offset: number): number {
  return readU16Be(gameboy, base + offset);
}

function sqrtInt(value: number): number {
  return Math.floor(Math.sqrt(Math.max(0, value)));
}

function extractDvs(dv1: number, dv2: number) {
  return {
    attack: dv1 & 0x0f,
    defense: (dv1 & 0xf0) >> 4,
    speed: dv2 & 0x0f,
    special: (dv2 & 0xf0) >> 4
  };
}

function hpDvFromDvs(dvs: ReturnType<typeof extractDvs>): number {
  return (
    (dvs.attack & 1) * 8 +
    (dvs.defense & 1) * 4 +
    (dvs.speed & 1) * 2 +
    (dvs.special & 1)
  );
}

function calcGen2Stat(
  base: number,
  dv: number,
  statExp: number,
  level: number,
  isHp: boolean
): number {
  const expTerm = Math.floor(sqrtInt(statExp) / 4);
  const inner = Math.floor(((base + dv) * 2 + expTerm + 5) * level / 100);
  return isHp ? inner + level + 10 : inner + 5;
}

export function calculateGen2Stats(
  baseStats: BaseStats,
  level: number,
  dv1: number,
  dv2: number,
  statExp: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    special: number;
  }
): CalculatedStats {
  const dvs = extractDvs(dv1, dv2);
  const maxHp = calcGen2Stat(
    baseStats.hp,
    hpDvFromDvs(dvs),
    statExp.hp,
    level,
    true
  );

  return {
    maxHp: maxHp,
    currentHp: maxHp,
    attack: calcGen2Stat(baseStats.attack, dvs.attack, statExp.attack, level, false),
    defense: calcGen2Stat(baseStats.defense, dvs.defense, statExp.defense, level, false),
    speed: calcGen2Stat(baseStats.speed, dvs.speed, statExp.speed, level, false),
    specialAttack: calcGen2Stat(
      baseStats.specialAttack,
      dvs.special,
      statExp.special,
      level,
      false
    ),
    specialDefense: calcGen2Stat(
      baseStats.specialDefense,
      dvs.special,
      statExp.special,
      level,
      false
    )
  };
}

function writeU16BePatches(address: number, value: number): MemoryPatchInput[] {
  const clamped = Math.max(0, Math.min(65535, value));
  return [
    { address: toAddress(address), value: byteToHex((clamped >> 8) & 0xff) },
    { address: toAddress(address + 1), value: byteToHex(clamped & 0xff) }
  ];
}

function writeZeroBytePatches(address: number, count: number): MemoryPatchInput[] {
  const patches: MemoryPatchInput[] = [];
  for (let index = 0; index < count; index++) {
    patches.push({ address: toAddress(address + index), value: "00" });
  }
  return patches;
}

export function buildStatPatches(
  slot: number,
  stats: CalculatedStats,
  resetStatExp: boolean
): MemoryPatchInput[] {
  const base = slotBaseAddress(slot);
  const patches: MemoryPatchInput[] = [];

  if (resetStatExp) {
    for (let index = 0; index < STAT_EXP_OFFSETS.length; index++) {
      patches.push.apply(
        patches,
        writeZeroBytePatches(base + STAT_EXP_OFFSETS[index], 2)
      );
    }
  }

  patches.push.apply(patches, writeU16BePatches(base + 0x22, stats.currentHp));
  patches.push.apply(patches, writeU16BePatches(base + STAT_VALUE_OFFSETS.maxHp, stats.maxHp));
  patches.push.apply(
    patches,
    writeU16BePatches(base + STAT_VALUE_OFFSETS.attack, stats.attack)
  );
  patches.push.apply(
    patches,
    writeU16BePatches(base + STAT_VALUE_OFFSETS.defense, stats.defense)
  );
  patches.push.apply(
    patches,
    writeU16BePatches(base + STAT_VALUE_OFFSETS.speed, stats.speed)
  );
  patches.push.apply(
    patches,
    writeU16BePatches(base + STAT_VALUE_OFFSETS.specialAttack, stats.specialAttack)
  );
  patches.push.apply(
    patches,
    writeU16BePatches(base + STAT_VALUE_OFFSETS.specialDefense, stats.specialDefense)
  );

  return patches;
}

export function buildSpeciesChangeStatPatches(
  gameboy: GameBoyInstance,
  slot: number,
  baseStats: BaseStats,
  dvPatch?: [string, string],
  resetStatExp = true,
  levelOverride?: number
): MemoryPatchInput[] {
  const map = getPartySlotMap(slot);
  const base = slotBaseAddress(slot);
  const level =
    levelOverride !== undefined
      ? Math.max(1, Math.min(100, levelOverride))
      : (() => {
          const raw = gameboy.readByte(map.level) & 0xff;
          return raw >= 1 && raw <= 100 ? raw : 1;
        })();

  let dv1: number;
  let dv2: number;
  if (dvPatch) {
    dv1 = parseInt(dvPatch[0], 16);
    dv2 = parseInt(dvPatch[1], 16);
  } else {
    dv1 = gameboy.readByte(map.shiny[0]);
    dv2 = gameboy.readByte(map.shiny[1]);
  }

  const statExp = resetStatExp
    ? { hp: 0, attack: 0, defense: 0, speed: 0, special: 0 }
    : {
        hp: readStatExp(gameboy, base, STAT_EXP_OFFSETS[0]),
        attack: readStatExp(gameboy, base, STAT_EXP_OFFSETS[1]),
        defense: readStatExp(gameboy, base, STAT_EXP_OFFSETS[2]),
        speed: readStatExp(gameboy, base, STAT_EXP_OFFSETS[3]),
        special: readStatExp(gameboy, base, STAT_EXP_OFFSETS[4])
      };

  const stats = calculateGen2Stats(baseStats, level, dv1, dv2, statExp);

  return buildStatPatches(slot, stats, resetStatExp);
}
