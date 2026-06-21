/** Crystal WRAM party layout (pret / Data Crystal). */
export var PARTY_COUNT_ADDRESS = "DCD7";
export var PARTY_SPECIES_LIST_BASE = 0xdcd8;
export var PARTY_MON1_BASE = 0xdcdf;
export var PARTY_MON_STRUCT_LENGTH = 0x30;
export var PARTY_LENGTH = 6;
export var PARTY_NICKNAME_BASE = 0xde41;
export var PARTY_NICKNAME_LENGTH = 11;
export var PARTY_NICKNAME_STRIDE = 0x0b;
export var SHINY_DV_VALUES = ["EA", "AA"];
/** Generic non-shiny DVs used when clearing a forced shiny override. */
export var NON_SHINY_DV_VALUES = ["37", "29"];
function toAddress(value) {
    return value.toString(16).toUpperCase().padStart(4, "0");
}
/** Build RAM addresses for one party slot (1-6). */
export function getPartySlotMap(slot) {
    if (slot < 1 || slot > PARTY_LENGTH) {
        throw new Error("Invalid slot " + slot);
    }
    var base = PARTY_MON1_BASE + (slot - 1) * PARTY_MON_STRUCT_LENGTH;
    return {
        slot: slot,
        speciesStruct: toAddress(base),
        speciesList: toAddress(PARTY_SPECIES_LIST_BASE + slot - 1),
        nickname: toAddress(PARTY_NICKNAME_BASE + (slot - 1) * PARTY_NICKNAME_STRIDE),
        shiny: [toAddress(base + 0x15), toAddress(base + 0x16)],
        moves: [
            toAddress(base + 0x2),
            toAddress(base + 0x3),
            toAddress(base + 0x4),
            toAddress(base + 0x5)
        ]
    };
}
export var PARTY_SLOT_MAPS = Array.from({ length: PARTY_LENGTH }, function (_, index) { return getPartySlotMap(index + 1); });
/**
 * GameShark codes like 91xxe1dc store the address as swapped bytes (e1dc -> DCE1).
 */
export function decodeGamesharkAddress(codeSuffix) {
    var cleaned = codeSuffix.trim().replace(/^0x/i, "").toUpperCase();
    if (!/^[0-9A-F]{4}$/.test(cleaned)) {
        throw new Error("Invalid GameShark address: " + codeSuffix);
    }
    var byte1 = parseInt(cleaned.slice(0, 2), 16);
    var byte2 = parseInt(cleaned.slice(2, 4), 16);
    return (byte2 << 8) | byte1;
}
export function byteToHex(value) {
    return (value & 0xff).toString(16).toUpperCase().padStart(2, "0");
}
export function isShinyDVs(dv1, dv2) {
    if (dv1 === 0xea && dv2 === 0xaa) {
        return true;
    }
    var attack = dv1 & 0x0f;
    var defense = (dv1 & 0xf0) >> 4;
    var speed = dv2 & 0x0f;
    var special = (dv2 & 0xf0) >> 4;
    if ((defense ^ speed ^ special) !== 0) {
        return false;
    }
    return [2, 3, 6, 7, 10, 11, 14, 15].indexOf(attack) !== -1;
}
