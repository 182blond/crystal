/** Crystal sprites from the PokeAPI/sprites repository. */
const CRYSTAL_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ii/crystal";

export function speciesIdToNationalDex(speciesIdHex: string): number | null {
  if (!speciesIdHex || speciesIdHex === "00") {
    return null;
  }

  const nationalDex = parseInt(speciesIdHex, 16);
  if (isNaN(nationalDex) || nationalDex < 1 || nationalDex > 251) {
    return null;
  }

  return nationalDex;
}

export function getCrystalSpriteUrl(
  speciesIdHex: string,
  shiny?: boolean,
  animated = true
): string | null {
  const isShiny = shiny === true;
  const nationalDex = speciesIdToNationalDex(speciesIdHex);
  if (!nationalDex) {
    return null;
  }

  if (animated) {
    return isShiny
      ? CRYSTAL_SPRITE_BASE + "/animated/shiny/" + nationalDex + ".gif"
      : CRYSTAL_SPRITE_BASE + "/animated/" + nationalDex + ".gif";
  }

  return isShiny
    ? CRYSTAL_SPRITE_BASE + "/transparent/shiny/" + nationalDex + ".png"
    : CRYSTAL_SPRITE_BASE + "/transparent/" + nationalDex + ".png";
}

export function getSpeciesLabelFromSelect(select: HTMLSelectElement): string {
  if (!select || select.selectedIndex < 0) {
    return "";
  }

  const option = select.options[select.selectedIndex];
  const label = option && option.text ? option.text : "";
  const parts = label.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : "";
}

function hideSprite(spriteElement: HTMLImageElement, card: HTMLElement) {
  spriteElement.style.display = "none";
  spriteElement.removeAttribute("src");
  if (spriteElement.dataset) {
    delete spriteElement.dataset.url;
  }
  card.classList.remove("party-slot-has-sprite");
}

function setSpriteSource(
  spriteElement: HTMLImageElement,
  card: HTMLElement,
  primaryUrl: string,
  fallbackUrl: string | null
) {
  spriteElement.style.display = "block";
  card.classList.add("party-slot-has-sprite");

  if (spriteElement.dataset) {
    spriteElement.dataset.url = primaryUrl;
  }

  spriteElement.onerror = function() {
    if (fallbackUrl && spriteElement.dataset.url !== fallbackUrl) {
      if (spriteElement.dataset) {
        spriteElement.dataset.url = fallbackUrl;
      }
      spriteElement.src = fallbackUrl;
      spriteElement.onerror = function() {
        hideSprite(spriteElement, card);
      };
      return;
    }

    hideSprite(spriteElement, card);
  };

  spriteElement.src = primaryUrl;
}

export function updateSlotSprite(card: HTMLElement) {
  const speciesSelect = card.querySelector(".party-species") as HTMLSelectElement;
  const shinyInput = card.querySelector(".party-shiny") as HTMLInputElement;
  const spriteElement = card.querySelector(".party-slot-sprite") as HTMLImageElement;
  const speciesLabel = card.querySelector(".party-slot-species-name") as HTMLElement;

  if (!speciesSelect || !spriteElement) {
    return;
  }

  const speciesId = speciesSelect.value;
  const shiny = shinyInput ? shinyInput.checked : false;
  const animatedUrl = getCrystalSpriteUrl(speciesId, shiny, true);
  const staticUrl = getCrystalSpriteUrl(speciesId, shiny, false);

  if (speciesLabel) {
    speciesLabel.textContent =
      speciesId === "00" ? "Empty" : getSpeciesLabelFromSelect(speciesSelect);
  }

  const shinyBadge = card.querySelector(".party-slot-shiny-badge") as HTMLElement;
  if (shinyBadge) {
    shinyBadge.hidden = speciesId === "00" || !shiny;
  }

  if (!animatedUrl) {
    hideSprite(spriteElement, card);
    return;
  }

  const currentUrl = spriteElement.dataset ? spriteElement.dataset.url : "";
  if (currentUrl === animatedUrl || currentUrl === staticUrl) {
    spriteElement.style.display = "block";
    card.classList.add("party-slot-has-sprite");
    return;
  }

  setSpriteSource(spriteElement, card, animatedUrl, staticUrl);
}

export function bindSlotSpriteEvents(root: HTMLElement) {
  root.addEventListener("change", function(event) {
    const target = event.target as HTMLElement;
    if (
      !target.classList.contains("party-species") &&
      !target.classList.contains("party-shiny")
    ) {
      return;
    }

    const slot = target.getAttribute("data-slot");
    if (!slot) {
      return;
    }

    const card = root.querySelector(
      ".party-slot-card[data-slot='" + slot + "']"
    ) as HTMLElement;

    if (card) {
      updateSlotSprite(card);
    }
  });
}
