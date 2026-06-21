/** Map UI / keyboard ids to jsGBC-core Action names. */
var ACTION_NAMES = {
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
export function normalizeAction(action) {
    if (!action)
        return null;
    return ACTION_NAMES[action.toLowerCase()] || null;
}
