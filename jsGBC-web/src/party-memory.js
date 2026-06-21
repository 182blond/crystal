import { PARTY_COUNT_ADDRESS, PARTY_LENGTH, byteToHex, getPartySlotMap, isShinyDVs } from "./crystal-party-data";
function readByte(gameboy, address) {
    return gameboy.readByte(address);
}
export function readPartySnapshot(gameboy) {
    var partyCount = Math.min(readByte(gameboy, PARTY_COUNT_ADDRESS), PARTY_LENGTH);
    var slots = [];
    for (var slot = 1; slot <= PARTY_LENGTH; slot++) {
        var map = getPartySlotMap(slot);
        var species = readByte(gameboy, map.speciesStruct);
        var occupied = slot <= partyCount && species !== 0;
        var moves = [];
        for (var _i = 0, _a = map.moves; _i < _a.length; _i++) {
            var moveAddress = _a[_i];
            moves.push(byteToHex(readByte(gameboy, moveAddress)));
        }
        var dv1 = readByte(gameboy, map.shiny[0]);
        var dv2 = readByte(gameboy, map.shiny[1]);
        slots.push({
            slot: slot,
            occupied: occupied,
            speciesId: occupied ? byteToHex(species) : "00",
            shiny: occupied ? isShinyDVs(dv1, dv2) : false,
            moves: moves
        });
    }
    return { partyCount: partyCount, slots: slots };
}
