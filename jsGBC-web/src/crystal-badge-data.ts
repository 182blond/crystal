/** Crystal WRAM badge bitfields (Data Crystal / pret). */
export const JOHTO_BADGES_ADDRESS = "D857";
export const KANTO_BADGES_ADDRESS = "D858";

export interface BadgeDefinition {
  id: string;
  name: string;
  bit: number;
  imageUrl: string;
}

function badgeImage(id: string): string {
  return "./assets/badges/" + id + ".png";
}

export const JOHTO_BADGES: BadgeDefinition[] = [
  { id: "zephyr", name: "Zephyr", bit: 0, imageUrl: badgeImage("zephyr") },
  { id: "hive", name: "Hive", bit: 1, imageUrl: badgeImage("hive") },
  { id: "plain", name: "Plain", bit: 2, imageUrl: badgeImage("plain") },
  { id: "fog", name: "Fog", bit: 3, imageUrl: badgeImage("fog") },
  { id: "mineral", name: "Mineral", bit: 4, imageUrl: badgeImage("mineral") },
  { id: "storm", name: "Storm", bit: 5, imageUrl: badgeImage("storm") },
  { id: "glacier", name: "Glacier", bit: 6, imageUrl: badgeImage("glacier") },
  { id: "rising", name: "Rising", bit: 7, imageUrl: badgeImage("rising") }
];

export const KANTO_BADGES: BadgeDefinition[] = [
  { id: "boulder", name: "Boulder", bit: 0, imageUrl: badgeImage("boulder") },
  { id: "cascade", name: "Cascade", bit: 1, imageUrl: badgeImage("cascade") },
  { id: "thunder", name: "Thunder", bit: 2, imageUrl: badgeImage("thunder") },
  { id: "rainbow", name: "Rainbow", bit: 3, imageUrl: badgeImage("rainbow") },
  { id: "soul", name: "Soul", bit: 4, imageUrl: badgeImage("soul") },
  { id: "marsh", name: "Marsh", bit: 5, imageUrl: badgeImage("marsh") },
  { id: "volcano", name: "Volcano", bit: 6, imageUrl: badgeImage("volcano") },
  { id: "earth", name: "Earth", bit: 7, imageUrl: badgeImage("earth") }
];
