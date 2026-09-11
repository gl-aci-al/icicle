import fs from "node:fs"
import path from "node:path"

const browser = process.argv[2]

if (!["chrome", "firefox"].includes(browser)) {
    console.error("Usage: node scripts/build.js <chrome|firefox>")
    process.exit(1)
}

const root = process.cwd()
const dist = path.join(root, "dist", browser)
const manifest = path.join(root, `manifest.${browser}.json`)

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist, { recursive: true })

for (const entry of fs.readdirSync(root)) {
    if (
        entry === "dist" ||
        entry === "node_modules" ||
        entry === "scripts" ||
        entry === "package.json" ||
        entry === "package-lock.json" ||
        entry.startsWith("manifest.")
    ) continue

    fs.cpSync(
        path.join(root, entry),
        path.join(dist, entry),
        { recursive: true }
    )
}

fs.copyFileSync(manifest, path.join(dist, "manifest.json"))

console.log(`Built ${browser} extension in dist/${browser} :)`)