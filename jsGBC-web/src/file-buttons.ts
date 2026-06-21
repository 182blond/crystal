import { getUtil, GameBoyInstance } from "./jsgbc-globals";
import { resetBadgeSync } from "./badge-panel";
import { resetPartyEditor } from "./party-editor";

export class FabButtons {
  gameboy: GameBoyInstance;

  bind(gameboy: GameBoyInstance) {
    this.gameboy = gameboy;
    const util = getUtil();
    const badgeRoot = document.getElementById("party-editor");

    const insertCartridgeButton = document.querySelector<HTMLInputElement>("#insert-cartridge");
    const downloadSaveButton = document.querySelector("#download-save");
    const uploadSaveButton = document.querySelector<HTMLInputElement>("#upload-save");

    const insertCartridgeInput = insertCartridgeButton.querySelector("input") as HTMLInputElement;
    const uploadSaveInput = uploadSaveButton.querySelector("input") as HTMLInputElement;

    insertCartridgeInput.addEventListener("change", async () => {
      const file = insertCartridgeInput.files[0];
      if (!file) return;

      downloadSaveButton.classList.remove("disabled");
      uploadSaveButton.classList.remove("disabled");

      const rom = await util.readFirstMatchingExtension(file, file.name, ["gbc", "gb"]);
      if (!rom) {
        console.error("No .gb or .gbc ROM found in the selected file.");
        return;
      }

      gameboy.replaceCartridge(rom);
      resetBadgeSync(badgeRoot, gameboy);
      resetPartyEditor(badgeRoot);
    });

    downloadSaveButton.addEventListener("click", () => {
      if (!gameboy.cartridge) return;

      util.saveAs(gameboy.getBatteryFileArrayBuffer(), gameboy.cartridge.name + ".sav");
    });

    uploadSaveInput.addEventListener("change", async () => {
      if (!gameboy.cartridge) return;

      const file = uploadSaveInput.files[0];
      const result = await util.readBlob(file);
      await gameboy.loadBatteryFileArrayBuffer(result);
      resetBadgeSync(badgeRoot, gameboy);
      resetPartyEditor(badgeRoot);
    });
  }
}

export function openCartridgePicker() {
  const insertCartridgeButton = document.querySelector("#insert-cartridge");
  if (!insertCartridgeButton) {
    return;
  }

  const input = insertCartridgeButton.querySelector(
    "input[type='file']"
  ) as HTMLInputElement | null;
  if (input) {
    input.click();
  }
}

export default new FabButtons();
