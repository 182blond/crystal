import { GameBoyInstance } from "./jsgbc-globals";
import {
  PARTY_SLOT_MAPS,
  PartySlotConfig,
  GamesharkEntry,
  byteToHex,
  NON_SHINY_DV_VALUES,
  SHINY_DV_VALUES
} from "./crystal-party-data";
import {
  allMovesEmpty,
  clampPartyLevel,
  isSlotVacant
} from "./party-memory";
import { buildMovePpPatches } from "./party-move-pp";
import {
  buildLevelExpPatches,
  calcExpAtLevel,
  getGrowthRate
} from "./party-exp";
import {
  buildNewMonBootstrapPatches,
  buildOtNamePatches,
  MemoryPatchInput,
  withDvPatch
} from "./party-patches";
import { encodeNewMonNickname, resolveNicknameOverride } from "./party-nickname";
import { buildSpeciesChangeStatPatches } from "./party-stats";
import { entriesToMoveset, getSuggestedMovesetEntries } from "./pokeapi-moveset";
import { getBaseStats, speciesIdToNationalDex } from "./pokeapi-stats";

export interface PreparedSlotApply {
  config: PartySlotConfig;
  nicknameBytes: number[] | null;
  statPatches: MemoryPatchInput[];
  extraPatches: MemoryPatchInput[];
  isNewMon: boolean;
  autoFilledMoves: boolean;
}

export async function prepareSlotApply(
  gameboy: GameBoyInstance,
  config: PartySlotConfig,
  speciesById: Map<string, GamesharkEntry>,
  moveLookup: Map<string, string>,
  hadShinyOverride: boolean
): Promise<PreparedSlotApply | { error: string }> {
  const map = PARTY_SLOT_MAPS[config.slot - 1];
  const oldSpeciesId = byteToHex(gameboy.readByte(map.speciesStruct));
  const isNewMon = isSlotVacant(gameboy, config.slot) || oldSpeciesId === "00";
  const speciesChanged =
    config.speciesId !== "00" && oldSpeciesId !== config.speciesId;
  const effectiveLevel = clampPartyLevel(config.level);

  let workingConfig = config;
  let autoFilledMoves = false;

  if (isNewMon && allMovesEmpty(config.moves)) {
    const dexId = speciesIdToNationalDex(config.speciesId);
    if (dexId) {
      const entries = await getSuggestedMovesetEntries(
        dexId,
        effectiveLevel,
        moveLookup
      );
      if (entries && entries.length > 0) {
        workingConfig = {
          slot: config.slot,
          speciesId: config.speciesId,
          shiny: config.shiny,
          level: effectiveLevel,
          moves: entriesToMoveset(entries)
        };
        autoFilledMoves = true;
      }
    }
  }

  const nicknameUpdate = resolveNicknameOverride(
    gameboy,
    config.slot,
    oldSpeciesId,
    workingConfig.speciesId,
    speciesById
  );

  let nicknameBytes = nicknameUpdate.bytes;
  if (isNewMon) {
    nicknameBytes = encodeNewMonNickname(workingConfig.speciesId, speciesById);
  }

  let patchedConfig = withDvPatch(gameboy, workingConfig, hadShinyOverride);
  if (isNewMon && !patchedConfig.dvPatch) {
    patchedConfig = {
      slot: patchedConfig.slot,
      speciesId: patchedConfig.speciesId,
      shiny: patchedConfig.shiny,
      level: patchedConfig.level,
      moves: patchedConfig.moves,
      dvPatch: patchedConfig.shiny ? SHINY_DV_VALUES : NON_SHINY_DV_VALUES
    };
  }

  const dexId = speciesIdToNationalDex(patchedConfig.speciesId);
  if (!dexId) {
    return { error: "Invalid species id for stat recalculation." };
  }

  const baseStats = await getBaseStats(dexId);
  if (!baseStats) {
    return {
      error: "Could not load base stats from PokeAPI for " + patchedConfig.speciesId + "."
    };
  }

  const statPatches = buildSpeciesChangeStatPatches(
    gameboy,
    config.slot,
    baseStats,
    patchedConfig.dvPatch,
    speciesChanged || isNewMon,
    effectiveLevel
  );

  const extraPatches: MemoryPatchInput[] = [];
  const growthRate = await getGrowthRate(dexId);
  const exp = calcExpAtLevel(effectiveLevel, growthRate);
  extraPatches.push.apply(
    extraPatches,
    buildLevelExpPatches(config.slot, effectiveLevel, exp)
  );

  if (isNewMon) {
    extraPatches.push.apply(
      extraPatches,
      buildNewMonBootstrapPatches(gameboy, config.slot)
    );
    extraPatches.push.apply(extraPatches, buildOtNamePatches(gameboy, config.slot));
  }

  extraPatches.push.apply(
    extraPatches,
    await buildMovePpPatches(config.slot, patchedConfig.moves)
  );

  return {
    config: patchedConfig,
    nicknameBytes: nicknameBytes,
    statPatches: statPatches,
    extraPatches: extraPatches,
    isNewMon: isNewMon,
    autoFilledMoves: autoFilledMoves
  };
}
