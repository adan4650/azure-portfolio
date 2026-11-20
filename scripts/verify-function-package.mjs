import assert from 'node:assert/strict'
import { lstat, readdir, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Run both before zipping and after extraction, outside the source tree.
const packageRoot = await realpath(process.argv[2] ?? '')
assert(process.argv[2], 'Pass the assembled Function package directory')
const allowedRoots = new Set(['host.json', 'package.json', 'pnpm-lock.yaml', 'dist', 'node_modules'])
for (const name of await readdir(packageRoot)) {
  assert(allowedRoots.has(name), `Unexpected release file: ${name}`)
}
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'))
const host = JSON.parse(await readFile(path.join(packageRoot, 'host.json'), 'utf8'))
assert.equal(manifest.main, 'dist/index.js')
assert.equal(host.extensions.http.routePrefix, '')
assert((await lstat(path.join(packageRoot, manifest.main))).isFile())
assert((await lstat(path.join(packageRoot, 'node_modules'))).isDirectory())

const seen = new Set()
async function inspect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name)
    const resolved = await realpath(file)
    const relative = path.relative(packageRoot, resolved)
    assert(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      `Release dependency points outside package: ${file}`)
    if (seen.has(resolved)) continue
    seen.add(resolved)
    if ((await lstat(resolved)).isDirectory()) await inspect(resolved)
  }
}
await inspect(packageRoot)

// Importing the complete entry point exercises resolution of all production
// dependencies. It registers handlers but does not call storage or Turnstile.
await import(pathToFileURL(path.join(packageRoot, manifest.main)).href)
console.log(`Function package verified: entry point, route prefix, allowed roots, ${seen.size} contained paths.`)
