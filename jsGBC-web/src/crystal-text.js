/** Gen II English Crystal character encoding (pret charmap). */
var CHAR_CODES = {
    "@": 0x50,
    " ": 0x7f,
    A: 0x80,
    B: 0x81,
    C: 0x82,
    D: 0x83,
    E: 0x84,
    F: 0x85,
    G: 0x86,
    H: 0x87,
    I: 0x88,
    J: 0x89,
    K: 0x8a,
    L: 0x8b,
    M: 0x8c,
    N: 0x8d,
    O: 0x8e,
    P: 0x8f,
    Q: 0x90,
    R: 0x91,
    S: 0x92,
    T: 0x93,
    U: 0x94,
    V: 0x95,
    W: 0x96,
    X: 0x97,
    Y: 0x98,
    Z: 0x99,
    "(": 0x9a,
    ")": 0x9b,
    ":": 0x9c,
    ";": 0x9d,
    "[": 0x9e,
    "]": 0x9f,
    a: 0xa0,
    b: 0xa1,
    c: 0xa2,
    d: 0xa3,
    e: 0xa4,
    f: 0xa5,
    g: 0xa6,
    h: 0xa7,
    i: 0xa8,
    j: 0xa9,
    k: 0xaa,
    l: 0xab,
    m: 0xac,
    n: 0xad,
    o: 0xae,
    p: 0xaf,
    q: 0xb0,
    r: 0xb1,
    s: 0xb2,
    t: 0xb3,
    u: 0xb4,
    v: 0xb5,
    w: 0xb6,
    x: 0xb7,
    y: 0xb8,
    z: 0xb9,
    "'": 0xe0,
    "-": 0xe3,
    "?": 0xe6,
    "!": 0xe7,
    ".": 0xe8,
    "&": 0xe9,
    "♂": 0xef,
    "♀": 0xf5,
    "0": 0xf6,
    "1": 0xf7,
    "2": 0xf8,
    "3": 0xf9,
    "4": 0xfa,
    "5": 0xfb,
    "6": 0xfc,
    "7": 0xfd,
    "8": 0xfe,
    "9": 0xff
};
export var CRYSTAL_NICKNAME_LENGTH = 11;
var TERMINATOR = 0x50;
/** ROM-style species names that differ from gameshark.txt labels. */
var SPECIES_ROM_NAME_OVERRIDES = {
    "1D": "NIDORAN♀",
    "20": "NIDORAN♂",
    "53": "FARFETCH'D",
    FA: "HO-OH"
};
function encodeChar(char) {
    var mapped = CHAR_CODES[char];
    if (mapped !== undefined) {
        return mapped;
    }
    var upper = char.toUpperCase();
    if (upper >= "A" && upper <= "Z") {
        return CHAR_CODES[upper];
    }
    throw new Error("Unsupported character in species name: " + char);
}
/** Encode a default species nickname (10 chars + terminator) like the game ROM. */
export function encodeCrystalDefaultName(text) {
    var bytes = [];
    for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
        var char = text_1[_i];
        if (char === "@") {
            bytes.push(TERMINATOR);
            continue;
        }
        if (bytes.length >= 10) {
            break;
        }
        bytes.push(encodeChar(char));
    }
    while (bytes.length < 10) {
        bytes.push(TERMINATOR);
    }
    bytes.push(TERMINATOR);
    return bytes.slice(0, CRYSTAL_NICKNAME_LENGTH);
}
export function speciesRomName(speciesId, catalogName) {
    var override = SPECIES_ROM_NAME_OVERRIDES[speciesId.toUpperCase()];
    if (override) {
        return override;
    }
    return catalogName
        .toUpperCase()
        .replace(/\s*-\s*/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}
export function encodeDefaultSpeciesNickname(speciesId, catalogName) {
    return encodeCrystalDefaultName(speciesRomName(speciesId, catalogName));
}
export function nicknameBytesEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (var index = 0; index < a.length; index++) {
        if ((a[index] & 0xff) !== (b[index] & 0xff)) {
            return false;
        }
    }
    return true;
}
