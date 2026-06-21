import { GameBoyInstance } from "./jsgbc-globals";

export default function bindSpeedControls(
  gameboy: GameBoyInstance,
  jsGBCui: HTMLElement & { emulationSpeed?: number }
) {
  jsGBCui.addEventListener("speed-change", function(event) {
    const detail = (event as CustomEvent).detail;
    const speed = detail && detail.speed;

    if (typeof speed !== "number" || speed < 1) {
      return;
    }

    if (typeof gameboy.setSpeed === "function") {
      gameboy.setSpeed(speed);
    }

    jsGBCui.emulationSpeed = speed;
  });
}
