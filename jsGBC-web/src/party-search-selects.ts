interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxState {
  wrapper: HTMLElement;
  trigger: HTMLButtonElement;
  valueEl: HTMLElement;
  dropdown: HTMLElement;
  search: HTMLInputElement;
  list: HTMLUListElement;
  restoreParent: Node;
  restoreNext: ChildNode | null;
  onDocumentClick: (event: MouseEvent) => void;
}

const comboboxStates = new WeakMap<HTMLSelectElement, ComboboxState>();
let openComboboxClose: (() => void) | null = null;

function getSelectLabel(select: HTMLSelectElement, value: string): string {
  const normalized = value.toUpperCase();
  for (let index = 0; index < select.options.length; index++) {
    const option = select.options[index];
    if (option.value.toUpperCase() === normalized) {
      return option.textContent || normalized;
    }
  }
  return normalized === "00" ? "— none —" : normalized;
}

function readSelectOptions(select: HTMLSelectElement): ComboboxOption[] {
  const options: ComboboxOption[] = [];
  for (let index = 0; index < select.options.length; index++) {
    const option = select.options[index];
    options.push({
      value: option.value.toUpperCase(),
      label: option.textContent || option.value
    });
  }
  return options;
}

function closeCombobox(state: ComboboxState) {
  state.dropdown.hidden = true;
  state.trigger.setAttribute("aria-expanded", "false");
  state.search.value = "";
  if (openComboboxClose) {
    openComboboxClose = null;
  }
}

function renderComboboxList(
  select: HTMLSelectElement,
  state: ComboboxState
) {
  const query = state.search.value.trim().toLowerCase();
  const currentValue = select.value.toUpperCase();
  const options = readSelectOptions(select);

  state.list.innerHTML = "";

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (
      query &&
      option.value !== currentValue &&
      option.label.toLowerCase().indexOf(query) === -1
    ) {
      continue;
    }

    const item = document.createElement("li");
    item.className = "party-combobox__option";
    item.setAttribute("role", "option");
    item.setAttribute("data-value", option.value);
    item.textContent = option.label;

    if (option.value === currentValue) {
      item.classList.add("party-combobox__option--selected");
      item.setAttribute("aria-selected", "true");
    }

    state.list.appendChild(item);
  }

  if (!state.list.children.length) {
    const empty = document.createElement("li");
    empty.className = "party-combobox__empty";
    empty.textContent = "Sin resultados";
    state.list.appendChild(empty);
  }
}

function syncComboboxDisplay(select: HTMLSelectElement, state: ComboboxState) {
  state.valueEl.textContent = getSelectLabel(select, select.value);
  renderComboboxList(select, state);
}

function openCombobox(select: HTMLSelectElement, state: ComboboxState) {
  if (openComboboxClose) {
    openComboboxClose();
  }

  state.dropdown.hidden = false;
  state.trigger.setAttribute("aria-expanded", "true");
  renderComboboxList(select, state);
  state.search.focus();
  state.search.select();

  openComboboxClose = function() {
    closeCombobox(state);
  };
}

function selectComboboxValue(
  select: HTMLSelectElement,
  state: ComboboxState,
  value: string
) {
  select.value = value.toUpperCase();
  syncComboboxDisplay(select, state);
  closeCombobox(state);

  const changeEvent = document.createEvent("HTMLEvents");
  changeEvent.initEvent("change", true, false);
  select.dispatchEvent(changeEvent);
}

export function destroySearchableSelect(select: HTMLSelectElement) {
  const state = comboboxStates.get(select);
  if (!state) {
    return;
  }

  document.removeEventListener("click", state.onDocumentClick);
  closeCombobox(state);

  const parent = state.restoreParent;
  if (state.restoreNext && state.restoreNext.parentNode === parent) {
    parent.insertBefore(select, state.restoreNext);
  } else {
    parent.appendChild(select);
  }

  state.wrapper.remove();
  select.classList.remove("party-search-select--ready", "party-combobox__native");
  comboboxStates.delete(select);
}

export function enhanceSearchableSelect(select: HTMLSelectElement) {
  if (select.classList.contains("party-search-select--ready")) {
    return;
  }

  const parent = select.parentNode;
  if (!parent) {
    return;
  }

  const restoreNext = select.nextSibling;
  const wrapper = document.createElement("div");
  wrapper.className = "party-combobox";

  const control = document.createElement("div");
  control.className = "party-combobox__control";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "party-combobox__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const valueEl = document.createElement("span");
  valueEl.className = "party-combobox__value";

  const chevron = document.createElement("span");
  chevron.className = "party-combobox__chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";

  trigger.appendChild(valueEl);
  trigger.appendChild(chevron);

  const dropdown = document.createElement("div");
  dropdown.className = "party-combobox__dropdown";
  dropdown.hidden = true;

  const search = document.createElement("input");
  search.type = "search";
  search.className = "party-combobox__search";
  search.placeholder = "Buscar…";
  search.autocomplete = "off";
  search.setAttribute("aria-label", "Buscar en la lista");

  const list = document.createElement("ul");
  list.className = "party-combobox__list";
  list.setAttribute("role", "listbox");

  dropdown.appendChild(search);
  dropdown.appendChild(list);
  control.appendChild(trigger);
  control.appendChild(dropdown);
  wrapper.appendChild(control);

  parent.insertBefore(wrapper, select);
  wrapper.insertBefore(select, control);

  select.classList.add("party-search-select--ready", "party-combobox__native");

  const state: ComboboxState = {
    wrapper,
    trigger,
    valueEl,
    dropdown,
    search,
    list,
    restoreParent: parent,
    restoreNext,
    onDocumentClick: function(event) {
      const target = event.target as Node;
      if (wrapper.contains(target)) {
        return;
      }
      closeCombobox(state);
    }
  };

  syncComboboxDisplay(select, state);

  trigger.addEventListener("click", function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (dropdown.hidden) {
      openCombobox(select, state);
    } else {
      closeCombobox(state);
    }
  });

  search.addEventListener("input", function() {
    renderComboboxList(select, state);
  });

  search.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCombobox(state);
      trigger.focus();
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const first = list.querySelector(
        ".party-combobox__option"
      ) as HTMLElement;
      if (first) {
        selectComboboxValue(select, state, first.getAttribute("data-value") || "00");
      }
    }
  });

  list.addEventListener("click", function(event) {
    const target = (event.target as HTMLElement).closest(
      ".party-combobox__option"
    ) as HTMLElement;
    if (!target) {
      return;
    }
    selectComboboxValue(select, state, target.getAttribute("data-value") || "00");
  });

  document.addEventListener("click", state.onDocumentClick);
  comboboxStates.set(select, state);
}

export function ensurePartySlotSearchSelects(card: HTMLElement) {
  if (card.getAttribute("data-search-enhanced") === "1") {
    return;
  }

  enhancePartySlotSelects(card);
  card.setAttribute("data-search-enhanced", "1");
}

export function enhancePartySlotSelects(card: HTMLElement) {
  const species = card.querySelector(".party-species") as HTMLSelectElement;
  if (species) {
    enhanceSearchableSelect(species);
  }

  Array.prototype.forEach.call(
    card.querySelectorAll(".party-move"),
    function(moveSelect) {
      enhanceSearchableSelect(moveSelect as HTMLSelectElement);
    }
  );
}

export function setSearchableSelectValue(
  select: HTMLSelectElement,
  value: string
) {
  const normalized = value.toUpperCase();
  select.value = normalized;

  const state = comboboxStates.get(select);
  if (state) {
    syncComboboxDisplay(select, state);
  }
}
