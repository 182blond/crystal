const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const candidates = [
  path.join(root, "node_modules", "jsgbc", "dist", "jsgbc-core.js"),
  path.join(root, "..", "jsGBC-core", "dist", "jsgbc-core.js")
];
const target = path.join(root, "jsgbc-core.js");

const source = candidates.find((file) => fs.existsSync(file));
if (!source) {
  console.error(
    "jsgbc-core.js not found. Run: cd ../jsGBC-core && npm run build"
  );
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log("Copied jsgbc-core.js from " + path.relative(root, source));
