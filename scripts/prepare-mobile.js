const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "mobile-web");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js"
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, "icons"), { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const icon of ["icon.svg", "icon-192.png", "icon-512.png"]) {
  fs.copyFileSync(path.join(root, "icons", icon), path.join(output, "icons", icon));
}

const apiBaseUrl = String(process.env.LABINSIGHT_API_URL || "").trim().replace(/\/$/, "");
fs.writeFileSync(
  path.join(output, "runtime-config.js"),
  `window.LABINSIGHT_CONFIG = Object.freeze(${JSON.stringify({ apiBaseUrl }, null, 2)});\n`,
  "utf8"
);

console.log(`Mobile web bundle prepared${apiBaseUrl ? ` for ${apiBaseUrl}` : " in local-storage mode"}.`);
