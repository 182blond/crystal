/** Base stats fetched from PokeAPI (national dex id). */
export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack: number;
  specialDefense: number;
}

const cache = new Map<number, BaseStats>();
const pending = new Map<number, Promise<BaseStats | null>>();

function parseBaseStats(payload: any): BaseStats | null {
  if (!payload || !Array.isArray(payload.stats)) {
    return null;
  }

  const byName: Record<string, number> = {};
  for (const entry of payload.stats) {
    if (entry.stat && entry.stat.name) {
      byName[entry.stat.name] = entry.base_stat;
    }
  }

  if (
    byName.hp === undefined ||
    byName.attack === undefined ||
    byName.defense === undefined ||
    byName.speed === undefined ||
    byName["special-attack"] === undefined ||
    byName["special-defense"] === undefined
  ) {
    return null;
  }

  return {
    hp: byName.hp,
    attack: byName.attack,
    defense: byName.defense,
    speed: byName.speed,
    specialAttack: byName["special-attack"],
    specialDefense: byName["special-defense"]
  };
}

async function fetchBaseStatsFromApi(dexId: number): Promise<BaseStats | null> {
  try {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + dexId);
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return parseBaseStats(payload);
  } catch (error) {
    return null;
  }
}

export function getCachedBaseStats(dexId: number): BaseStats | null {
  return cache.get(dexId) || null;
}

export async function getBaseStats(dexId: number): Promise<BaseStats | null> {
  if (dexId < 1 || dexId > 251) {
    return null;
  }

  const cached = cache.get(dexId);
  if (cached) {
    return cached;
  }

  const inFlight = pending.get(dexId);
  if (inFlight) {
    return inFlight;
  }

  const request = fetchBaseStatsFromApi(dexId).then(function(result) {
    pending.delete(dexId);
    if (result) {
      cache.set(dexId, result);
    }
    return result;
  });

  pending.set(dexId, request);
  return request;
}

export function speciesIdToNationalDex(speciesIdHex: string): number | null {
  if (!speciesIdHex || speciesIdHex === "00") {
    return null;
  }

  const dexId = parseInt(speciesIdHex, 16);
  if (isNaN(dexId) || dexId < 1 || dexId > 251) {
    return null;
  }

  return dexId;
}
