import { GamesharkEntry } from "./crystal-party-data";

/** Parse species list from gameshark.txt (section under "Atrapar cualquier Pokemon"). */
export function parseSpeciesList(text: string): GamesharkEntry[] {
  const start = text.indexOf("Atrapar cualquier Pokemon");
  const end = text.indexOf("1er Pokémon tiene energía Infinita");
  if (start === -1 || end === -1) {
    return [];
  }

  const section = text.slice(start, end);
  const regex = /^([0-9a-fA-F]{2})\s*-\s*(.+?)\s*$/gm;
  const entries: GamesharkEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(section)) !== null) {
    entries.push({
      id: match[1].toUpperCase(),
      name: match[2].trim()
    });
  }

  return entries;
}

/** Parse move IDs/names from the long "01 Pound ..." line in gameshark.txt. */
export function parseMoveList(text: string): GamesharkEntry[] {
  const line = text
    .split(/\r?\n/)
    .find(entry => entry.includes("01 Pound") && entry.includes("Karate Chop"));

  if (!line) {
    return [];
  }

  const regex = /([0-9a-fA-F]{2})\s+([A-Za-z][A-Za-z0-9' \-\.]*?)(?=\s+[0-9a-fA-F]{2}\s|$)/g;
  const entries: GamesharkEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    entries.push({
      id: match[1].toUpperCase(),
      name: match[2].trim()
    });
  }

  return entries;
}

export async function loadGamesharkCatalog(): Promise<{
  species: GamesharkEntry[];
  moves: GamesharkEntry[];
}> {
  const response = await fetch("gameshark.txt");
  if (!response.ok) {
    throw new Error("Could not load gameshark.txt");
  }

  const text = await response.text();
  return {
    species: parseSpeciesList(text),
    moves: parseMoveList(text)
  };
}
