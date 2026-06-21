import { PARTY_NICKNAME_LENGTH, PARTY_NICKNAME_STRIDE, PARTY_NICKNAME_BASE } from "./crystal-party-data";
import { encodeDefaultSpeciesNickname, nicknameBytesEqual } from "./crystal-text";
function readNicknameBytes(gameboy, slot) {
    var base = PARTY_NICKNAME_BASE + (slot - 1) * PARTY_NICKNAME_STRIDE;
    var bytes = [];
    for (var index = 0; index < PARTY_NICKNAME_LENGTH; index++) {
        bytes.push(gameboy.readByte(base + index));
    }
    return bytes;
}
function getSpeciesName(speciesId, speciesById) {
    var entry = speciesById.get(speciesId.toUpperCase());
    return entry ? entry.name : null;
}
/**
 * If the current nickname still matches the old species default, return bytes
 * for the new species default name.
 */
export function resolveNicknameOverride(gameboy, slot, oldSpeciesId, newSpeciesId, speciesById) {
    if (oldSpeciesId === newSpeciesId || oldSpeciesId === "00" || newSpeciesId === "00") {
        return { bytes: null, updated: false };
    }
    var oldName = getSpeciesName(oldSpeciesId, speciesById);
    var newName = getSpeciesName(newSpeciesId, speciesById);
    if (!oldName || !newName) {
        return { bytes: null, updated: false };
    }
    var currentNickname = readNicknameBytes(gameboy, slot);
    var oldDefault = encodeDefaultSpeciesNickname(oldSpeciesId, oldName);
    if (!nicknameBytesEqual(currentNickname, oldDefault)) {
        return { bytes: null, updated: false };
    }
    return {
        bytes: encodeDefaultSpeciesNickname(newSpeciesId, newName),
        updated: true,
        newRomName: newName.toUpperCase()
    };
}
