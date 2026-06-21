/** Crystal front sprites from the PokeAPI sprites repository. */
var CRYSTAL_SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ii/crystal";
export function speciesIdToNationalDex(speciesIdHex) {
    if (!speciesIdHex || speciesIdHex === "00") {
        return null;
    }
    var nationalDex = parseInt(speciesIdHex, 16);
    if (isNaN(nationalDex) || nationalDex < 1 || nationalDex > 251) {
        return null;
    }
    return nationalDex;
}
export function getCrystalSpriteUrl(speciesIdHex, shiny, transparent) {
    var isShiny = shiny === true;
    var useTransparent = transparent !== false;
    var nationalDex = speciesIdToNationalDex(speciesIdHex);
    if (!nationalDex) {
        return null;
    }
    if (isShiny) {
        return useTransparent
            ? CRYSTAL_SPRITE_BASE + "/transparent/shiny/" + nationalDex + ".png"
            : CRYSTAL_SPRITE_BASE + "/shiny/" + nationalDex + ".png";
    }
    return useTransparent
        ? CRYSTAL_SPRITE_BASE + "/transparent/" + nationalDex + ".png"
        : CRYSTAL_SPRITE_BASE + "/" + nationalDex + ".png";
}
export function getSpeciesLabelFromSelect(select) {
    if (!select || select.selectedIndex < 0) {
        return "";
    }
    var option = select.options[select.selectedIndex];
    var label = option && option.text ? option.text : "";
    var parts = label.split(" — ");
    return parts.length > 1 ? parts.slice(1).join(" — ") : "";
}
function hideSprite(spriteElement, card) {
    spriteElement.style.display = "none";
    spriteElement.removeAttribute("src");
    if (spriteElement.dataset) {
        delete spriteElement.dataset.url;
    }
    card.classList.remove("party-slot-has-sprite");
}
export function updateSlotSprite(card) {
    var speciesSelect = card.querySelector(".party-species");
    var shinyInput = card.querySelector(".party-shiny");
    var spriteElement = card.querySelector(".party-slot-sprite");
    var speciesLabel = card.querySelector(".party-slot-species-name");
    if (!speciesSelect || !spriteElement) {
        return;
    }
    var speciesId = speciesSelect.value;
    var shiny = shinyInput ? shinyInput.checked : false;
    var spriteUrl = getCrystalSpriteUrl(speciesId, shiny);
    if (speciesLabel) {
        speciesLabel.textContent =
            speciesId === "00" ? "" : getSpeciesLabelFromSelect(speciesSelect);
    }
    if (!spriteUrl) {
        hideSprite(spriteElement, card);
        return;
    }
    spriteElement.style.display = "block";
    card.classList.add("party-slot-has-sprite");
    if (!spriteElement.dataset || spriteElement.dataset.url !== spriteUrl) {
        if (spriteElement.dataset) {
            spriteElement.dataset.url = spriteUrl;
        }
        spriteElement.src = spriteUrl;
    }
    spriteElement.onerror = function () {
        hideSprite(spriteElement, card);
    };
}
export function bindSlotSpriteEvents(root) {
    root.addEventListener("change", function (event) {
        var target = event.target;
        if (!target.classList.contains("party-species") &&
            !target.classList.contains("party-shiny")) {
            return;
        }
        var slot = target.getAttribute("data-slot");
        if (!slot) {
            return;
        }
        var card = root.querySelector(".party-slot-card[data-slot='" + slot + "']");
        if (card) {
            updateSlotSprite(card);
        }
    });
}
