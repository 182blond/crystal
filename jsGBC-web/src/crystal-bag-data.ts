import { byteToHex } from "./crystal-party-data";
import { GameBoyInstance } from "./jsgbc-globals";

export const ITEMS_POCKET_COUNT = "D892";
export const ITEMS_POCKET_LIST = "D893";
export const BALLS_POCKET_COUNT = "D8D7";
export const BALLS_POCKET_LIST = "D8D8";

export const MAX_ITEM_STACK = 99;
export const MAX_ITEMS_POCKET = 20;
export const MAX_BALLS_POCKET = 12;

export const MASTER_BALL_ID = 0x01;
export const RARE_CANDY_ID = 0x20;

export interface BagItemGrant {
  id: string;
  name: string;
  itemId: number;
  pocket: "items" | "balls";
}

export const QUICK_BAG_GRANTS: BagItemGrant[] = [
  {
    id: "master-ball",
    name: "Master Ball",
    itemId: MASTER_BALL_ID,
    pocket: "balls"
  },
  {
    id: "rare-candy",
    name: "Rare Candy",
    itemId: RARE_CANDY_ID,
    pocket: "items"
  }
];

function pocketAddresses(pocket: "items" | "balls") {
  if (pocket === "balls") {
    return {
      countAddress: BALLS_POCKET_COUNT,
      listAddress: BALLS_POCKET_LIST,
      maxSlots: MAX_BALLS_POCKET
    };
  }

  return {
    countAddress: ITEMS_POCKET_COUNT,
    listAddress: ITEMS_POCKET_LIST,
    maxSlots: MAX_ITEMS_POCKET
  };
}

function toAddress(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

function readPocketCount(gameboy: GameBoyInstance, countAddress: string): number {
  return gameboy.readByte(countAddress) & 0xff;
}

export function addItemToPocket(
  gameboy: GameBoyInstance,
  pocket: "items" | "balls",
  itemId: number,
  quantity: number
): { ok: true; total: number } | { ok: false; error: string } {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: "Cantidad inválida." };
  }

  const { countAddress, listAddress, maxSlots } = pocketAddresses(pocket);
  const count = readPocketCount(gameboy, countAddress);

  for (let index = 0; index < count; index++) {
    const idAddress = toAddress(parseInt(listAddress, 16) + index * 2);
    const currentId = gameboy.readByte(idAddress) & 0xff;

    if (currentId === 0xff) {
      break;
    }

    if (currentId === itemId) {
      const qtyAddress = toAddress(parseInt(listAddress, 16) + index * 2 + 1);
      const currentQty = gameboy.readByte(qtyAddress) & 0xff;
      const total = Math.min(MAX_ITEM_STACK, currentQty + quantity);
      gameboy.writeByte(qtyAddress, byteToHex(total));
      return { ok: true, total };
    }
  }

  if (count >= maxSlots) {
    return { ok: false, error: "Ese bolsillo está lleno." };
  }

  const idAddress = toAddress(parseInt(listAddress, 16) + count * 2);
  const qtyAddress = toAddress(parseInt(listAddress, 16) + count * 2 + 1);
  const endAddress = toAddress(parseInt(listAddress, 16) + (count + 1) * 2);
  const total = Math.min(MAX_ITEM_STACK, quantity);

  gameboy.writeByte(idAddress, byteToHex(itemId));
  gameboy.writeByte(qtyAddress, byteToHex(total));
  gameboy.writeByte(endAddress, "FF");
  gameboy.writeByte(countAddress, byteToHex(count + 1));

  return { ok: true, total };
}
