import * as $ from "jquery";
var Notifier = /** @class */ (function () {
    function Notifier() {
        this.$element = $("<div />").css({
            display: "none",
            position: "absolute",
            top: "5px",
            right: "5px",
            fontSize: "25px",
            color: "red"
        });
        this.hide = this.hide.bind(this);
    }
    Notifier.prototype.bind = function (gameboy) {
        var _this = this;
        gameboy
            .on("stateLoaded", function (_a) {
            var filename = _a.filename;
            _this.notify("Loaded " + filename);
        })
            .on("stateSaved", function (_a) {
            var filename = _a.filename;
            _this.notify("Saved  " + filename);
        });
    };
    Notifier.prototype.notify = function (message) {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = window.setTimeout(this.hide, 500);
        this.$element.text(message);
        this.$element.show();
    };
    Notifier.prototype.hide = function () {
        this.timeout = null;
        this.$element.hide();
    };
    Notifier.prototype.appendTo = function (element) {
        this.$element.appendTo(element);
    };
    return Notifier;
}());
export { Notifier };
export default new Notifier();
