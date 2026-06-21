import { GameBoyInstance } from "./jsgbc-globals";

/**
 * Minimal HTML UI for generic memory read/write and persistent cheats.
 * Returns a function to refresh the cheat list (for the party editor).
 */
export default function bindCheatPanel(
  gameboy: GameBoyInstance,
  root: HTMLElement
): () => void {
  const nameInput = root.querySelector("#cheat-name") as HTMLInputElement;
  const addressInput = root.querySelector("#cheat-address") as HTMLInputElement;
  const valueInput = root.querySelector("#cheat-value") as HTMLInputElement;
  const writeOnceButton = root.querySelector("#cheat-write-once") as HTMLButtonElement;
  const addCheatButton = root.querySelector("#cheat-add") as HTMLButtonElement;
  const listElement = root.querySelector("#cheat-list") as HTMLUListElement;
  const statusElement = root.querySelector("#cheat-status") as HTMLParagraphElement;

  function setStatus(message: string, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
  }

  function renderCheats() {
    const cheats = gameboy.getCheats();
    listElement.innerHTML = "";

    if (cheats.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "cheat-empty";
      emptyItem.textContent = "No persistent cheats yet.";
      listElement.appendChild(emptyItem);
      return;
    }

    for (const cheat of cheats) {
      const item = document.createElement("li");
      item.className = "cheat-item";

      const enabledCheckbox = document.createElement("input");
      enabledCheckbox.type = "checkbox";
      enabledCheckbox.checked = cheat.enabled;
      enabledCheckbox.title = "Enabled";
      enabledCheckbox.addEventListener("change", () => {
        if (enabledCheckbox.checked) {
          gameboy.enableCheat(cheat.id);
        } else {
          gameboy.disableCheat(cheat.id);
        }
        gameboy.applyCheats();
      });

      const label = document.createElement("span");
      label.className = "cheat-label";
      label.textContent =
        cheat.name +
        " — 0x" +
        cheat.address.toString(16).toUpperCase().padStart(4, "0") +
        " = 0x" +
        cheat.value.toString(16).toUpperCase().padStart(2, "0");

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        gameboy.removeCheat(cheat.id);
        renderCheats();
      });

      item.appendChild(enabledCheckbox);
      item.appendChild(label);
      item.appendChild(removeButton);
      listElement.appendChild(item);
    }
  }

  writeOnceButton.addEventListener("click", () => {
    try {
      gameboy.writeByte(addressInput.value, valueInput.value);
      const current = gameboy.readByte(addressInput.value);
      setStatus(
        "Wrote once. Current value: 0x" +
          current.toString(16).toUpperCase().padStart(2, "0")
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message, true);
    }
  });

  addCheatButton.addEventListener("click", () => {
    try {
      const id = gameboy.addCheat(
        nameInput.value,
        addressInput.value,
        valueInput.value
      );
      gameboy.applyCheats();
      renderCheats();
      setStatus("Persistent cheat added (id " + id + ").");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message, true);
    }
  });

  renderCheats();
  return renderCheats;
}
