const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const docs = path.join(root, "docs");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("Skipping missing path: " + path.relative(root, src));
    return;
  }

  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      copyFile(from, to);
    }
  }
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    copyFile(src, dest);
  } else {
    console.warn("Missing file: " + path.relative(root, src));
  }
}

ensureDir(docs);

copyIfExists(path.join(root, "jsgbc-core.js"), path.join(docs, "jsgbc-core.js"));
copyIfExists(path.join(root, "jsgbc-web.js"), path.join(docs, "jsgbc-web.js"));
copyIfExists(path.join(root, "gameshark.txt"), path.join(docs, "gameshark.txt"));

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
fs.writeFileSync(path.join(docs, "index.html"), indexHtml);

copyDir(path.join(root, "styles"), path.join(docs, "styles"));
copyDir(path.join(root, "assets"), path.join(docs, "assets"));
copyDir(path.join(root, "custom"), path.join(docs, "custom"));

const bowerPackages = ["polymer", "iron-flex-layout", "webcomponentsjs", "jsgbc-ui"];
for (const pkg of bowerPackages) {
  copyDir(
    path.join(root, "bower_components", pkg),
    path.join(docs, "bower_components", pkg)
  );
}

fs.writeFileSync(path.join(docs, ".nojekyll"), "");
console.log("Staged docs/ for GitHub Pages");
