import { GameBoyInstance } from "./jsgbc-globals";
import {
  PARTY_SLOT_MAPS,
  PartySlotConfig,
  PartySlotSnapshot,
  GamesharkEntry,
  DEFAULT_NEW_MON_LEVEL
} from "./crystal-party-data";
import { loadGamesharkCatalog } from "./gameshark-parser";
import {
  isStablePartySnapshot,
  isStableSlotSnapshot,
  readPartySnapshot,
  readSlotHp,
  readSlotLevelInput,
  computeHpBarPixels,
  getHpBarTier,
  HP_BAR_COLORS,
  HP_BAR_LENGTH_PX
} from "./party-memory";
import { prepareSlotApply } from "./party-apply";
import { mergePartyPatches, MemoryPatchInput, buildPartyCountPatches, applyMemoryPatchesOnce } from "./party-patches";
import { buildMoveLookup, entriesToMoveset, getSuggestedMovesetEntries, SuggestedMoveEntry } from "./pokeapi-moveset";
import { speciesIdToNationalDex } from "./pokeapi-stats";
import { updateSlotSprite } from "./pokeapi-sprites";
import {
  destroySearchableSelect,
  ensurePartySlotSearchSelects,
  setSearchableSelectValue
} from "./party-search-selects";
import { syncBadgesFromRam } from "./badge-panel";

const SYNC_INTERVAL_MS = 400;

let partyEditorResetHook: (() => void) | null = null;

export function resetPartyEditor(_root: HTMLElement | null) {
  if (partyEditorResetHook) {
    partyEditorResetHook();
  }
}

interface ActiveSlotOverride {
  config: PartySlotConfig;
}

function hadShinyOverride(
  activeSlots: Map<number, ActiveSlotOverride>,
  slot: number
): boolean {
  const previous = activeSlots.get(slot);
  return previous ? previous.config.shiny === true : false;
}

function commitSlotToGame(
  gameboy: GameBoyInstance,
  config: PartySlotConfig,
  nicknameBytes: number[] | null,
  statPatches: MemoryPatchInput[] | null,
  extraPatches: MemoryPatchInput[] = []
) {
  const nicknameBytesBySlot = new Map<number, number[]>();
  if (nicknameBytes) {
    nicknameBytesBySlot.set(config.slot, nicknameBytes);
  }

  const statPatchesBySlot = new Map<number, MemoryPatchInput[]>();
  if (statPatches && statPatches.length > 0) {
    statPatchesBySlot.set(config.slot, statPatches);
  }

  const patches = mergePartyPatches([config], nicknameBytesBySlot, statPatchesBySlot);
  patches.push.apply(patches, extraPatches);
  patches.push.apply(patches, buildPartyCountPatches(gameboy, config.slot));
  applyMemoryPatchesOnce(gameboy, patches);
}

async function applySlot(
  gameboy: GameBoyInstance,
  root: HTMLElement,
  activeSlots: Map<number, ActiveSlotOverride>,
  config: PartySlotConfig,
  speciesById: Map<string, GamesharkEntry>,
  moveLookup: Map<string, string>,
  previousOverrides?: Map<number, ActiveSlotOverride>
): Promise<string> {
  const lookupOverrides = previousOverrides || activeSlots;
  const prepared = await prepareSlotApply(
    gameboy,
    config,
    speciesById,
    moveLookup,
    hadShinyOverride(lookupOverrides, config.slot)
  );

  if ("error" in prepared) {
    return prepared.error;
  }

  if (prepared.autoFilledMoves) {
    const card = root.querySelector(
      ".party-slot-card[data-slot='" + config.slot + "']"
    ) as HTMLElement;
    if (card) {
      applyMovesetToSlot(card, prepared.config.moves);
    }
  }

  commitSlotToGame(
    gameboy,
    prepared.config,
    prepared.nicknameBytes,
    prepared.statPatches,
    prepared.extraPatches
  );

  activeSlots.set(config.slot, {
    config: prepared.config
  });

  if (prepared.isNewMon) {
    return (
      "Slot " +
      config.slot +
      " creado (Lv. " +
      prepared.config.level +
      ", stats, PP y moveset aplicados)."
    );
  }

  return "Slot " + config.slot + " aplicado (stats y PP actualizados).";
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const normalized = value.toUpperCase();
  if (select.value.toUpperCase() === normalized) {
    return;
  }

  const hasOption = Array.from(select.options).some(
    option => option.value.toUpperCase() === normalized
  );

  if (hasOption) {
    setSearchableSelectValue(select, normalized);
  }
}

function fillSelect(
  select: HTMLSelectElement,
  entries: GamesharkEntry[],
  selectedId: string
) {
  destroySearchableSelect(select);
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "00";
  empty.textContent = "— none —";
  select.appendChild(empty);

  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.id.toUpperCase();
    option.textContent = entry.id.toUpperCase() + " — " + entry.name;
    select.appendChild(option);
  }

  setSelectValue(select, selectedId);
}

function readSlotConfig(root: HTMLElement, slot: number): PartySlotConfig {
  const species = root.querySelector(
    ".party-species[data-slot='" + slot + "']"
  ) as HTMLSelectElement;
  const shiny = root.querySelector(
    ".party-shiny[data-slot='" + slot + "']"
  ) as HTMLInputElement;
  const levelInput = root.querySelector(
    ".party-level[data-slot='" + slot + "']"
  ) as HTMLInputElement;
  const moves: string[] = [];

  for (let moveIndex = 1; moveIndex <= 4; moveIndex++) {
    const moveSelect = root.querySelector(
      ".party-move[data-slot='" + slot + "'][data-move='" + moveIndex + "']"
    ) as HTMLSelectElement;
    moves.push(moveSelect ? moveSelect.value : "00");
  }

  return {
    slot,
    speciesId: species ? species.value : "00",
    shiny: shiny ? shiny.checked : false,
    level: levelInput ? readSlotLevelInput(root, slot) : DEFAULT_NEW_MON_LEVEL,
    moves: moves as [string, string, string, string]
  };
}

function updateSlotHpDisplay(
  card: HTMLElement,
  occupied: boolean,
  currentHp: number,
  maxHp: number
) {
  const hpBlock = card.querySelector(".party-slot-hp") as HTMLElement;
  const hpFill = card.querySelector(".party-slot-hp-fill") as HTMLElement;
  const hpText = card.querySelector(".party-slot-hp-text") as HTMLElement;

  if (!hpBlock || !hpFill || !hpText) {
    return;
  }

  if (!occupied || maxHp <= 0) {
    hpBlock.hidden = true;
    hpFill.style.width = "0%";
    hpFill.style.backgroundColor = "";
    hpText.style.color = "";
    return;
  }

  const tier = getHpBarTier(currentHp, maxHp);
  const pixels = computeHpBarPixels(currentHp, maxHp);
  const fillPercent = Math.max(0, Math.min(100, (pixels / HP_BAR_LENGTH_PX) * 100));
  const color = HP_BAR_COLORS[tier];

  hpBlock.hidden = false;
  hpBlock.dataset.hpTier = tier;
  hpFill.style.width = fillPercent + "%";
  hpFill.style.backgroundColor = color;
  hpText.textContent = currentHp + " / " + maxHp;
  hpText.style.color = color;

  hpFill.classList.remove(
    "party-slot-hp-fill--high",
    "party-slot-hp-fill--mid",
    "party-slot-hp-fill--critical"
  );
  hpBlock.classList.remove(
    "party-slot-hp--high",
    "party-slot-hp--mid",
    "party-slot-hp--critical"
  );
  hpFill.classList.add("party-slot-hp-fill--" + tier);
  hpBlock.classList.add("party-slot-hp--" + tier);
}

function updateSlotSummary(card: HTMLElement, snapshot: PartySlotSnapshot) {
  const level = card.querySelector(".party-slot-level") as HTMLElement;
  const shinyBadge = card.querySelector(".party-slot-shiny-badge") as HTMLElement;

  if (level) {
    level.textContent = snapshot.occupied ? "Lv. " + snapshot.level : "—";
  }

  if (shinyBadge) {
    shinyBadge.hidden = !snapshot.occupied || !snapshot.shiny;
  }

  if (snapshot.occupied && snapshot.maxHp > 0) {
    updateSlotHpDisplay(card, true, snapshot.currentHp, snapshot.maxHp);
  } else if (!snapshot.occupied) {
    updateSlotHpDisplay(card, false, 0, 0);
  }
}

function syncPartyHpFromGame(gameboy: GameBoyInstance, root: HTMLElement) {
  for (let slot = 1; slot <= 6; slot++) {
    const card = root.querySelector(
      ".party-slot-card[data-slot='" + slot + "']"
    ) as HTMLElement;
    if (!card) {
      continue;
    }

    const hp = readSlotHp(gameboy, slot);
    if (!hp) {
      continue;
    }

    updateSlotHpDisplay(card, true, hp.currentHp, hp.maxHp);
  }
}

function updateSlotFromSnapshot(
  root: HTMLElement,
  snapshot: PartySlotSnapshot
) {
  const card = root.querySelector(
    ".party-slot-card[data-slot='" + snapshot.slot + "']"
  ) as HTMLElement;
  if (!card) {
    return;
  }

  card.classList.toggle("party-slot-empty", !snapshot.occupied);

  updateSlotSummary(card, snapshot);

  const species = card.querySelector(".party-species") as HTMLSelectElement;
  const shiny = card.querySelector(".party-shiny") as HTMLInputElement;
  const levelInput = card.querySelector(".party-level") as HTMLInputElement;

  if (species) {
    setSelectValue(species, snapshot.speciesId);
  }

  if (shiny) {
    shiny.checked = snapshot.shiny;
  }

  if (levelInput && document.activeElement !== levelInput) {
    levelInput.value = String(snapshot.occupied ? snapshot.level : DEFAULT_NEW_MON_LEVEL);
  }

  for (let moveIndex = 1; moveIndex <= 4; moveIndex++) {
    const moveSelect = card.querySelector(
      ".party-move[data-move='" + moveIndex + "']"
    ) as HTMLSelectElement;
    if (moveSelect) {
      setSelectValue(moveSelect, snapshot.moves[moveIndex - 1]);
    }
  }

  try {
    updateSlotSprite(card);
  } catch (error) {
    // Sprite updates must not block party sync.
  }
}

function syncPartyEditFocus(root: HTMLElement) {
  const expandedCard = root.querySelector(
    ".party-slot-card.party-slot-expanded"
  ) as HTMLElement | null;
  const isEditing = !!expandedCard;

  root.classList.toggle("party-editing-active", isEditing);

  if (isEditing && expandedCard) {
    root.setAttribute("data-editing-slot", expandedCard.getAttribute("data-slot") || "");
  } else {
    root.removeAttribute("data-editing-slot");
  }
}

function setSlotExpanded(root: HTMLElement, slot: number, expanded: boolean) {
  const card = root.querySelector(
    ".party-slot-card[data-slot='" + slot + "']"
  ) as HTMLElement;
  if (!card) {
    return;
  }

  card.classList.toggle("party-slot-expanded", expanded);

  const summary = card.querySelector(".party-slot-summary") as HTMLButtonElement;
  if (summary) {
    summary.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  syncPartyEditFocus(root);
}

function expandSlot(root: HTMLElement, slot: number) {
  const columnSelector = slot <= 3 ? "#party-slots-left" : "#party-slots-right";
  const column = root.querySelector(columnSelector);
  if (!column) {
    return;
  }

  Array.prototype.forEach.call(
    column.querySelectorAll(".party-slot-card"),
    function(card) {
      const cardSlot = Number(card.getAttribute("data-slot"));
      card.classList.toggle("party-slot-expanded", cardSlot === slot);
    }
  );

  syncPartyEditFocus(root);

  const expandedCard = root.querySelector(
    ".party-slot-card[data-slot='" + slot + "']"
  ) as HTMLElement;
  if (expandedCard) {
    window.requestAnimationFrame(function() {
      ensurePartySlotSearchSelects(expandedCard);
    });
  }
}

function bindSlotExpandEvents(root: HTMLElement) {
  root.addEventListener("click", function(event) {
    const target = event.target as HTMLElement;

    if (target.classList.contains("party-slot-collapse")) {
      const slot = Number(target.getAttribute("data-slot"));
      setSlotExpanded(root, slot, false);
      return;
    }

    const summary = target.closest(".party-slot-summary") as HTMLElement;
    if (!summary) {
      return;
    }

    const card = summary.closest(".party-slot-card") as HTMLElement;
    if (!card) {
      return;
    }

    const slot = Number(card.getAttribute("data-slot"));
    if (card.classList.contains("party-slot-expanded")) {
      setSlotExpanded(root, slot, false);
    } else {
      expandSlot(root, slot);
    }
  });
}

function appendSlotCard(
  grid: HTMLElement,
  map: { slot: number },
  species: GamesharkEntry[],
  moves: GamesharkEntry[]
) {
  const card = document.createElement("article");
  card.className = "party-slot-card party-slot-empty";
  card.setAttribute("data-slot", String(map.slot));
  card.innerHTML =
    '<button type="button" class="party-slot-summary" aria-expanded="false">' +
    '<span class="party-slot-number">' +
    map.slot +
    "</span>" +
    '<div class="party-slot-sprite-wrap">' +
    '<span class="party-slot-sprite-glow"></span>' +
    '<img class="party-slot-sprite pixelated" alt="" style="display:none" />' +
    "</div>" +
    '<div class="party-slot-summary-text">' +
    '<span class="party-slot-species-name">Empty</span>' +
    '<span class="party-slot-title">Slot ' +
    map.slot +
    " · empty</span>" +
    '<span class="party-slot-meta">' +
    '<span class="party-slot-level">—</span>' +
    '<span class="party-slot-shiny-badge" hidden>✦ Shiny</span>' +
    "</span>" +
    '<div class="party-slot-hp" hidden>' +
    '<div class="party-slot-hp-track"><div class="party-slot-hp-fill"></div></div>' +
    '<span class="party-slot-hp-text"></span>' +
    "</div>" +
    "</div>" +
    '<span class="party-slot-expand-hint">Edit</span>' +
    "</button>" +
    '<div class="party-slot-editor">' +
    '<label>Species<select class="party-species" data-slot="' +
    map.slot +
    '"></select></label>' +
    '<label class="party-shiny-label"><input type="checkbox" class="party-shiny" data-slot="' +
    map.slot +
    '" /> Shiny</label>' +
    '<label class="party-level-label">Level<input type="number" class="party-level" data-slot="' +
    map.slot +
    '" min="1" max="100" value="1" /></label>' +
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
    '<div class="party-moveset-suggestion" hidden>' +
    '<div class="party-moveset-suggestion-head">' +
    '<span class="party-moveset-suggestion-label">' +
    '<span class="party-moveset-suggestion-icon" title="Movimientos aprendidos por nivel en Crystal (PokeAPI). No cambia tus selects hasta que pulses Usar moveset.">?</span>' +
    " Moveset sugerido" +
    "</span>" +
    '<span class="party-moveset-suggestion-level"></span>' +
    "</div>" +
    '<ul class="party-moveset-suggestion-list"></ul>' +
    '<p class="party-moveset-suggestion-hint">Vista previa — tus movimientos actuales no cambian hasta que confirmes.</p>' +
    '<div class="party-moveset-suggestion-actions">' +
    '<button type="button" class="party-apply-suggested-moveset">Usar moveset</button>' +
    '<button type="button" class="party-retry-suggested-moveset party-btn-ghost" hidden>Reintentar</button>' +
    '<button type="button" class="party-dismiss-suggested-moveset party-btn-ghost">Descartar</button>' +
    "</div>" +
    "</div>" +
    '<div class="party-slot-editor-actions">' +
    '<button type="button" class="party-apply-slot" data-slot="' +
    map.slot +
    '">Apply slot</button>' +
    '<button type="button" class="party-slot-collapse party-btn-ghost" data-slot="' +
    map.slot +
    '">Close</button>' +
    "</div>" +
    "</div>";

  grid.appendChild(card);

  fillSelect(
    card.querySelector(".party-species") as HTMLSelectElement,
    species,
    "00"
  );

  for (let moveIndex = 1; moveIndex <= 4; moveIndex++) {
    fillSelect(
      card.querySelector(
        ".party-move[data-move='" + moveIndex + "']"
      ) as HTMLSelectElement,
      moves,
      "00"
    );
  }
}

function renderSlotCards(
  root: HTMLElement,
  species: GamesharkEntry[],
  moves: GamesharkEntry[]
) {
  const leftGrid = root.querySelector("#party-slots-left") as HTMLElement;
  const rightGrid = root.querySelector("#party-slots-right") as HTMLElement;

  if (!leftGrid || !rightGrid) {
    return;
  }

  leftGrid.innerHTML = "";
  rightGrid.innerHTML = "";

  for (const map of PARTY_SLOT_MAPS) {
    const grid = map.slot <= 3 ? leftGrid : rightGrid;
    appendSlotCard(grid, map, species, moves);
  }
}

function copySlotSnapshot(snapshot: PartySlotSnapshot): PartySlotSnapshot {
  return {
    slot: snapshot.slot,
    occupied: snapshot.occupied,
    speciesId: snapshot.speciesId,
    shiny: snapshot.shiny,
    level: snapshot.level,
    currentHp: snapshot.currentHp,
    maxHp: snapshot.maxHp,
    moves: [
      snapshot.moves[0],
      snapshot.moves[1],
      snapshot.moves[2],
      snapshot.moves[3]
    ]
  };
}

function syncPartyFromGame(
  gameboy: GameBoyInstance,
  root: HTMLElement,
  dirtySlots: Set<number>,
  lastGoodBySlot: Map<number, PartySlotSnapshot>,
  lastGoodPartyCount: { value: number | null },
  force = false,
  activeSlots?: Map<number, ActiveSlotOverride>
): number | null {
  try {
    const snapshot = readPartySnapshot(gameboy);

    if (
      !force &&
      !isStablePartySnapshot(snapshot, lastGoodPartyCount.value, gameboy, force)
    ) {
      return lastGoodPartyCount.value;
    }

    for (const slotSnapshot of snapshot.slots) {
      if (dirtySlots.has(slotSnapshot.slot)) {
        continue;
      }

      const previous = lastGoodBySlot.get(slotSnapshot.slot);
      if (
        !force &&
        !isStableSlotSnapshot(slotSnapshot, previous, {
          partyCount: snapshot.partyCount,
          previousPartyCount: lastGoodPartyCount.value
        })
      ) {
        continue;
      }

      try {
        updateSlotFromSnapshot(root, slotSnapshot);
        lastGoodBySlot.set(slotSnapshot.slot, copySlotSnapshot(slotSnapshot));
        if (activeSlots && !slotSnapshot.occupied) {
          activeSlots.delete(slotSnapshot.slot);
        }
      } catch (error) {
        // Keep syncing other slots if one card fails.
      }
    }

    if (force || isStablePartySnapshot(snapshot, lastGoodPartyCount.value, gameboy, force)) {
      lastGoodPartyCount.value = snapshot.partyCount;
    }

    return lastGoodPartyCount.value;
  } catch (error) {
    return null;
  }
}

function markSlotDirty(
  root: HTMLElement,
  dirtySlots: Set<number>,
  slot: number,
  setStatus?: (message: string) => void
) {
  if (dirtySlots.has(slot)) {
    return;
  }

  dirtySlots.add(slot);
  const card = root.querySelector(
    ".party-slot-card[data-slot='" + slot + "']"
  ) as HTMLElement;
  if (card) {
    card.classList.add("party-slot-dirty");
  }

  expandSlot(root, slot);

  if (setStatus) {
    setStatus("Slot " + slot + " editado — Apply slot para guardar en el juego.");
  }
}

function clearSlotDirty(root: HTMLElement, dirtySlots: Set<number>, slot: number) {
  dirtySlots.delete(slot);
  const card = root.querySelector(
    ".party-slot-card[data-slot='" + slot + "']"
  ) as HTMLElement;
  if (card) {
    card.classList.remove("party-slot-dirty");
  }
}

function clearAllDirty(root: HTMLElement, dirtySlots: Set<number>) {
  dirtySlots.clear();
  Array.prototype.forEach.call(
    root.querySelectorAll(".party-slot-dirty"),
    function(card) {
      card.classList.remove("party-slot-dirty");
    }
  );
}

function readSlotLevel(root: HTMLElement, slot: number): number {
  return readSlotLevelInput(root, slot);
}

function applyMovesetToSlot(
  card: HTMLElement,
  moves: [string, string, string, string]
) {
  for (let moveIndex = 1; moveIndex <= 4; moveIndex++) {
    const moveSelect = card.querySelector(
      ".party-move[data-move='" + moveIndex + "']"
    ) as HTMLSelectElement;
    if (moveSelect) {
      setSelectValue(moveSelect, moves[moveIndex - 1]);
    }
  }
}

function getMoveLabel(movesById: Map<string, GamesharkEntry>, moveId: string): string {
  const entry = movesById.get(moveId.toUpperCase());
  return entry ? entry.name : moveId;
}

function hideMovesetSuggestion(card: HTMLElement) {
  const panel = card.querySelector(".party-moveset-suggestion") as HTMLElement;
  if (!panel) {
    return;
  }

  panel.hidden = true;
  panel.classList.remove("is-loading", "is-ready", "is-error");
}

function setMovesetSuggestionLevel(card: HTMLElement, level: number) {
  const levelElement = card.querySelector(
    ".party-moveset-suggestion-level"
  ) as HTMLElement;
  if (levelElement) {
    levelElement.textContent = "Lv. " + level;
  }
}

function showMovesetSuggestionLoading(card: HTMLElement, level: number) {
  const panel = card.querySelector(".party-moveset-suggestion") as HTMLElement;
  const list = card.querySelector(".party-moveset-suggestion-list") as HTMLElement;
  const applyButton = card.querySelector(
    ".party-apply-suggested-moveset"
  ) as HTMLButtonElement;
  const retryButton = card.querySelector(
    ".party-retry-suggested-moveset"
  ) as HTMLButtonElement;

  if (!panel || !list) {
    return;
  }

  panel.hidden = false;
  panel.classList.add("is-loading");
  panel.classList.remove("is-ready", "is-error");
  setMovesetSuggestionLevel(card, level);
  list.innerHTML =
    '<li class="party-moveset-suggestion-loading">Buscando movimientos…</li>';

  if (applyButton) {
    applyButton.disabled = true;
  }
  if (retryButton) {
    retryButton.hidden = true;
  }
}

function showMovesetSuggestionReady(
  card: HTMLElement,
  entries: SuggestedMoveEntry[],
  level: number,
  movesById: Map<string, GamesharkEntry>
) {
  const panel = card.querySelector(".party-moveset-suggestion") as HTMLElement;
  const list = card.querySelector(".party-moveset-suggestion-list") as HTMLElement;
  const applyButton = card.querySelector(
    ".party-apply-suggested-moveset"
  ) as HTMLButtonElement;
  const retryButton = card.querySelector(
    ".party-retry-suggested-moveset"
  ) as HTMLButtonElement;

  if (!panel || !list) {
    return;
  }

  panel.hidden = false;
  panel.classList.remove("is-loading", "is-error");
  panel.classList.add("is-ready");
  setMovesetSuggestionLevel(card, level);
  list.innerHTML = "";

  for (const entry of entries) {
    const item = document.createElement("li");
    item.innerHTML =
      "<span>" +
      getMoveLabel(movesById, entry.id) +
      '</span><span class="party-moveset-suggestion-move-meta">Lv. ' +
      entry.learnLevel +
      "</span>";
    list.appendChild(item);
  }

  if (applyButton) {
    applyButton.disabled = false;
  }
  if (retryButton) {
    retryButton.hidden = true;
  }
}

function showMovesetSuggestionError(card: HTMLElement, level: number) {
  const panel = card.querySelector(".party-moveset-suggestion") as HTMLElement;
  const list = card.querySelector(".party-moveset-suggestion-list") as HTMLElement;
  const applyButton = card.querySelector(
    ".party-apply-suggested-moveset"
  ) as HTMLButtonElement;
  const retryButton = card.querySelector(
    ".party-retry-suggested-moveset"
  ) as HTMLButtonElement;

  if (!panel || !list) {
    return;
  }

  panel.hidden = false;
  panel.classList.remove("is-loading", "is-ready");
  panel.classList.add("is-error");
  setMovesetSuggestionLevel(card, level);
  list.innerHTML =
    '<li class="party-moveset-suggestion-error">No se pudo cargar desde PokeAPI.</li>';

  if (applyButton) {
    applyButton.disabled = true;
  }
  if (retryButton) {
    retryButton.hidden = false;
  }
}

async function loadMovesetSuggestion(
  gameboy: GameBoyInstance,
  root: HTMLElement,
  slot: number,
  speciesId: string,
  moveLookup: Map<string, string>,
  movesById: Map<string, GamesharkEntry>,
  pendingMovesets: Map<number, [string, string, string, string]>,
  suggestionGeneration: Map<number, number>
) {
  const dexId = speciesIdToNationalDex(speciesId);
  if (!dexId) {
    return;
  }

  const card = root.querySelector(
    ".party-slot-card[data-slot='" + slot + "']"
  ) as HTMLElement;
  if (!card) {
    return;
  }

  const generation = (suggestionGeneration.get(slot) || 0) + 1;
  suggestionGeneration.set(slot, generation);

  const level = readSlotLevel(root, slot);
  showMovesetSuggestionLoading(card, level);
  expandSlot(root, slot);

  const entries = await getSuggestedMovesetEntries(dexId, level, moveLookup);
  if (suggestionGeneration.get(slot) !== generation) {
    return;
  }

  if (!entries || entries.length === 0) {
    pendingMovesets.delete(slot);
    showMovesetSuggestionError(card, level);
    return;
  }

  pendingMovesets.set(slot, entriesToMoveset(entries));
  showMovesetSuggestionReady(card, entries, level, movesById);
}

function bindSlotEditEvents(
  gameboy: GameBoyInstance,
  root: HTMLElement,
  dirtySlots: Set<number>,
  moveLookup: Map<string, string>,
  movesById: Map<string, GamesharkEntry>,
  pendingMovesets: Map<number, [string, string, string, string]>,
  suggestionGeneration: Map<number, number>,
  setStatus: (message: string, isError?: boolean) => void
) {
  root.addEventListener("focusin", function(event) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("party-level")) {
      return;
    }

    const slotValue = target.getAttribute("data-slot");
    if (!slotValue) {
      return;
    }

    markSlotDirty(root, dirtySlots, Number(slotValue), setStatus);
  });

  root.addEventListener("click", function(event) {
    const target = event.target as HTMLElement;

    if (target.classList.contains("party-apply-suggested-moveset")) {
      const card = target.closest(".party-slot-card") as HTMLElement;
      if (!card) {
        return;
      }

      const slot = Number(card.getAttribute("data-slot"));
      const moves = pendingMovesets.get(slot);
      if (!moves) {
        return;
      }

      applyMovesetToSlot(card, moves);
      markSlotDirty(root, dirtySlots, slot, setStatus);
      hideMovesetSuggestion(card);
      pendingMovesets.delete(slot);
      setStatus(
        "Moveset aplicado en slot " +
          slot +
          " — pulsa Apply slot para guardar en el juego."
      );
      return;
    }

    if (target.classList.contains("party-dismiss-suggested-moveset")) {
      const card = target.closest(".party-slot-card") as HTMLElement;
      if (!card) {
        return;
      }

      const slot = Number(card.getAttribute("data-slot"));
      hideMovesetSuggestion(card);
      pendingMovesets.delete(slot);
      return;
    }

    if (target.classList.contains("party-retry-suggested-moveset")) {
      const card = target.closest(".party-slot-card") as HTMLElement;
      if (!card) {
        return;
      }

      const slot = Number(card.getAttribute("data-slot"));
      const speciesSelect = card.querySelector(".party-species") as HTMLSelectElement;
      if (!speciesSelect || speciesSelect.value === "00") {
        return;
      }

      void loadMovesetSuggestion(
        gameboy,
        root,
        slot,
        speciesSelect.value,
        moveLookup,
        movesById,
        pendingMovesets,
        suggestionGeneration
      );
    }
  });

  root.addEventListener("change", function(event) {
    const target = event.target as HTMLElement;
    const slotValue = target.getAttribute("data-slot");
    if (!slotValue) {
      return;
    }

    const slot = Number(slotValue);
    const isPartyField =
      target.classList.contains("party-species") ||
      target.classList.contains("party-shiny") ||
      target.classList.contains("party-level") ||
      target.classList.contains("party-move");

    if (!isPartyField) {
      return;
    }

    markSlotDirty(root, dirtySlots, slot, setStatus);

    if (
      target.classList.contains("party-species") ||
      target.classList.contains("party-shiny")
    ) {
      const card = root.querySelector(
        ".party-slot-card[data-slot='" + slot + "']"
      ) as HTMLElement;
      if (card) {
        updateSlotSprite(card);
        const shinyBadge = card.querySelector(
          ".party-slot-shiny-badge"
        ) as HTMLElement;
        const shinyInput = card.querySelector(".party-shiny") as HTMLInputElement;
        if (shinyBadge && shinyInput) {
          shinyBadge.hidden = !shinyInput.checked;
        }
      }

      if (target.classList.contains("party-species")) {
        const speciesId = (target as HTMLSelectElement).value;
        const card = root.querySelector(
          ".party-slot-card[data-slot='" + slot + "']"
        ) as HTMLElement;

        if (speciesId === "00") {
          pendingMovesets.delete(slot);
          if (card) {
            hideMovesetSuggestion(card);
          }
        } else {
          void loadMovesetSuggestion(
            gameboy,
            root,
            slot,
            speciesId,
            moveLookup,
            movesById,
            pendingMovesets,
            suggestionGeneration
          );
        }
      }
    }

    if (target.classList.contains("party-level")) {
      const levelInput = target as HTMLInputElement;
      levelInput.value = String(readSlotLevelInput(root, slot));

      const speciesSelect = root.querySelector(
        ".party-species[data-slot='" + slot + "']"
      ) as HTMLSelectElement;
      if (speciesSelect && speciesSelect.value !== "00") {
        void loadMovesetSuggestion(
          gameboy,
          root,
          slot,
          speciesSelect.value,
          moveLookup,
          movesById,
          pendingMovesets,
          suggestionGeneration
        );
      }
    }
  });
}

export default async function bindPartyEditor(
  gameboy: GameBoyInstance,
  root: HTMLElement
) {
  gameboy.clearMemoryPatches();

  const statusElement = root.querySelector("#party-editor-status") as HTMLElement;
  const applyAllButton = root.querySelector(
    "#party-apply-all"
  ) as HTMLButtonElement;
  const clearButton = root.querySelector("#party-clear") as HTMLButtonElement;
  const activeSlots = new Map<number, ActiveSlotOverride>();
  const dirtySlots = new Set<number>();
  const lastGoodBySlot = new Map<number, PartySlotSnapshot>();
  const lastGoodPartyCount = { value: null as number | null };

  function setStatus(message: string, isError = false) {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
  }

  let speciesById: Map<string, GamesharkEntry>;
  let movesById: Map<string, GamesharkEntry>;
  let moveLookup: Map<string, string>;
  const pendingMovesets = new Map<number, [string, string, string, string]>();
  const suggestionGeneration = new Map<number, number>();

  try {
    const catalog = await loadGamesharkCatalog();
    if (catalog.species.length === 0 || catalog.moves.length === 0) {
      setStatus("gameshark.txt loaded but lists are empty.", true);
      return;
    }

    speciesById = new Map(
      catalog.species.map(entry => [entry.id.toUpperCase(), entry])
    );
    movesById = new Map(
      catalog.moves.map(entry => [entry.id.toUpperCase(), entry])
    );
    moveLookup = buildMoveLookup(catalog.moves);

    renderSlotCards(root, catalog.species, catalog.moves);
    bindSlotExpandEvents(root);
    bindSlotEditEvents(
      gameboy,
      root,
      dirtySlots,
      moveLookup,
      movesById,
      pendingMovesets,
      suggestionGeneration,
      setStatus
    );

    Array.prototype.forEach.call(
      root.querySelectorAll(".party-slot-card"),
      function(card) {
        updateSlotSprite(card as HTMLElement);
      }
    );

    setStatus(
      "Loaded " +
        catalog.species.length +
        " species and " +
        catalog.moves.length +
        " moves. Reading party from save…"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(message, true);
    return;
  }

  function refreshFromGame(manual = false) {
    if (manual) {
      clearAllDirty(root, dirtySlots);
    }

    syncPartyFromGame(
      gameboy,
      root,
      dirtySlots,
      lastGoodBySlot,
      lastGoodPartyCount,
      manual,
      activeSlots
    );
    syncPartyHpFromGame(gameboy, root);
    syncBadgesFromRam(gameboy, root, manual);
  }

  window.setInterval(() => {
    refreshFromGame(false);
  }, SYNC_INTERVAL_MS);

  root.addEventListener("click", async event => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("party-apply-slot")) {
      const slot = Number(target.getAttribute("data-slot"));
      const config = readSlotConfig(root, slot);
      if (config.speciesId === "00") {
        setStatus("Pick a species for slot " + slot + ".", true);
        return;
      }
      setStatus("Aplicando…");
      const message = await applySlot(
        gameboy,
        root,
        activeSlots,
        config,
        speciesById,
        moveLookup
      );
      setStatus(message, message.indexOf("Invalid") === 0 || message.indexOf("Could not") === 0);
      clearSlotDirty(root, dirtySlots, slot);
    }
  });

  if (applyAllButton) {
  applyAllButton.addEventListener("click", async () => {
    const previousOverrides = new Map(activeSlots);
    activeSlots.clear();
    let applied = 0;
    let created = 0;
    let highestSlot = 0;
    const batchConfigs: PartySlotConfig[] = [];
    const nicknameBytesBySlot = new Map<number, number[]>();
    const statPatchesBySlot = new Map<number, MemoryPatchInput[]>();
    const extraPatches: MemoryPatchInput[] = [];

    setStatus("Aplicando slots…");

    for (let slot = 1; slot <= 6; slot++) {
      const config = readSlotConfig(root, slot);
      if (config.speciesId === "00") {
        continue;
      }

      const prepared = await prepareSlotApply(
        gameboy,
        config,
        speciesById,
        moveLookup,
        hadShinyOverride(previousOverrides, slot)
      );

      if ("error" in prepared) {
        setStatus(prepared.error, true);
        return;
      }

      if (prepared.autoFilledMoves) {
        const card = root.querySelector(
          ".party-slot-card[data-slot='" + slot + "']"
        ) as HTMLElement;
        if (card) {
          applyMovesetToSlot(card, prepared.config.moves);
        }
      }

      batchConfigs.push(prepared.config);
      if (prepared.nicknameBytes) {
        nicknameBytesBySlot.set(slot, prepared.nicknameBytes);
      }
      statPatchesBySlot.set(slot, prepared.statPatches);
      extraPatches.push.apply(extraPatches, prepared.extraPatches);
      activeSlots.set(slot, { config: prepared.config });

      applied++;
      highestSlot = slot;
      if (prepared.isNewMon) {
        created++;
      }
    }

    if (applied === 0) {
      setStatus("No hay slots con especie seleccionada.", true);
      return;
    }

    const patches = mergePartyPatches(
      batchConfigs,
      nicknameBytesBySlot,
      statPatchesBySlot
    );
    patches.push.apply(patches, extraPatches);
    patches.push.apply(patches, buildPartyCountPatches(gameboy, highestSlot));
    applyMemoryPatchesOnce(gameboy, patches);

    clearAllDirty(root, dirtySlots);

    if (created > 0) {
      setStatus(
        "Todos los slots aplicados (" + created + " Pokémon nuevos con stats y PP)."
      );
    } else {
      setStatus("Todos los slots aplicados (stats y PP actualizados).");
    }
  });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      activeSlots.clear();
      gameboy.clearMemoryPatches();
      setStatus("Estado del editor limpiado (los cambios ya escritos en el juego se mantienen).");
    });
  }

  refreshFromGame(true);

  partyEditorResetHook = () => {
    activeSlots.clear();
    pendingMovesets.clear();
    suggestionGeneration.clear();
    gameboy.clearMemoryPatches();
    lastGoodBySlot.clear();
    lastGoodPartyCount.value = null;
    clearAllDirty(root, dirtySlots);
    root.classList.remove("party-editing-active");
    root.removeAttribute("data-editing-slot");
    Array.prototype.forEach.call(
      root.querySelectorAll(".party-moveset-suggestion"),
      function(panel) {
        (panel as HTMLElement).hidden = true;
      }
    );
    Array.prototype.forEach.call(root.querySelectorAll(".party-slot-card"), function(card) {
      (card as HTMLElement).classList.remove("party-slot-expanded");
    });
  };
}
