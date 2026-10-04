// Builds the itch.io version and zips it, ready to upload:
//   npm run itch  ->  release/viet-bake-shop-sim-web-<version>.zip
// itch wants index.html at the top of the zip, so the files are added by name
// (no folder, no "./" prefix).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'dist-itch');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const zip = join(root, 'release', `viet-bake-shop-sim-web-${version}.zip`);
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const bin = (path) => join(root, 'node_modules', path);

run(process.execPath, [bin('typescript/bin/tsc'), '--noEmit']);
run(process.execPath, [bin('vite/bin/vite.js'), 'build', '--mode', 'itch', '--outDir', 'dist-itch', '--emptyOutDir']);
// The offline worker isn't used inside itch's player.
rmSync(join(out, 'sw.js'), { force: true });

mkdirSync(join(root, 'release'), { recursive: true });
rmSync(zip, { force: true });
const files = readdirSync(out);
if (process.platform === 'win32') {
  // Windows' own tar (not Git's) writes zip files.
  run(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), ['-a', '-c', '-f', zip, ...files], out);
} else {
  run('zip', ['-r', '-q', zip, ...files], out);
}
if (!existsSync(zip)) throw new Error('zip was not created');
console.log(`\nReady for itch.io: ${zip} (${(statSync(zip).size / 1024 / 1024).toFixed(1)} MB)`);
