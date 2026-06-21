/**
 * Lightweight dev server for modern Node.js versions.
 * webpack-dev-server v3 relies on removed Node internals (http_parser).
 */
const express = require("express");
const webpack = require("webpack");
const fs = require("fs");
const path = require("path");
const config = require("./webpack.dev");

const compiler = webpack(config);
const app = express();
const root = __dirname;
const preferredPort = Number(process.env.PORT) || 8080;
const portWasExplicit = Boolean(process.env.PORT);

const requiredPaths = [
  "bower_components/webcomponentsjs/webcomponents.min.js",
  "custom/jsgbc-ui.html",
  "bower_components/jsgbc-ui/images/lcd.png",
  "node_modules/jsgbc/dist/jsgbc-core.js"
];

for (const relativePath of requiredPaths) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    console.error("Missing required file: " + relativePath);
  }
}

console.log("If bower files are missing, run: npx bower install");
console.log("If jsgbc-core is missing, run: npm run prestart");

app.use(express.static(root));

compiler.watch({ ignored: /node_modules/ }, (error, stats) => {
  if (error) {
    console.error(error.message || error);
    return;
  }

  const info = stats.toString({
    colors: true,
    chunks: false,
    modules: false
  });

  if (stats.hasErrors()) {
    console.error(info);
    return;
  }

  console.log(info);
});

function listen(port) {
  const server = require("http").createServer(app);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      if (portWasExplicit) {
        console.error(
          "Port " + port + " is already in use. Stop the other process or set PORT to another value."
        );
        process.exit(1);
      }

      const nextPort = port + 1;
      if (nextPort > preferredPort + 20) {
        console.error("Could not find a free port near " + preferredPort + ".");
        process.exit(1);
      }

      console.warn("Port " + port + " is in use, trying " + nextPort + "...");
      listen(nextPort);
      return;
    }

    console.error(error.message || error);
    process.exit(1);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log("jsGBC-web dev server running at http://localhost:" + port);
    console.log("Serving from " + root);
  });
}

listen(preferredPort);
