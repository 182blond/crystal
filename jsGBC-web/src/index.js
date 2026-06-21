var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import * as $ from "jquery";
import { getGameBoyClass } from "./jsgbc-globals";
import softwareButtons from "./software-buttons";
import keyboardButtons from "./keyboard-buttons";
import gamepadButtons from "./gamepad-buttons";
import Fullscreen from "jsfullscreen";
import PointerLock from "jspointerlock";
import fileButtons from "./file-buttons";
import notifier from "./notifier";
import homescreen from "./homescreen";
import bindPartyEditor from "./party-editor";
if (window.WebComponentsReady) {
    init();
}
else {
    window.addEventListener("WebComponentsReady", init);
}
function init() {
    return __awaiter(this, void 0, void 0, function () {
        function setAddToHomescreen() {
            ribbonElement.textContent = "Add to Homescreen";
            ribbonElement.addEventListener("click", addToHomescreen);
            ribbonElement.classList.add("highlighted");
        }
        function unsetAddToHomescreen() {
            ribbonElement.textContent = ribbonText;
            ribbonElement.removeEventListener("click", addToHomescreen);
            ribbonElement.classList.remove("highlighted");
        }
        function addToHomescreen(e) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            e.preventDefault();
                            return [4 /*yield*/, homescreen.prompt()];
                        case 1:
                            _a.sent();
                            unsetAddToHomescreen();
                            return [2 /*return*/];
                    }
                });
            });
        }
        function toggleFullscreen() {
            if (fullscreen.isActive) {
                Fullscreen.exitFullscreen();
                PointerLock.exitPointerLock();
            }
            else {
                fullscreen.requestFullscreen();
                pointerLock.requestPointerLock();
            }
        }
        var $jsGBCui, jsGBCui, $screen, GameBoy, gameboy, fullscreen, pointerLock, partyEditor, ribbonElement, ribbonText;
        return __generator(this, function (_a) {
            $jsGBCui = $("jsgbc-ui");
            jsGBCui = $jsGBCui.get(0);
            $screen = $(jsGBCui.screenElement);
            GameBoy = getGameBoyClass();
            gameboy = new GameBoy({
                lcd: { canvas: jsGBCui.lcdElement }
            });
            fullscreen = new Fullscreen($screen);
            pointerLock = new PointerLock($screen);
            fullscreen.on("change", function () {
                if (fullscreen.isActive) {
                    jsGBCui.fullscreen = true;
                }
                else {
                    PointerLock.exitPointerLock();
                    jsGBCui.fullscreen = false;
                }
            });
            $screen.on("dblclick", function () {
                toggleFullscreen();
            });
            keyboardButtons.bind(gameboy);
            softwareButtons.bind(gameboy, jsGBCui);
            gamepadButtons.bind(gameboy);
            fileButtons.bind(gameboy);
            notifier.bind(gameboy);
            notifier.appendTo(jsGBCui.screenElement);
            partyEditor = document.getElementById("party-editor");
            if (partyEditor) {
                bindPartyEditor(gameboy, partyEditor);
            }
            jsGBCui.loading = false;
            homescreen.bind().then(function () {
                setAddToHomescreen();
            });
            ribbonElement = document.querySelector(".ribbon");
            ribbonText = ribbonElement.textContent;
            return [2 /*return*/];
        });
    });
}
