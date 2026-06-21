import * as $ from "jquery";
import { getGameBoyClass } from "./jsgbc-globals";
import softwareButtons from "./software-buttons";
import keyboardButtons from "./keyboard-buttons";
import gamepadButtons from "./gamepad-buttons";
import Fullscreen from "jsfullscreen";
import PointerLock from "jspointerlock";
import fileButtons, { openCartridgePicker } from "./file-buttons";
import notifier from "./notifier";
import homescreen from "./homescreen";
import bindPartyEditor from "./party-editor";
import bindBadgePanel from "./badge-panel";
import bindSpeedControls from "./speed-controls";
import bindDisplayFilterControls from "./display-filter-controls";
import bindItemsPanel, { renderItemsPanel } from "./items-panel";

if (window.WebComponentsReady) {
  init();
} else {
  window.addEventListener("WebComponentsReady", init);
}

async function init() {
  const $jsGBCui = $("jsgbc-ui");
  const jsGBCui = $jsGBCui.get(0) as any;
  const $screen = $(jsGBCui.screenElement);
  const GameBoy = getGameBoyClass();
  const gameboy = new GameBoy({
    lcd: { canvas: jsGBCui.lcdElement }
  });
  const fullscreen = new Fullscreen($screen);
  const pointerLock = new PointerLock($screen);

  fullscreen.on("change", () => {
    if (fullscreen.isActive) {
      jsGBCui.fullscreen = true;
    } else {
      PointerLock.exitPointerLock();
      jsGBCui.fullscreen = false;
    }
  });

  $screen.on("click", () => {
    if (!gameboy.cartridge) {
      openCartridgePicker();
    }
  });

  $screen.on("dblclick", () => {
    if (gameboy.cartridge) {
      toggleFullscreen();
    }
  });

  $screen.attr(
    "title",
    window.matchMedia("(max-width: 720px)").matches
      ? "Toca la pantalla para cargar ROM · Doble toque = pantalla completa"
      : "Click to load a ROM · Double-click for fullscreen"
  );

  keyboardButtons.bind(gameboy);
  softwareButtons.bind(gameboy, jsGBCui);
  bindSpeedControls(gameboy, jsGBCui);
  bindDisplayFilterControls(jsGBCui);
  gamepadButtons.bind(gameboy);
  fileButtons.bind(gameboy);
  notifier.bind(gameboy);
  notifier.appendTo(jsGBCui.screenElement);

  const partyEditor = document.getElementById("party-editor");
  if (partyEditor) {
    renderItemsPanel(partyEditor);
    bindItemsPanel(gameboy, partyEditor);
    bindPartyEditor(gameboy, partyEditor);
    bindBadgePanel(gameboy, partyEditor);
  }

  fileButtons.bind(gameboy);

  jsGBCui.loading = false;

  homescreen.bind();

  function toggleFullscreen() {
    if (fullscreen.isActive) {
      Fullscreen.exitFullscreen();
      PointerLock.exitPointerLock();
    } else {
      fullscreen.requestFullscreen();
      const lockResult = pointerLock.requestPointerLock();
      if (lockResult && typeof lockResult.catch === "function") {
        lockResult.catch(() => {});
      }
    }
  }
}