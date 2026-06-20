# Rune - Modern Roblox Development Toolkit

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0--beta-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Mac%20%7C%20Linux-lightgrey" alt="Platform">
</p>

**Rune** is a modern open-source CLI application that serves as an alternative to [Rojo](https://rojo.space/). It bridges the gap between your local filesystem and Roblox Studio, enabling real-time bidirectional synchronization.

## Core Vision

Rune allows Roblox developers to work entirely inside **VS Code** while keeping **Roblox Studio** synchronized in real time.

- **Filesystem → Roblox Studio** - File changes instantly reflect in Studio
- **Roblox Studio → Filesystem** - Studio changes sync back to your project files

## Features

- **Real-time File Watching** - Powered by Chokidar for instant change detection
- **WebSocket Synchronization** - Low-latency bidirectional sync with Roblox Studio
- **Script Type Detection** - Automatically determines Roblox script types from filenames
- **Model Support** - Handles `.rbxm` and `.rbxmx` model files
- **Instance Definitions** - JSON-based object definition files for non-script instances
- **Roblox Place Building** - Generate `.rbxlx` files from your project
- **Package Management** - Install Roblox modules, plugins, and dependencies
- **Modern Studio Plugin** - VS Code-inspired UI for Roblox Studio

## Tech Stack

| Component       | Technology     |
| --------------- | -------------- |
| Language        | TypeScript     |
| Runtime         | Node.js        |
| CLI             | Commander      |
| File Watching   | Chokidar       |
| Networking      | WebSocket (ws) |
| Configuration   | JSON           |
| Package Manager | pnpm           |

## Requirements

- **Node.js** 18+ (LTS recommended)
- **pnpm** 11+ (required package manager)

## Installation

```bash
# Clone the repository
git clone https://github.com/BarisTheDeveloper/rune.git
cd rune

# Install dependencies (pnpm required)
pnpm install

# Build the project
npx tsc

# Or on Windows PowerShell:
./node_modules/.bin/tsc.cmd

# Link for global usage (optional)
pnpm link --global .
```

## CLI Commands

### `rune init`

Creates a new Rune project with the default Roblox folder structure.

```bash
rune init
# or
rune init --name MyGame
```

Generates:

```
src/
├── Workspace/
├── Players/
├── Lighting/
├── MaterialService/
├── ReplicatedFirst/
├── ReplicatedStorage/
├── ServerScriptService/
├── ServerStorage/
├── StarterGui/
├── StarterPack/
├── StarterPlayer/
│   ├── StarterCharacterScripts/
│   └── StarterPlayerScripts/
├── SoundService/
├── Teams/
├── TextChatService/
├── Chat/
└── LocalizationService/

rune.json
```

### `rune watch`

Starts file watching and hot synchronization with Roblox Studio.

```bash
rune watch
# or
rune watch --port 34872
```

Features:

- Watches all project files
- Detects creation, modification, and deletion
- Sends updates to Roblox Studio through WebSocket
- Supports hot synchronization

### `rune sync`

Starts the synchronization server for Roblox Studio connections.

```bash
rune sync
# or
rune sync --port 34872
```

Responsibilities:

- Launches WebSocket server
- Accepts Studio connections
- Synchronizes Explorer hierarchy
- Synchronizes instances, properties, and scripts

### `rune build`

Builds a Roblox place file from your project files.

```bash
rune build
# or
rune build --output ./dist
```

Output:

```
dist/
└── Game.rbxlx
```

Future support:

```bash
rune build --upload  # Roblox Open Cloud publishing
```

### `rune install`

Installs Roblox packages, modules, or the Rune Studio plugin.

```bash
# Install the Rune Studio Plugin locally
rune install rune-plugin

# Install globally (Roblox Plugins folder)
rune install -g rune-plugin

# Install from GitHub
rune install user/repo

# Install all dependencies from rune.json
rune install

# Install as dev dependency
rune install package-name --dev
```

## Configuration

Rune uses a simple `rune.json` configuration file:

```json
{
  "name": "MyRobloxGame",
  "syncPort": 34872,
  "folders": {
    "Workspace": "src/Workspace",
    "ReplicatedStorage": "src/ReplicatedStorage",
    "ServerScriptService": "src/ServerScriptService",
    "StarterGui": "src/StarterGui"
  },
  "ignore": ["**/*.spec.lua", "**/*.test.lua"]
}
```

## Script Detection

Rune automatically determines Roblox script types from file names:

| Filename               | Script Type  |
| ---------------------- | ------------ |
| `Inventory.module.lua` | ModuleScript |
| `Main.server.lua`      | Script       |
| `HUD.client.lua`       | LocalScript  |

Future support for TypeScript:

- `Inventory.module.ts`
- `Main.server.ts`
- `HUD.client.ts`

## Supported Roblox Objects

- **Containers**: Folder, Workspace, Players, Lighting, etc.
- **Scripts**: Script, LocalScript, ModuleScript
- **Geometry**: Part, MeshPart, UnionOperation, Model
- **Visuals**: Decal, Texture
- **Audio**: Sound, Animation
- **UI**: ScreenGui, Frame, TextLabel, TextButton, ImageLabel, ImageButton
- **Values**: IntValue, StringValue, BoolValue, NumberValue, Color3Value, Vector3Value
- **Other**: Configuration, Attributes, Tags

## Model Synchronization

Rune supports `.rbxm` and `.rbxmx` model files:

```
ReplicatedStorage/
└── AK47.rbxm
```

Becomes in Roblox Studio:

```
ReplicatedStorage
└── AK47
```

## Instance Definition Files

Create JSON files to define non-script instances:

```json
{
  "ClassName": "Part",
  "Name": "Spawn",
  "Properties": {
    "Anchored": true,
    "CanCollide": true,
    "Size": [4, 1, 4]
  },
  "Attributes": {
    "Team": "Blue"
  },
  "Tags": ["spawn", "safe-zone"]
}
```

## Rune Studio Plugin

The Rune Studio Plugin provides a modern UI for managing synchronization within Roblox Studio.

### Installation

```bash
# Install via CLI
rune install -g rune-plugin

# Or build manually with Rojo
rojo build plugin/default.project.json -o RunePlugin.rbxm
```

### Features

- **Modern Dark UI** - VS Code-inspired interface
- **File Tree Visualization** - Browse synced folders with icons
- **WebSocket Connection** - Real-time sync with Rune CLI
- **Bidirectional Sync** - Changes in Studio reflect on filesystem
- **Auto-Reconnect** - Automatic reconnection with exponential backoff
- **Status Indicators** - Visual connection and sync state

## Architecture

```
src/
├── cli/           # CLI entry point
├── commands/      # Command implementations
│   ├── init.ts
│   ├── watch.ts
│   ├── sync.ts
│   ├── build.ts
│   └── install.ts
├── sync/          # Synchronization engine
├── studio/        # Studio communication
├── filesystem/    # File watching
├── config/        # Configuration management
├── build/         # Place file generation
├── models/        # Data models
│   ├── instance-tree.ts
│   └── roblox-instance.ts
├── websocket/     # WebSocket server
├── utils/         # Utilities
└── types/         # TypeScript definitions

plugin/
├── src/
│   ├── main.server.lua
│   ├── ui/
│   │   ├── MainWindow.lua
│   │   ├── FileTree.lua
│   │   └── StatusBar.lua
│   ├── sync/
│   │   ├── WebSocketClient.lua
│   │   └── InstanceSync.lua
│   └── utils/
│       └── Theme.lua
└── default.project.json
```

## Future Roadmap

- [ ] Roblox-TS support
- [ ] Automatic `rbxtsc` execution
- [ ] Open Cloud deployment (`rune build --upload`)
- [ ] Plugin marketplace
- [ ] Asset pipeline
- [ ] Package management enhancements
- [ ] Team synchronization
- [ ] Live collaboration
- [ ] Studio plugin auto-installation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [Rojo](https://rojo.space/) by LPghatan
- Built for the Roblox developer community

---

<p align="center">
  Made with ❤️ for Roblox developers
</p>
