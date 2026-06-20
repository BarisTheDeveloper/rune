# Rune Studio Plugin

Modern Roblox Studio plugin for bidirectional synchronization with the Rune CLI.

## Features

- **Modern Dark UI** - VS Code-inspired interface with clean design
- **File Tree Visualization** - Browse synced folders and files with icons
- **WebSocket Connection** - Real-time sync with Rune CLI
- **Bidirectional Sync** - Changes in Studio reflect on filesystem and vice versa
- **Auto-Reconnect** - Automatic reconnection with exponential backoff
- **Status Indicators** - Visual connection and sync state

## Installation

### Method 1: Rojo (Recommended for Development)

1. Install [Rojo](https://rojo.space/)
2. Run `rojo build plugin/default.project.json -o RunePlugin.rbxm`
3. Place `RunePlugin.rbxm` in your Roblox Studio plugins folder:
   - Windows: `%LOCALAPPDATA%\Roblox\Plugins\`
   - Mac: `~/Documents/Roblox/Plugins/`

### Method 2: Manual Installation

1. Create a new LocalScript in `StarterPlayerScripts`
2. Copy the contents of `src/main.server.lua`
3. Create the module structure under the script
4. Restart Roblox Studio

## Usage

1. Open Roblox Studio
2. Click the **Rune** button in the Plugins toolbar
3. The Rune Sync panel will appear on the right side
4. Enter the host (default: `localhost`) and port (default: `34872`)
5. Click **Connect**
6. Start `rune watch` or `rune sync` in your project directory

## UI Components

### Main Window

- Dockable panel that persists between Studio sessions
- Collapsible and resizable

### Connection Bar

- Host and port input fields
- Connect/Disconnect button with color feedback

### File Tree

- Hierarchical view of synced Roblox services
- Icons for different instance types:
  - 📁 Folder
  - ⚡ Script
  - 👤 LocalScript
  - 📦 ModuleScript
  - 🧊 Model/Part
  - 📄 Other

### Status Bar

- Connection state indicator (colored dot)
- Sync status messages

## Architecture

```
plugin/
├── src/
│   ├── main.server.lua      # Plugin entry point
│   ├── ui/
│   │   ├── MainWindow.lua   # Main dockable panel
│   │   ├── FileTree.lua     # File tree visualization
│   │   └── StatusBar.lua    # Bottom status bar
│   ├── sync/
│   │   ├── WebSocketClient.lua  # WebSocket connection
│   │   └── InstanceSync.lua     # Instance synchronization
│   └── utils/
│       └── Theme.lua        # UI theme and colors
├── default.project.json     # Rojo project file
└── README.md
```

## Supported Instance Types

- Folder
- Script / LocalScript / ModuleScript
- Model / Part / MeshPart / UnionOperation
- Decal / Texture
- Sound / Animation
- ScreenGui / Frame / TextLabel / TextButton / ImageLabel / ImageButton
- Value objects (IntValue, StringValue, BoolValue, etc.)
- Configuration

## Protocol

The plugin communicates with Rune CLI via WebSocket using JSON messages:

```json
{
  "type": "full_sync",
  "data": {
    "instances": [...],
    "count": 18
  }
}
```

Message types:

- `request_sync` - Request full sync from server
- `full_sync` - Complete instance tree
- `instance_created` - New instance added
- `instance_updated` - Instance modified
- `instance_deleted` - Instance removed
- `instance_moved` - Instance reparented
- `instance_renamed` - Instance renamed
- `property_changed` - Property updated
- `script_source` - Script source code updated
- `sync_complete` - Sync operation finished
- `error` - Error message

## Development

To modify the plugin:

1. Clone the Rune repository
2. Edit files in `plugin/src/`
3. Build with Rojo: `rojo build plugin/default.project.json -o RunePlugin.rbxm`
4. Reload the plugin in Studio (Plugins > Manage Plugins > Reload)

## License

MIT - See main Rune repository for details.
