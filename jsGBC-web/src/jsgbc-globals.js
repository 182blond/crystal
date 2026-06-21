export function getJsgbc() {
    var namespace = window["jsgbc-core"];
    if (!namespace) {
        throw new Error("jsgbc-core.js must be loaded before jsgbc-web.js");
    }
    return namespace;
}
export function getGameBoyClass() {
    return getJsgbc().default;
}
export function getUtil() {
    return getJsgbc().util;
}
