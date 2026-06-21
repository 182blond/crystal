import { BadgeDefinition, JOHTO_BADGES, KANTO_BADGES } from "./crystal-badge-data";
import {
  acceptRegionByte,
  BadgeRegionSyncState,
  createBadgeRegionSyncState,
  countEarnedBadges,
  mapBadgesFromByte,
  readBadgeSnapshot,
  BadgeState
} from "./badge-memory";
import { GameBoyInstance } from "./jsgbc-globals";

interface BadgeSyncState {
  johto: BadgeRegionSyncState;
  kanto: BadgeRegionSyncState;
}

let activeBadgeSyncState: BadgeSyncState | null = null;

function appendBadgeItem(grid: HTMLElement, badge: BadgeDefinition, region: string) {
  const item = document.createElement("div");
  item.className = "badge-item";
  item.setAttribute("data-badge", badge.id);
  item.setAttribute("data-region", region);
  item.setAttribute("title", badge.name + " Badge — locked");
  item.innerHTML =
    '<img class="badge-item__img pixelated" alt="' +
    badge.name +
    ' Badge" src="' +
    badge.imageUrl +
    '" loading="lazy" />';
  grid.appendChild(item);
}

function renderBadgeGrid(
  grid: HTMLElement,
  badges: BadgeDefinition[],
  region: string
) {
  grid.innerHTML = "";
  for (const badge of badges) {
    appendBadgeItem(grid, badge, region);
  }
}

function updateBadgeItem(item: HTMLElement, badge: BadgeState) {
  item.classList.toggle("badge-earned", badge.earned);
  item.setAttribute(
    "title",
    badge.name + " Badge — " + (badge.earned ? "earned" : "locked")
  );
}

function updateBadgeGrid(grid: HTMLElement, badges: BadgeState[]) {
  for (const badge of badges) {
    const item = grid.querySelector(
      '.badge-item[data-badge="' + badge.id + '"]'
    ) as HTMLElement;
    if (item) {
      updateBadgeItem(item, badge);
    }
  }
}

function paintBadges(root: HTMLElement, syncState: BadgeSyncState) {
  const johtoGrid = root.querySelector("#badges-johto") as HTMLElement;
  const kantoGrid = root.querySelector("#badges-kanto") as HTMLElement;

  if (!johtoGrid || !kantoGrid) {
    return;
  }

  if (syncState.johto.byte !== null) {
    updateBadgeGrid(
      johtoGrid,
      mapBadgesFromByte(JOHTO_BADGES, syncState.johto.byte)
    );
  }

  if (syncState.kanto.byte !== null) {
    updateBadgeGrid(
      kantoGrid,
      mapBadgesFromByte(KANTO_BADGES, syncState.kanto.byte)
    );
  }
}

function refreshBadges(
  gameboy: GameBoyInstance,
  root: HTMLElement,
  syncState: BadgeSyncState,
  force = false
) {
  if (!gameboy.cartridge) {
    return;
  }

  try {
    const snapshot = readBadgeSnapshot(gameboy);

    if (acceptRegionByte(snapshot.johtoByte, syncState.johto, gameboy, force)) {
      syncState.johto.byte = snapshot.johtoByte;
    }

    if (acceptRegionByte(snapshot.kantoByte, syncState.kanto, gameboy, force)) {
      syncState.kanto.byte = snapshot.kantoByte;
    }

    paintBadges(root, syncState);
  } catch (error) {
    // Ignore transient read failures during boot.
  }
}

export function syncBadgesFromRam(
  gameboy: GameBoyInstance,
  root: HTMLElement,
  force = false
) {
  if (!activeBadgeSyncState) {
    return;
  }

  refreshBadges(gameboy, root, activeBadgeSyncState, force);
}

export function resetBadgeSync(
  root?: HTMLElement | null,
  gameboy?: GameBoyInstance
) {
  if (!activeBadgeSyncState) {
    return;
  }

  activeBadgeSyncState.johto = createBadgeRegionSyncState();
  activeBadgeSyncState.kanto = createBadgeRegionSyncState();

  if (root && gameboy && gameboy.cartridge) {
    refreshBadges(gameboy, root, activeBadgeSyncState, true);
  }
}

export default function bindBadgePanel(
  gameboy: GameBoyInstance,
  root: HTMLElement
) {
  const johtoGrid = root.querySelector("#badges-johto") as HTMLElement;
  const kantoGrid = root.querySelector("#badges-kanto") as HTMLElement;

  if (!johtoGrid || !kantoGrid) {
    return;
  }

  const syncState: BadgeSyncState = {
    johto: createBadgeRegionSyncState(),
    kanto: createBadgeRegionSyncState()
  };
  activeBadgeSyncState = syncState;

  renderBadgeGrid(johtoGrid, JOHTO_BADGES, "johto");
  renderBadgeGrid(kantoGrid, KANTO_BADGES, "kanto");
}
