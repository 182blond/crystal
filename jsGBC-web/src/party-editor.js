var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { PARTY_SLOT_MAPS, byteToHex } from "./crystal-party-data";
import { loadGamesharkCatalog } from "./gameshark-parser";
import { readPartySnapshot } from "./party-memory";
import { resolveNicknameOverride } from "./party-nickname";
import { mergePartyPatches, withDvPatch } from "./party-patches";
import { updateSlotSprite } from "./pokeapi-sprites";
var SYNC_INTERVAL_MS = 400;
function hadShinyOverride(activeSlots, slot) {
    var previous = activeSlots.get(slot);
    return previous ? previous.config.shiny === true : false;
}
function pushOverrides(gameboy, activeSlots) {
    var configs = [];
    var nicknameBytesBySlot = new Map();
    activeSlots.forEach(function (override) {
        configs.push(override.config);
        if (override.nicknameBytes) {
            nicknameBytesBySlot.set(override.config.slot, override.nicknameBytes);
        }
    });
    gameboy.setMemoryPatches(mergePartyPatches(configs, nicknameBytesBySlot));
    gameboy.applyCheats();
}
function applySlot(gameboy, activeSlots, config, speciesById) {
    var map = PARTY_SLOT_MAPS[config.slot - 1];
    var oldSpeciesId = byteToHex(gameboy.readByte(map.speciesStruct));
    var nicknameUpdate = resolveNicknameOverride(gameboy, config.slot, oldSpeciesId, config.speciesId, speciesById);
    var patchedConfig = withDvPatch(gameboy, config, hadShinyOverride(activeSlots, config.slot));
    activeSlots.set(config.slot, {
        config: patchedConfig,
        nicknameBytes: nicknameUpdate.bytes
    });
    pushOverrides(gameboy, activeSlots);
    if (nicknameUpdate.updated && nicknameUpdate.newRomName) {
        return "Slot " + config.slot + " aplicado (mote → " + nicknameUpdate.newRomName + ").";
    }
    return "Slot " + config.slot + " aplicado.";
}
function setSelectValue(select, value) {
    if (select.value === value) {
        return;
    }
    var normalized = value.toUpperCase();
    var hasOption = Array.from(select.options).some(function (option) { return option.value.toUpperCase() === normalized; });
    if (hasOption) {
        select.value = normalized;
    }
}
function fillSelect(select, entries, selectedId) {
    select.innerHTML = "";
    var empty = document.createElement("option");
    empty.value = "00";
    empty.textContent = "— none —";
    select.appendChild(empty);
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        var option = document.createElement("option");
        option.value = entry.id.toUpperCase();
        option.textContent = entry.id.toUpperCase() + " — " + entry.name;
        select.appendChild(option);
    }
    setSelectValue(select, selectedId);
}
function readSlotConfig(root, slot) {
    var species = root.querySelector(".party-species[data-slot='" + slot + "']");
    var shiny = root.querySelector(".party-shiny[data-slot='" + slot + "']");
    var moves = [];
    for (var moveIndex = 1; moveIndex <= 4; moveIndex++) {
        var moveSelect = root.querySelector(".party-move[data-slot='" + slot + "'][data-move='" + moveIndex + "']");
        moves.push(moveSelect ? moveSelect.value : "00");
    }
    return {
        slot: slot,
        speciesId: species ? species.value : "00",
        shiny: shiny ? shiny.checked : false,
        moves: moves
    };
}
function updateSlotFromSnapshot(root, snapshot) {
    var card = root.querySelector(".party-slot-card[data-slot='" + snapshot.slot + "']");
    if (!card) {
        return;
    }
    card.classList.toggle("party-slot-empty", !snapshot.occupied);
    var title = card.querySelector(".party-slot-title");
    if (title) {
        title.textContent = snapshot.occupied
            ? "Slot " + snapshot.slot
            : "Slot " + snapshot.slot + " (empty)";
    }
    var species = card.querySelector(".party-species");
    var shiny = card.querySelector(".party-shiny");
    if (species) {
        setSelectValue(species, snapshot.speciesId);
    }
    if (shiny) {
        shiny.checked = snapshot.shiny;
    }
    for (var moveIndex = 1; moveIndex <= 4; moveIndex++) {
        var moveSelect = card.querySelector(".party-move[data-move='" + moveIndex + "']");
        if (moveSelect) {
            setSelectValue(moveSelect, snapshot.moves[moveIndex - 1]);
        }
    }
    try {
        updateSlotSprite(card);
    }
    catch (error) {
        // Sprite updates must not block party sync.
    }
}
function appendSlotCard(grid, map, species, moves) {
    var card = document.createElement("article");
    card.className = "party-slot-card party-slot-empty";
    card.setAttribute("data-slot", String(map.slot));
    card.innerHTML =
        '<div class="party-slot-header">' +
            '<div class="party-slot-sprite-wrap">' +
            '<img class="party-slot-sprite pixelated" alt="" style="display:none" />' +
            "</div>" +
            '<div class="party-slot-header-text">' +
            '<h4 class="party-slot-title">Slot ' +
            map.slot +
            " (empty)</h4>" +
            '<p class="party-slot-species-name"></p>' +
            "</div>" +
            "</div>" +
            '<label>Species<select class="party-species" data-slot="' +
            map.slot +
            '"></select></label>' +
            '<label class="party-shiny-label"><input type="checkbox" class="party-shiny" data-slot="' +
            map.slot +
            '" /> Shiny</label>' +
            '<div class="party-moves">' +
            '<label>Move 1<select class="party-move" data-slot="' +
            map.slot +
            '" data-move="1"></select></label>' +
            '<label>Move 2<select class="party-move" data-slot="' +
            map.slot +
            '" data-move="2"></select></label>' +
            '<label>Move 3<select class="party-move" data-slot="' +
            map.slot +
            '" data-move="3"></select></label>' +
            '<label>Move 4<select class="party-move" data-slot="' +
            map.slot +
            '" data-move="4"></select></label>' +
            "</div>" +
            '<button type="button" class="party-apply-slot" data-slot="' +
            map.slot +
            '">Apply slot</button>';
    grid.appendChild(card);
    fillSelect(card.querySelector(".party-species"), species, "00");
    for (var moveIndex = 1; moveIndex <= 4; moveIndex++) {
        fillSelect(card.querySelector(".party-move[data-move='" + moveIndex + "']"), moves, "00");
    }
}
function renderSlotCards(root, species, moves) {
    var leftGrid = root.querySelector("#party-slots-left");
    var rightGrid = root.querySelector("#party-slots-right");
    if (!leftGrid || !rightGrid) {
        return;
    }
    leftGrid.innerHTML = "";
    rightGrid.innerHTML = "";
    for (var _i = 0, PARTY_SLOT_MAPS_1 = PARTY_SLOT_MAPS; _i < PARTY_SLOT_MAPS_1.length; _i++) {
        var map = PARTY_SLOT_MAPS_1[_i];
        var grid = map.slot <= 3 ? leftGrid : rightGrid;
        appendSlotCard(grid, map, species, moves);
    }
}
function syncPartyFromGame(gameboy, root, dirtySlots) {
    try {
        var snapshot = readPartySnapshot(gameboy);
        for (var _i = 0, _a = snapshot.slots; _i < _a.length; _i++) {
            var slotSnapshot = _a[_i];
            if (dirtySlots.has(slotSnapshot.slot)) {
                continue;
            }
            try {
                updateSlotFromSnapshot(root, slotSnapshot);
            }
            catch (error) {
                // Keep syncing other slots if one card fails.
            }
        }
        return snapshot.partyCount;
    }
    catch (error) {
        return null;
    }
}
function markSlotDirty(root, dirtySlots, slot, setStatus) {
    if (dirtySlots.has(slot)) {
        return;
    }
    dirtySlots.add(slot);
    var card = root.querySelector(".party-slot-card[data-slot='" + slot + "']");
    if (card) {
        card.classList.add("party-slot-dirty");
    }
    if (setStatus) {
        setStatus("Slot " + slot + " editado — Apply slot para guardar en el juego.");
    }
}
function clearSlotDirty(root, dirtySlots, slot) {
    dirtySlots.delete(slot);
    var card = root.querySelector(".party-slot-card[data-slot='" + slot + "']");
    if (card) {
        card.classList.remove("party-slot-dirty");
    }
}
function clearAllDirty(root, dirtySlots) {
    dirtySlots.clear();
    Array.prototype.forEach.call(root.querySelectorAll(".party-slot-dirty"), function (card) {
        card.classList.remove("party-slot-dirty");
    });
}
function bindSlotEditEvents(root, dirtySlots, setStatus) {
    root.addEventListener("change", function (event) {
        var target = event.target;
        var slotValue = target.getAttribute("data-slot");
        if (!slotValue) {
            return;
        }
        var slot = Number(slotValue);
        var isPartyField = target.classList.contains("party-species") ||
            target.classList.contains("party-shiny") ||
            target.classList.contains("party-move");
        if (!isPartyField) {
            return;
        }
        markSlotDirty(root, dirtySlots, slot, setStatus);
        if (target.classList.contains("party-species") ||
            target.classList.contains("party-shiny")) {
            var card = root.querySelector(".party-slot-card[data-slot='" + slot + "']");
            if (card) {
                updateSlotSprite(card);
            }
        }
    });
}
export default function bindPartyEditor(gameboy, root) {
    return __awaiter(this, void 0, void 0, function () {
        function setStatus(message, isError) {
            if (isError === void 0) { isError = false; }
            statusElement.textContent = message;
            statusElement.classList.toggle("error", isError);
        }
        function refreshFromGame(manual) {
            if (manual === void 0) { manual = false; }
            if (manual) {
                clearAllDirty(root, dirtySlots);
            }
            var partyCount = syncPartyFromGame(gameboy, root, dirtySlots);
            if (partyCount === null) {
                if (manual) {
                    setStatus("Load a Crystal save in-game to read party data.", true);
                }
                return;
            }
            if (manual) {
                setStatus("Synced " + partyCount + " Pokémon from memory.");
            }
        }
        var statusElement, applyAllButton, clearButton, syncButton, activeSlots, dirtySlots, speciesById, catalog, error_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    statusElement = root.querySelector("#party-editor-status");
                    applyAllButton = root.querySelector("#party-apply-all");
                    clearButton = root.querySelector("#party-clear");
                    syncButton = root.querySelector("#party-sync-now");
                    activeSlots = new Map();
                    dirtySlots = new Set();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, loadGamesharkCatalog()];
                case 2:
                    catalog = _a.sent();
                    if (catalog.species.length === 0 || catalog.moves.length === 0) {
                        setStatus("gameshark.txt loaded but lists are empty.", true);
                        return [2 /*return*/];
                    }
                    speciesById = new Map(catalog.species.map(function (entry) { return [entry.id.toUpperCase(), entry]; }));
                    renderSlotCards(root, catalog.species, catalog.moves);
                    bindSlotEditEvents(root, dirtySlots, function (message) {
                        setStatus(message);
                    });
                    Array.prototype.forEach.call(root.querySelectorAll(".party-slot-card"), function (card) {
                        updateSlotSprite(card);
                    });
                    setStatus("Loaded " +
                        catalog.species.length +
                        " species and " +
                        catalog.moves.length +
                        " moves. Reading party from save…");
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    setStatus(message, true);
                    return [2 /*return*/];
                case 4:
                    window.setInterval(function () {
                        refreshFromGame(false);
                    }, SYNC_INTERVAL_MS);
                    if (syncButton) {
                        syncButton.addEventListener("click", function () { return refreshFromGame(true); });
                    }
                    root.addEventListener("click", function (event) {
                        var target = event.target;
                        if (target.classList.contains("party-apply-slot")) {
                            var slot = Number(target.getAttribute("data-slot"));
                            var config = readSlotConfig(root, slot);
                            if (config.speciesId === "00") {
                                setStatus("Pick a species for slot " + slot + ".", true);
                                return;
                            }
                            setStatus(applySlot(gameboy, activeSlots, config, speciesById));
                            clearSlotDirty(root, dirtySlots, slot);
                        }
                    });
                    applyAllButton.addEventListener("click", function () {
                        var previousOverrides = new Map(activeSlots);
                        activeSlots.clear();
                        var nicknameUpdates = 0;
                        for (var slot = 1; slot <= 6; slot++) {
                            var config = readSlotConfig(root, slot);
                            if (config.speciesId === "00") {
                                continue;
                            }
                            var map = PARTY_SLOT_MAPS[slot - 1];
                            var oldSpeciesId = byteToHex(gameboy.readByte(map.speciesStruct));
                            var nicknameUpdate = resolveNicknameOverride(gameboy, slot, oldSpeciesId, config.speciesId, speciesById);
                            if (nicknameUpdate.updated) {
                                nicknameUpdates++;
                            }
                            var patchedConfig = withDvPatch(gameboy, config, hadShinyOverride(previousOverrides, slot));
                            activeSlots.set(slot, {
                                config: patchedConfig,
                                nicknameBytes: nicknameUpdate.bytes
                            });
                        }
                        pushOverrides(gameboy, activeSlots);
                        clearAllDirty(root, dirtySlots);
                        if (nicknameUpdates > 0) {
                            setStatus("Todos los slots aplicados (" + nicknameUpdates + " motes actualizados).");
                        }
                        else {
                            setStatus("Todos los slots aplicados.");
                        }
                    });
                    clearButton.addEventListener("click", function () {
                        activeSlots.clear();
                        gameboy.clearMemoryPatches();
                        setStatus("Overrides del party quitados.");
                    });
                    refreshFromGame(true);
                    return [2 /*return*/];
            }
        });
    });
}
