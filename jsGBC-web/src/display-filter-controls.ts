const STORAGE_KEY = "jsgbc-display-filter";
const VALID_FILTERS = ["pixel", "lcd", "scan", "smooth"];

export default function bindDisplayFilterControls(
  jsGBCui: HTMLElement & { displayFilter?: string }
) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && VALID_FILTERS.indexOf(saved) !== -1) {
    jsGBCui.displayFilter = saved;
  }

  jsGBCui.addEventListener("display-filter-change", function(event) {
    const detail = (event as CustomEvent).detail;
    const filter = detail && detail.filter;

    if (typeof filter !== "string" || VALID_FILTERS.indexOf(filter) === -1) {
      return;
    }

    jsGBCui.displayFilter = filter;
    localStorage.setItem(STORAGE_KEY, filter);
  });
}
