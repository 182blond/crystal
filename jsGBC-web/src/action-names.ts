/** Map UI / keyboard ids to jsGBC-core Action names. */
const ACTION_NAMES: { [key: string]: string } = {
  start: "Start",
  select: "Select",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  a: "A",
  b: "B",
  speed: "Speed"
};

export function normalizeAction(action: string): string | null {
  if (!action) return null;
  return ACTION_NAMES[action.toLowerCase()] || null;
}
