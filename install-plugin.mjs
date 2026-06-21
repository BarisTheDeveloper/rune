import { buildRbxmx } from './dist/utils/rbxmx-builder.js';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const pluginPath = buildRbxmx('./plugin/src', './test-output/RunePlugin.rbxmx', 'RunePlugin');

// Roblox Plugins klasörü
const robloxPlugins = join(homedir(), 'AppData', 'Local', 'Roblox', 'Plugins');
if (!existsSync(robloxPlugins)) {
  mkdirSync(robloxPlugins, { recursive: true });
}

const destPath = join(robloxPlugins, 'RunePlugin.rbxmx');
copyFileSync(pluginPath, destPath);
console.log('Installed to:', destPath);

// Also copy to repo root for GitHub Releases
copyFileSync(pluginPath, './RunePlugin.rbxmx');
console.log('Repo copy: ./RunePlugin.rbxmx');
