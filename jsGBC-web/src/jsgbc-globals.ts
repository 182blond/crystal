/**
 * jsgbc-core is loaded via <script> (UMD). Webpack externals only expose
 * the default export to the bundle, so util and other named exports must
 * be read from the global namespace directly.
 */
export interface JsgbcNamespace {
  default: new (options?: { lcd?: { canvas?: HTMLCanvasElement } }) => GameBoyInstance;
  util: {
    readFirstMatchingExtension(
      blob: Blob,
      filename: string,
      extensions: string[]
    ): Promise<ArrayBuffer>;
    readBlob(file: Blob): Promise<ArrayBuffer>;
    saveAs(
      file: Blob | ArrayBuffer | Uint8Array,
      filename?: string
    ): void;
  };
}

export interface GameBoyInstance {
  replaceCartridge(rom: ArrayBuffer): void;
  getBatteryFileArrayBuffer(): ArrayBuffer;
  loadBatteryFileArrayBuffer(data: ArrayBuffer): Promise<void>;
  cartridge: { name: string } | null;
  readByte(address: string | number): number;
  writeByte(address: string | number, value: string | number): void;
  addCheat(name: string, address: string | number, value: string | number): number;
  removeCheat(id: number): boolean;
  enableCheat(id: number): boolean;
  disableCheat(id: number): boolean;
  applyCheats(): void;
  setMemoryPatches(
    patches: Array<{ address: string | number; value: string | number }>
  ): void;
  clearMemoryPatches(): void;
  setSpeed(speed: number): void;
  getCheats(): Array<{
    id: number;
    name: string;
    address: number;
    value: number;
    enabled: boolean;
  }>;
}

export function getJsgbc(): JsgbcNamespace {
  const namespace = (window as any)["jsgbc-core"];
  if (!namespace) {
    throw new Error("jsgbc-core.js must be loaded before jsgbc-web.js");
  }
  return namespace;
}

export function getGameBoyClass(): JsgbcNamespace["default"] {
  return getJsgbc().default;
}

export function getUtil(): JsgbcNamespace["util"] {
  return getJsgbc().util;
}
