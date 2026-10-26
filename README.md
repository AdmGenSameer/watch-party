# 🎬 Jellyfin Watch Party & Tokoshan Cinema UI

[![Jellyfin Plugin](https://img.shields.io/badge/Jellyfin-10.11%20Plugin-00a4dc.svg?style=flat-square&logo=jellyfin&logoColor=white)](https://jellyfin.org/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPLv3-22c55e.svg?style=flat-square)](LICENSE)
[![Backend: .NET 9](https://img.shields.io/badge/Backend-.NET%209-512bd4.svg?style=flat-square&logo=dotnet&logoColor=white)](Jellyfin.Plugin.WatchParty/)
[![Frontend: React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61dafb.svg?style=flat-square&logo=react&logoColor=black)](jellyfin-netflix-ui/)
[![Voice: WebRTC](https://img.shields.io/badge/Voice%20Chat-WebRTC%20P2P-f97316.svg?style=flat-square&logo=webrtc&logoColor=white)](jellyfin-netflix-ui/src/services/voiceService.ts)

> A drop-in Jellyfin plugin that brings an ultra-clean, Netflix-style cinema experience with built-in sub-100ms synchronized **Watch Parties**, **WebRTC voice chat**, floating emoji reactions, live chat, and room host controls — zero custom server recompilations needed.

---

## ✨ Features

- **🍿 Sub-100ms Synchronized Playback**:
  - Continuous NTP clock drift compensation.
  - Micro-playback rate adjustments (`0.97x`–`1.03x`) for imperceptible drift alignment without stuttering.
  - Hard seek realignment for large position discrepancies ($> 250\text{ms}$).
  - Host controls (`hostOnlyControl`) allowing hosts to lock play/pause/seek controls.

- **🎙️ Low-Latency WebRTC Voice Chat**:
  - Peer-to-peer mesh voice chat directly inside the party room.
  - Real-time Voice Activity Detection (VAD) with active speaker indicators.
  - Push-to-mute/unmute toggles with visual microphone indicators.

- **💬 Real-Time Chat & Floating Reactions**:
  - Live animated emoji bursts (`❤️`, `🔥`, `😂`, `😱`, `👏`, `🍿`, `🚀`, `💀`) with combo multipliers (`x3!`, `x5!`).
  - Integrated chat sidebar with timestamps, member roles, and system event announcements.
  - Fast in-memory chat caching with persistent JSON storage.

- **🎉 Instant Shareable Invite Links**:
  - Auto-generated 6-character room codes (`AB12CD`).
  - 1-click invite link copying (`http://<host>:8096/tokoshan/#/party?join=AB12CD`).
  - Auto-join when navigating to invite links.

- **🎨 Immersive Netflix-Grade Cinema Frontend**:
  - Built with modern, clean UI principles (Linear / Plex aesthetic).
  - Spatial dark mode with ambient backdrop lighting.
  - Hero banner with backdrop teasers, bento grids, and curated shelves.
  - 1-click "Watch Party" button directly on movie & series detail modals.

- **🚀 100% Drop-In Plugin (Zero Server Builds Required)**:
  - Packaged as a clean 2-file zip archive (`Jellyfin.Plugin.WatchParty_1.0.0.zip`).
  - Embeds the compiled SPA directly inside the plugin DLL.
  - Compatible with Jellyfin 10.11+ running on .NET 9.
  - Automatically served by your Jellyfin server at `http://<your-jellyfin-host>:8096/tokoshan/`.

---

## 🚀 Installation & Setup

### Method 1: 1-Click Install via Jellyfin Catalog (Recommended)

1. Open your Jellyfin Web UI &rarr; **Dashboard** &rarr; **Plugins**.
2. Go to the **Repositories** tab &rarr; click **+ Add Repository**.
3. Fill in:
   - **Repository Name:** `WatchParty`
   - **Repository URL:**
     ```text
     https://raw.githubusercontent.com/AdmGenSameer/watch-party/main/manifest.json
     ```
   *(Note: Do NOT enter the github.com webpage URL — Jellyfin requires the raw manifest.json URL)*
4. Click **Save**, then switch to the **Catalog** tab.
5. Click **WatchParty** &rarr; click **Install**.
6. Restart your Jellyfin server or container.

---

### Method 2: Dokploy / Docker Single-Command Install

If your Jellyfin instance is running via **Dokploy** or **Docker**, open the terminal on your server or in the Dokploy Web Terminal and paste:

```bash
mkdir -p /config/plugins/WatchParty_1.0.0.0 && curl -fsSL "https://raw.githubusercontent.com/AdmGenSameer/watch-party/main/Jellyfin.Plugin.WatchParty_1.0.0.zip" -o /tmp/wp.zip && unzip -o /tmp/wp.zip -d /config/plugins/WatchParty_1.0.0.0/ && rm /tmp/wp.zip
```

Then click **Restart** in the Dokploy dashboard.

---

### Method 3: Manual File Copy

1. Download [`Jellyfin.Plugin.WatchParty_1.0.0.zip`](https://raw.githubusercontent.com/AdmGenSameer/watch-party/main/Jellyfin.Plugin.WatchParty_1.0.0.zip).
2. Extract the archive into your Jellyfin `plugins/WatchParty_1.0.0.0/` directory:
   - **Linux:** `/var/lib/jellyfin/plugins/WatchParty_1.0.0.0/`
   - **Docker:** `<config_volume>/plugins/WatchParty_1.0.0.0/`
   - **Windows:** `C:\ProgramData\Jellyfin\Server\plugins\WatchParty_1.0.0.0\`
3. Restart the Jellyfin server.

---

## 🌐 Accessing the Interface

Once installed and Jellyfin has restarted, navigate to:

```text
https://<your-jellyfin-domain-or-ip>:8096/tokoshan
```

You can also access the configuration page via **Dashboard** &rarr; **Plugins** &rarr; **WatchParty**.

---

## 🛠️ Project Architecture

```
├── manifest.json                        # Jellyfin repository manifest for 1-click catalog install
├── Jellyfin.Plugin.WatchParty_1.0.0.zip   # Ready-to-install plugin archive
├── build_plugin.sh                      # Unified build script (React -> .NET -> Zip)
├── WatchParty.slnx                      # .NET solution file
├── Jellyfin.Plugin.WatchParty/          # C# .NET 10 Plugin Backend
│   ├── Controllers/
│   │   ├── SpaController.cs             # Serves embedded SPA at /tokoshan/
│   │   └── WatchPartyController.cs      # REST API for party rooms, state & chat
│   ├── Hubs/
│   │   └── WatchPartyHub.cs             # SignalR real-time synchronization hub
│   ├── Services/
│   │   ├── SyncEngine.cs                # Sub-100ms NTP drift calculation & correction logic
│   │   ├── WatchPartyManager.cs         # In-memory synchronized room manager
│   │   └── WatchPartyRoom.cs            # Room state and member tracking
│   ├── Data/
│   │   ├── WatchPartyDbContext.cs       # EF Core SQLite database context
│   │   ├── ChatService.cs               # Chat persistence service
│   │   └── WatchPartyDbMigrator.cs      # SQLite table migrator
│   ├── Configuration/
│   │   └── config.html                  # Jellyfin Dashboard admin configuration page
│   └── meta.json                        # Plugin metadata
└── jellyfin-netflix-ui/                 # React 19 + TypeScript Frontend
    ├── src/
    │   ├── components/WatchParty/       # Lobby, Theater, Chat, Reactions & Player
    │   ├── services/
    │   │   ├── watchPartyService.ts     # SignalR + WebRTC synchronization engine
    │   │   ├── voiceService.ts          # WebRTC P2P voice chat with VAD
    │   │   └── jellyfinApi.ts           # Jellyfin REST API client
    │   └── store/useWatchPartyStore.ts  # Zustand real-time synchronization store
    └── vite.config.ts                   # Builds bundle directly into Plugin dist/
```

---

## 💻 Building from Source

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet)
- [Node.js 20+](https://nodejs.org/) & `npm`
- Python 3 (for zip packaging)

### Build the Plugin
Run the unified build script:
```bash
chmod +x build_plugin.sh
./build_plugin.sh
```

This will:
1. Compile the React 19 frontend with Vite into `Jellyfin.Plugin.WatchParty/dist/`.
2. Compile and publish the .NET 10 plugin DLL with embedded static assets.
3. Package the final distribution archive: `Jellyfin.Plugin.WatchParty_1.0.0.zip`.

---

## 🧪 Frontend Development Server

To develop or test the frontend with hot module replacement:

```bash
cd jellyfin-netflix-ui
npm install
npm run dev
```

Visit `http://localhost:5173`. You can log in with your Jellyfin server credentials or click **"Explore in Demo Mode"** to test UI features.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. See [LICENSE](LICENSE) for details.
