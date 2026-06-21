import gamepad from "jsgamepad";
import { Standard as gamepadMapping } from "./gamepad-mappings";
import { normalizeAction } from "./action-names";
var GamepadButtons = /** @class */ (function () {
    function GamepadButtons() {
    }
    GamepadButtons.prototype.bind = function (gameboy) {
        gamepad.on("buttonPressed", function (_a) {
            var buttonIndex = _a.buttonIndex;
            var action = normalizeAction(gamepadMapping[buttonIndex]);
            if (action)
                gameboy.actionDown(action);
        });
        gamepad.on("buttonChanged", function (_a) {
            var buttonIndex = _a.buttonIndex, button = _a.button;
            var action = normalizeAction(gamepadMapping[buttonIndex]);
            if (action) {
                gameboy.actionChange(action, { value: button.value });
            }
        });
        gamepad.on("buttonReleased", function (_a) {
            var buttonIndex = _a.buttonIndex;
            var action = normalizeAction(gamepadMapping[buttonIndex]);
            if (action)
                gameboy.actionUp(action);
        });
        gamepad.watch();
    };
    return GamepadButtons;
}());
export { GamepadButtons };
export default new GamepadButtons();
