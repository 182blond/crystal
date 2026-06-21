import GameBoy from "./GameBoy";

/** A persistent memory cheat that is re-applied while enabled. */
export interface CheatEntry {
  id: number;
  name: string;
  address: number;
  value: number;
  enabled: boolean;
}

/**
 * Simple GameShark-style cheat manager.
 * Reads/writes go through the emulator memory bus (readMemory/writeMemory),
 * so bank mapping and I/O handlers stay correct.
 */
export interface MemoryPatch {
  address: number;
  value: number;
}

export default class CheatManager {
  private cheats: CheatEntry[] = [];
  private memoryPatches: MemoryPatch[] = [];
  private nextId = 1;

  constructor(private gameboy: GameBoy) {}

  /** Parse a hex string (e.g. "D84E", "0xFF") or pass through a number. */
  static parseHex(input: string | number): number {
    if (typeof input === "number") {
      return input;
    }

    const cleaned = String(input).trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
      throw new Error("invalid_hex: " + input);
    }

    return parseInt(cleaned, 16);
  }

  readByte(address: string | number): number {
    const parsedAddress = CheatManager.parseHex(address) & 0xffff;
    return this.gameboy.readMemory(parsedAddress);
  }

  writeByte(address: string | number, value: string | number): void {
    const parsedAddress = CheatManager.parseHex(address) & 0xffff;
    const parsedValue = CheatManager.parseHex(value) & 0xff;
    this.gameboy.writeMemory(parsedAddress, parsedValue);
  }

  addCheat(name: string, address: string | number, value: string | number): number {
    const id = this.nextId++;
    this.cheats.push({
      id,
      name: name || "Cheat " + id,
      address: CheatManager.parseHex(address) & 0xffff,
      value: CheatManager.parseHex(value) & 0xff,
      enabled: true
    });
    return id;
  }

  removeCheat(id: number): boolean {
    const index = this.cheats.findIndex(cheat => cheat.id === id);
    if (index === -1) {
      return false;
    }
    this.cheats.splice(index, 1);
    return true;
  }

  enableCheat(id: number): boolean {
    const cheat = this.cheats.find(entry => entry.id === id);
    if (!cheat) {
      return false;
    }
    cheat.enabled = true;
    return true;
  }

  disableCheat(id: number): boolean {
    const cheat = this.cheats.find(entry => entry.id === id);
    if (!cheat) {
      return false;
    }
    cheat.enabled = false;
    return true;
  }

  /** Replace silent per-frame memory patches (not listed as named cheats). */
  setMemoryPatches(
    patches: Array<{ address: string | number; value: string | number }>
  ): void {
    this.memoryPatches = patches.map(patch => ({
      address: CheatManager.parseHex(patch.address) & 0xffff,
      value: CheatManager.parseHex(patch.value) & 0xff
    }));
  }

  clearMemoryPatches(): void {
    this.memoryPatches = [];
  }

  /** Re-write all enabled cheats and memory patches into emulated memory. */
  applyCheats(): void {
    for (const cheat of this.cheats) {
      if (cheat.enabled) {
        this.gameboy.writeMemory(cheat.address, cheat.value);
      }
    }

    for (const patch of this.memoryPatches) {
      this.gameboy.writeMemory(patch.address, patch.value);
    }
  }

  getCheats(): CheatEntry[] {
    return this.cheats.map(cheat => ({ ...cheat }));
  }
}
