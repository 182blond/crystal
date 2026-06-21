import { GamesharkEntry } from "./crystal-party-data";

const GEN2_VERSION_GROUPS = new Set(["gold-silver", "crystal"]);

/** gameshark.txt typos / names that differ from PokeAPI slugs. */
const POKEAPI_MOVE_OVERRIDES: Record<string, string> = {
  psychic: "psychih"
};

const pokemonPayloadCache = new Map<number, any>();
const pokemonPayloadPending = new Map<number, Promise<any | null>>();

export function normalizeMoveKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-'.]/g, "");
}

export function buildMoveLookup(moves: GamesharkEntry[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const move of moves) {
    lookup.set(normalizeMoveKey(move.name), move.id.toUpperCase());
  }

  return lookup;
}

function mapPokeApiMoveToId(
  apiName: string,
  moveLookup: Map<string, string>
): string | null {
  const overrideKey = POKEAPI_MOVE_OVERRIDES[apiName];
  const normalized = normalizeMoveKey(overrideKey || apiName);
  return moveLookup.get(normalized) || null;
}

interface LearnedMove {
  apiName: string;
  level: number;
}

export interface SuggestedMoveEntry {
  id: string;
  learnLevel: number;
}

function parseLevelUpMoves(payload: any, level: number): LearnedMove[] {
  const byMove = new Map<string, number>();

  if (!payload || !Array.isArray(payload.moves)) {
    return [];
  }

  for (const entry of payload.moves) {
    const apiName = entry.move && entry.move.name;
    if (!apiName) {
      continue;
    }

    for (const detail of entry.version_group_details || []) {
      const versionGroup =
        detail.version_group && detail.version_group.name;
      if (!GEN2_VERSION_GROUPS.has(versionGroup)) {
        continue;
      }

      if (
        !detail.move_learn_method ||
        detail.move_learn_method.name !== "level-up"
      ) {
        continue;
      }

      const learnLevel = detail.level_learned_at;
      if (learnLevel > level) {
        continue;
      }

      const previous = byMove.get(apiName);
      if (previous === undefined || learnLevel > previous) {
        byMove.set(apiName, learnLevel);
      }
    }
  }

  return Array.from(byMove.entries()).map(function(entry) {
    return { apiName: entry[0], level: entry[1] };
  });
}

function selectTopMoveEntries(
  learned: LearnedMove[],
  moveLookup: Map<string, string>,
  count = 4
): SuggestedMoveEntry[] {
  const mapped: SuggestedMoveEntry[] = [];

  for (const move of learned) {
    const id = mapPokeApiMoveToId(move.apiName, moveLookup);
    if (id) {
      mapped.push({ id: id, learnLevel: move.level });
    }
  }

  mapped.sort(function(a, b) {
    if (b.learnLevel !== a.learnLevel) {
      return b.learnLevel - a.learnLevel;
    }
    return parseInt(b.id, 16) - parseInt(a.id, 16);
  });

  const picked: SuggestedMoveEntry[] = [];
  const seen = new Set<string>();

  for (const move of mapped) {
    if (seen.has(move.id)) {
      continue;
    }

    seen.add(move.id);
    picked.push(move);
    if (picked.length >= count) {
      break;
    }
  }

  return picked;
}

function selectTopMoves(
  learned: LearnedMove[],
  moveLookup: Map<string, string>,
  count = 4
): [string, string, string, string] {
  const entries = selectTopMoveEntries(learned, moveLookup, count);
  const picked = entries.map(entry => entry.id);

  while (picked.length < count) {
    picked.push("00");
  }

  return picked as [string, string, string, string];
}

async function fetchPokemonPayload(dexId: number): Promise<any | null> {
  if (dexId < 1 || dexId > 251) {
    return null;
  }

  const cached = pokemonPayloadCache.get(dexId);
  if (cached) {
    return cached;
  }

  const inFlight = pokemonPayloadPending.get(dexId);
  if (inFlight) {
    return inFlight;
  }

  const request = fetch("https://pokeapi.co/api/v2/pokemon/" + dexId)
    .then(function(response) {
      if (!response.ok) {
        return null;
      }
      return response.json();
    })
    .catch(function() {
      return null;
    })
    .then(function(payload) {
      pokemonPayloadPending.delete(dexId);
      if (payload) {
        pokemonPayloadCache.set(dexId, payload);
      }
      return payload;
    });

  pokemonPayloadPending.set(dexId, request);
  return request;
}

export async function getSuggestedMoveset(
  dexId: number,
  level: number,
  moveLookup: Map<string, string>
): Promise<[string, string, string, string] | null> {
  const entries = await getSuggestedMovesetEntries(dexId, level, moveLookup);
  if (!entries || entries.length === 0) {
    return null;
  }

  const ids = entries.map(entry => entry.id);
  while (ids.length < 4) {
    ids.push("00");
  }

  return ids.slice(0, 4) as [string, string, string, string];
}

export async function getSuggestedMovesetEntries(
  dexId: number,
  level: number,
  moveLookup: Map<string, string>
): Promise<SuggestedMoveEntry[] | null> {
  const payload = await fetchPokemonPayload(dexId);
  if (!payload) {
    return null;
  }

  const clampedLevel = Math.max(1, Math.min(100, level));
  const learned = parseLevelUpMoves(payload, clampedLevel);
  if (learned.length === 0) {
    return null;
  }

  return selectTopMoveEntries(learned, moveLookup, 4);
}

export function entriesToMoveset(
  entries: SuggestedMoveEntry[]
): [string, string, string, string] {
  const moves = entries.map(entry => entry.id);
  while (moves.length < 4) {
    moves.push("00");
  }
  return moves.slice(0, 4) as [string, string, string, string];
}
