import gamepad from "jsgamepad";
import { Standard as gamepadMapping } from "./gamepad-mappings";
import { normalizeAction } from "./action-names";

export class GamepadButtons {
  bind(gameboy) {
    gamepad.on("buttonPressed", ({ buttonIndex }) => {
      const action = normalizeAction(gamepadMapping[buttonIndex]);
      if (action) gameboy.actionDown(action);
    });

    gamepad.on("buttonChanged", ({ buttonIndex, button }) => {
      const action = normalizeAction(gamepadMapping[buttonIndex]);
      if (action) {
        gameboy.actionChange(action, { value: button.value });
      }
    });

    gamepad.on("buttonReleased", ({ buttonIndex }) => {
      const action = normalizeAction(gamepadMapping[buttonIndex]);
      if (action) gameboy.actionUp(action);
    });

    gamepad.watch();
  }
}

export default new GamepadButtons();
