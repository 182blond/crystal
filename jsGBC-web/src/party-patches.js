import { PARTY_NICKNAME_BASE, PARTY_NICKNAME_LENGTH, PARTY_NICKNAME_STRIDE, PARTY_SLOT_MAPS, NON_SHINY_DV_VALUES, SHINY_DV_VALUES, byteToHex, isShinyDVs } from "./crystal-party-data";
function toAddress(value) {
    return value.toString(16).toUpperCase().padStart(4, "0");
}
/** Decide which DV bytes to force for this apply (shiny on, or clear shiny). */
export function resolveDvPatch(gameboy, config, hadShinyOverride) {
    var map = PARTY_SLOT_MAPS[config.slot - 1];
    if (!map) {
        return undefined;
    }
    if (config.shiny) {
        return SHINY_DV_VALUES;
    }
    var dv1 = gameboy.readByte(map.shiny[0]);
    var dv2 = gameboy.readByte(map.shiny[1]);
    if (hadShinyOverride || isShinyDVs(dv1, dv2)) {
        return NON_SHINY_DV_VALUES;
    }
    return undefined;
}
export function withDvPatch(gameboy, config, hadShinyOverride) {
    var dvPatch = resolveDvPatch(gameboy, config, hadShinyOverride);
    if (!dvPatch) {
        return config;
    }
    return {
        slot: config.slot,
        speciesId: config.speciesId,
        shiny: config.shiny,
        moves: config.moves,
        dvPatch: dvPatch
    };
}
export function buildSlotPatches(config) {
    var map = PARTY_SLOT_MAPS[config.slot - 1];
    if (!map) {
        throw new Error("Invalid slot " + config.slot);
    }
    var patches = [
        { address: map.speciesStruct, value: config.speciesId },
        { address: map.speciesList, value: config.speciesId }
    ];
    if (config.dvPatch) {
        patches.push({ address: map.shiny[0], value: config.dvPatch[0] }, { address: map.shiny[1], value: config.dvPatch[1] });
    }
    config.moves.forEach(function (moveId, index) {
        patches.push({
            address: map.moves[index],
            value: moveId || "00"
        });
    });
    return patches;
}
export function buildNicknamePatches(slot, bytes) {
    var base = PARTY_NICKNAME_BASE + (slot - 1) * PARTY_NICKNAME_STRIDE;
    return bytes.slice(0, PARTY_NICKNAME_LENGTH).map(function (value, index) {
        return {
            address: toAddress(base + index),
            value: byteToHex(value)
        };
    });
}
export function mergePartyPatches(slotConfigs, nicknameBytesBySlot) {
    var patches = [];
    for (var _i = 0, slotConfigs_1 = slotConfigs; _i < slotConfigs_1.length; _i++) {
        var config = slotConfigs_1[_i];
        patches.push.apply(patches, buildSlotPatches(config));
        var nicknameBytes = nicknameBytesBySlot.get(config.slot);
        if (nicknameBytes) {
            patches.push.apply(patches, buildNicknamePatches(config.slot, nicknameBytes));
        }
    }
    return patches;
}
