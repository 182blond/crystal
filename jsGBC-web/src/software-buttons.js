import { normalizeAction } from "./action-names";
var SoftwareButtons = /** @class */ (function () {
    function SoftwareButtons() {
    }
    SoftwareButtons.prototype.bind = function (gameboy, jsGBCui) {
        jsGBCui.addEventListener("down", function (_a) {
            var detail = _a.detail;
            var action = normalizeAction(detail.button);
            if (action)
                gameboy.actionDown(action);
        });
        jsGBCui.addEventListener("up", function (_a) {
            var detail = _a.detail;
            var action = normalizeAction(detail.button);
            if (action)
                gameboy.actionUp(action);
        });
    };
    return SoftwareButtons;
}());
export { SoftwareButtons };
export default new SoftwareButtons();
