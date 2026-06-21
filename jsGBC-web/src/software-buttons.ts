import { normalizeAction } from "./action-names";

export class SoftwareButtons {
  bind(gameboy, jsGBCui) {
    jsGBCui.addEventListener("down", ({ detail }) => {
      const action = normalizeAction(detail.button);
      if (action) gameboy.actionDown(action);
    });

    jsGBCui.addEventListener("up", ({ detail }) => {
      const action = normalizeAction(detail.button);
      if (action) gameboy.actionUp(action);
    });
  }
}

export default new SoftwareButtons();
