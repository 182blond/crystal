import {
  addItemToPocket,
  BagItemGrant,
  QUICK_BAG_GRANTS
} from "./crystal-bag-data";
import { GameBoyInstance } from "./jsgbc-globals";

const GRANT_AMOUNTS = [1, 10, 99];

export default function bindItemsPanel(
  gameboy: GameBoyInstance,
  root: HTMLElement
) {
  bindItemsBlockToggle(root);

  const statusElement = root.querySelector(
    "#items-panel-status"
  ) as HTMLElement;

  function setStatus(message: string, isError = false) {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.classList.toggle("error", isError);
  }

  function grantItem(grant: BagItemGrant, amount: number) {
    if (!gameboy.cartridge) {
      setStatus("Cargá una partida primero.", true);
      return;
    }

    const result = addItemToPocket(
      gameboy,
      grant.pocket,
      grant.itemId,
      amount
    );

    if (!result.ok) {
      setStatus(result.error, true);
      return;
    }

    setStatus(
      "+" +
        amount +
        " " +
        grant.name +
        " (total: " +
        result.total +
        "). Abrí la bolsa in-game para verlos."
    );
  }

  root.addEventListener("click", event => {
    const target = event.target as HTMLElement;
    const button = target.closest(
      "[data-item-id][data-amount]"
    ) as HTMLButtonElement;

    if (!button || !root.contains(button)) {
      return;
    }

    const itemId = button.getAttribute("data-item-id");
    const amount = parseInt(button.getAttribute("data-amount") || "", 10);
    const grant = QUICK_BAG_GRANTS.find(entry => entry.id === itemId);

    if (!grant || !amount) {
      return;
    }

    grantItem(grant, amount);
  });
}

export function renderItemsPanel(root: HTMLElement) {
  const panel = root.querySelector("#items-panel") as HTMLElement;
  if (!panel) {
    return;
  }

  panel.innerHTML =
    '<p class="items-panel__hint">Sumá items a la bolsa al instante (WRAM).</p>' +
    QUICK_BAG_GRANTS.map(function(grant) {
      return (
        '<div class="items-panel__row" data-item-row="' +
        grant.id +
        '">' +
        '<span class="items-panel__name">' +
        grant.name +
        "</span>" +
        '<div class="items-panel__amounts">' +
        GRANT_AMOUNTS.map(function(amount) {
          return (
            '<button type="button" class="items-panel__btn" data-item-id="' +
            grant.id +
            '" data-amount="' +
            amount +
            '">+' +
            amount +
            "</button>"
          );
        }).join("") +
        "</div>" +
        "</div>"
      );
    }).join("") +
    '<p id="items-panel-status" class="items-panel__status"></p>';
}

function bindItemsBlockToggle(root: HTMLElement) {
  const block = root.querySelector("#items-block") as HTMLElement;
  const toggle = root.querySelector("#items-block-toggle") as HTMLButtonElement;
  const body = root.querySelector("#items-block-body") as HTMLElement;

  if (!block || !toggle || !body) {
    return;
  }

  function setExpanded(expanded: boolean) {
    block.classList.toggle("items-block--collapsed", !expanded);
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    body.hidden = !expanded;
  }

  toggle.addEventListener("click", function() {
    setExpanded(block.classList.contains("items-block--collapsed"));
  });

  setExpanded(false);
}
