import keyboardMapping from "./keyboard-mapping";
import { normalizeAction } from "./action-names";
function isTypingTarget(target) {
    if (!target || !target.tagName)
        return false;
    var tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
}
var KeyboardButtons = /** @class */ (function () {
    function KeyboardButtons() {
    }
    KeyboardButtons.prototype.bind = function (gameboy) {
        window.addEventListener("keydown", function (e) {
            if (isTypingTarget(e.target))
                return;
            var action = normalizeAction(keyboardMapping[e.keyCode]);
            if (!action || !gameboy.actions.is(action))
                return;
            gameboy.actionDown(action);
            e.preventDefault();
        });
        window.addEventListener("keyup", function (e) {
            if (isTypingTarget(e.target))
                return;
            var action = normalizeAction(keyboardMapping[e.keyCode]);
            if (!action || !gameboy.actions.is(action))
                return;
            gameboy.actionUp(action);
            e.preventDefault();
        });
    };
    return KeyboardButtons;
}());
export { KeyboardButtons };
export default new KeyboardButtons();
