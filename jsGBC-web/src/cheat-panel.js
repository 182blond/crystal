/**
 * Minimal HTML UI for generic memory read/write and persistent cheats.
 * Returns a function to refresh the cheat list (for the party editor).
 */
export default function bindCheatPanel(gameboy, root) {
    var nameInput = root.querySelector("#cheat-name");
    var addressInput = root.querySelector("#cheat-address");
    var valueInput = root.querySelector("#cheat-value");
    var writeOnceButton = root.querySelector("#cheat-write-once");
    var addCheatButton = root.querySelector("#cheat-add");
    var listElement = root.querySelector("#cheat-list");
    var statusElement = root.querySelector("#cheat-status");
    function setStatus(message, isError) {
        if (isError === void 0) { isError = false; }
        statusElement.textContent = message;
        statusElement.classList.toggle("error", isError);
    }
    function renderCheats() {
        var cheats = gameboy.getCheats();
        listElement.innerHTML = "";
        if (cheats.length === 0) {
            var emptyItem = document.createElement("li");
            emptyItem.className = "cheat-empty";
            emptyItem.textContent = "No persistent cheats yet.";
            listElement.appendChild(emptyItem);
            return;
        }
        var _loop_1 = function (cheat) {
            var item = document.createElement("li");
            item.className = "cheat-item";
            var enabledCheckbox = document.createElement("input");
            enabledCheckbox.type = "checkbox";
            enabledCheckbox.checked = cheat.enabled;
            enabledCheckbox.title = "Enabled";
            enabledCheckbox.addEventListener("change", function () {
                if (enabledCheckbox.checked) {
                    gameboy.enableCheat(cheat.id);
                }
                else {
                    gameboy.disableCheat(cheat.id);
                }
                gameboy.applyCheats();
            });
            var label = document.createElement("span");
            label.className = "cheat-label";
            label.textContent =
                cheat.name +
                    " — 0x" +
                    cheat.address.toString(16).toUpperCase().padStart(4, "0") +
                    " = 0x" +
                    cheat.value.toString(16).toUpperCase().padStart(2, "0");
            var removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", function () {
                gameboy.removeCheat(cheat.id);
                renderCheats();
            });
            item.appendChild(enabledCheckbox);
            item.appendChild(label);
            item.appendChild(removeButton);
            listElement.appendChild(item);
        };
        for (var _i = 0, cheats_1 = cheats; _i < cheats_1.length; _i++) {
            var cheat = cheats_1[_i];
            _loop_1(cheat);
        }
    }
    writeOnceButton.addEventListener("click", function () {
        try {
            gameboy.writeByte(addressInput.value, valueInput.value);
            var current = gameboy.readByte(addressInput.value);
            setStatus("Wrote once. Current value: 0x" +
                current.toString(16).toUpperCase().padStart(2, "0"));
        }
        catch (error) {
            var message = error instanceof Error ? error.message : String(error);
            setStatus(message, true);
        }
    });
    addCheatButton.addEventListener("click", function () {
        try {
            var id = gameboy.addCheat(nameInput.value, addressInput.value, valueInput.value);
            gameboy.applyCheats();
            renderCheats();
            setStatus("Persistent cheat added (id " + id + ").");
        }
        catch (error) {
            var message = error instanceof Error ? error.message : String(error);
            setStatus(message, true);
        }
    });
    renderCheats();
    return renderCheats;
}
