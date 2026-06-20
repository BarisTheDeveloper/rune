# Rune v0.1.0-beta - Initial Release

## Rune - Modern Roblox Development Toolkit

A modern alternative to Rojo for Roblox development.

### What's Included

#### CLI Application

- `rune init` - Initialize new projects with Roblox folder structure
- `rune watch` - File watching with real-time sync to Roblox Studio
- `rune sync` - WebSocket server for Studio connections
- `rune build` - Build `.rbxlx` place files from project files
- `rune install` - Package manager for Roblox modules and plugins

#### Roblox Studio Plugin

- Modern VS Code-inspired dark UI
- File tree visualization with icons
- WebSocket connection to Rune CLI
- Bidirectional synchronization
- Auto-reconnect with status indicators

### Installation

```bash
# Clone and build
git clone https://github.com/BarisTheDeveloper/rune.git
cd rune
pnpm install
pnpm build

# Install the Studio plugin
rune install -g rune-plugin
```

### Studio Plugin Installation

1. Download `RunePlugin.rbxm` from this release
2. Place in your Roblox Plugins folder:
   - Windows: `%LOCALAPPDATA%\Roblox\Plugins\`
   - Mac: `~/Documents/Roblox/Plugins/`
3. Open Roblox Studio and click the Rune button in the toolbar

### Requirements

- Node.js 18+
- pnpm
- Roblox Studio

### Known Limitations

- TypeScript support is planned for future releases
- Open Cloud upload is not yet implemented
- Package registry is in early stages

---

**Full Changelog**: https://github.com/BarisTheDeveloper/rune/commits/v0.1.0-beta
