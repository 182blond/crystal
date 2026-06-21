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

const SYNC_INTERVAL_MS = 400;

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

function renderLockedBadges(root: HTMLElement) {
  const johtoGrid = root.querySelector("#badges-johto") as HTMLElement;
  const kantoGrid = root.querySelector("#badges-kanto") as HTMLElement;
  const countElement = root.querySelector("#badge-count") as HTMLElement;

  if (!johtoGrid || !kantoGrid || !countElement) {
    return;
  }

  updateBadgeGrid(
    johtoGrid,
    JOHTO_BADGES.map(function(badge) {
      return {
        id: badge.id,
        name: badge.name,
        bit: badge.bit,
        imageUrl: badge.imageUrl,
        earned: false
      };
    })
  );
  updateBadgeGrid(
    kantoGrid,
    KANTO_BADGES.map(function(badge) {
      return {
        id: badge.id,
        name: badge.name,
        bit: badge.bit,
        imageUrl: badge.imageUrl,
        earned: false
      };
    })
  );
  countElement.textContent = "0 / 16 badges";
}

function updateBadgeCount(countElement: HTMLElement, syncState: BadgeSyncState) {
  const johtoCount =
    syncState.johto.byte !== null ? countEarnedBadges(syncState.johto.byte) : 0;
  const kantoCount =
    syncState.kanto.byte !== null ? countEarnedBadges(syncState.kanto.byte) : 0;
  countElement.textContent = johtoCount + kantoCount + " / 16 badges";
}

function refreshBadges(
  gameboy: GameBoyInstance,
  root: HTMLElement,
  syncState: BadgeSyncState,
  force = false
) {
  const johtoGrid = root.querySelector("#badges-johto") as HTMLElement;
  const kantoGrid = root.querySelector("#badges-kanto") as HTMLElement;
  const countElement = root.querySelector("#badge-count") as HTMLElement;

  if (!johtoGrid || !kantoGrid || !countElement) {
    return;
  }

  if (!gameboy.cartridge) {
    return;
  }

  try {
    const snapshot = readBadgeSnapshot(gameboy);

    if (acceptRegionByte(snapshot.johtoByte, syncState.johto, force)) {
      syncState.johto.byte = snapshot.johtoByte;
    }

    if (acceptRegionByte(snapshot.kantoByte, syncState.kanto, force)) {
      syncState.kanto.byte = snapshot.kantoByte;
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

    updateBadgeCount(countElement, syncState);
  } catch (error) {
    countElement.textContent = "Badges — load save";
  }
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

  if (root) {
    renderLockedBadges(root);
    if (gameboy && gameboy.cartridge) {
      refreshBadges(gameboy, root, activeBadgeSyncState, true);
    }
  }
}

export function forceBadgeRefresh(
  gameboy: GameBoyInstance,
  root: HTMLElement
) {
  if (!activeBadgeSyncState) {
    return;
  }

  refreshBadges(gameboy, root, activeBadgeSyncState, true);
}

export default function bindBadgePanel(
  gameboy: GameBoyInstance,
  root: HTMLElement
) {
  gameboy.clearMemoryPatches();

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
  renderLockedBadges(root);

  if (gameboy.cartridge) {
    refreshBadges(gameboy, root, syncState, true);
  }

  window.setTimeout(function() {
    if (gameboy.cartridge) {
      refreshBadges(gameboy, root, syncState, true);
    }
  }, 2000);

  window.setInterval(function() {
    refreshBadges(gameboy, root, syncState, false);
  }, SYNC_INTERVAL_MS);
}
