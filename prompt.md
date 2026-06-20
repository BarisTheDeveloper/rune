# Rune - Modern Roblox Development Toolkit

Create a complete open-source CLI application called **Rune**.

Rune is a modern alternative to Rojo and aims to become the primary bridge between the local filesystem and Roblox Studio.

## Core Vision

Rune should allow Roblox developers to work entirely inside VS Code while keeping Roblox Studio synchronized in real time.

The synchronization must be bidirectional:

- Filesystem → Roblox Studio
- Roblox Studio → Filesystem

Rune should support both Luau and Roblox-TS.

The first release should focus on Luau support.

---

# Tech Stack

- Language: TypeScript
- Runtime: Node.js
- CLI: Commander
- File Watching: Chokidar
- Networking: WebSocket
- Configuration: JSON
- Package Manager: pnpm

---

# CLI Commands

## rune init

Creates a new Rune project.

Example:

```bash
rune init
```

Generates:

```txt
src/
├─ Workspace/
├─ Players/
├─ Lighting/
├─ MaterialService/
├─ ReplicatedFirst/
├─ ReplicatedStorage/
├─ ServerScriptService/
├─ ServerStorage/
├─ StarterGui/
├─ StarterPack/
├─ StarterPlayer/
│  ├─ StarterCharacterScripts/
│  └─ StarterPlayerScripts/
├─ SoundService/
├─ Teams/
├─ TextChatService/
├─ Chat/
└─ LocalizationService/

rune.json
```

---

## rune watch

Starts file watching.

Example:

```bash
rune watch
```

Features:

- Watches all project files
- Detects creation, modification and deletion
- Sends updates to Roblox Studio through WebSocket
- Supports hot synchronization

Output example:

```txt
[RUNE] Studio Connected
[RUNE] File Changed:
src/ReplicatedStorage/Inventory.module.lua

[RUNE] Sync Complete
```

---

## rune sync

Starts synchronization server.

Example:

```bash
rune sync
```

Responsibilities:

- Launch WebSocket server
- Accept Studio connections
- Synchronize Explorer hierarchy
- Synchronize instances
- Synchronize properties
- Synchronize scripts

---

## rune build

Builds a Roblox place file.

Example:

```bash
rune build
```

Output:

```txt
dist/
└─ Game.rbxlx
```

Future support:

```bash
rune build --upload
```

for Roblox Open Cloud publishing.

---

# Configuration

Rune should use a simple configuration file.

Example:

```json
{
  "name": "REALISM",

  "syncPort": 34872,

  "folders": {
    "Workspace": "src/Workspace",
    "ReplicatedStorage": "src/ReplicatedStorage",
    "ServerScriptService": "src/ServerScriptService",
    "StarterGui": "src/StarterGui"
  }
}
```

Configuration must be human-readable and simpler than Rojo project files.

---

# Script Detection

Rune must automatically determine Roblox script types from file names.

Supported:

```txt
Inventory.module.lua
```

→ ModuleScript

```txt
Main.server.lua
```

→ Script

```txt
HUD.client.lua
```

→ LocalScript

Future support:

```txt
Inventory.module.ts
Main.server.ts
HUD.client.ts
```

---

# Supported Roblox Objects

Rune must support synchronization of:

- Folder
- Script
- LocalScript
- ModuleScript
- Model
- Part
- MeshPart
- UnionOperation
- Decal
- Texture
- Sound
- Animation
- UI Instances
- Attributes
- Tags
- Values
- Configuration objects

---

# Model Synchronization

Support:

```txt
.rbxm
.rbxmx
```

Example:

```txt
ReplicatedStorage/
└─ AK47.rbxm
```

Must become:

```txt
ReplicatedStorage
└─ AK47
```

inside Roblox Studio.

---

# Instance Definition Files

Rune should support object definition files.

Example:

```json
{
  "ClassName": "Part",
  "Name": "Spawn",
  "Properties": {
    "Anchored": true,
    "CanCollide": true
  }
}
```

This should generate the equivalent Roblox instance.

---

# Bidirectional Sync

This is a major feature.

When a developer:

- renames an object in Studio
- moves an object in Studio
- deletes an object in Studio

Rune should update the filesystem.

Example:

Studio:

```txt
AK47
```

renamed to:

```txt
M4A1
```

Filesystem should automatically update.

---

# Architecture

Create a modular architecture:

```txt
src/
├─ cli/
├─ commands/
├─ sync/
├─ studio/
├─ filesystem/
├─ config/
├─ build/
├─ models/
├─ websocket/
└─ utils/
```

---

# Future Roadmap

Design the architecture so future versions can support:

- Roblox-TS
- Automatic rbxtsc execution
- Open Cloud deployment
- Plugin marketplace
- Asset pipeline
- Package management
- Team synchronization
- Live collaboration
- Studio plugin auto-installation

---

# Goal

Rune should feel like:

Rojo + rbxtsc (LATER WILL BE ADDED. NOW WE WILL GO WITH LUAU) + Live Sync + Roblox Project Management

inside a single tool.

Focus heavily on clean architecture, scalability, performance, and maintainability.
