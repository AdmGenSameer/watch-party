# Graph Report - jellyfin  (2026-10-26)

## Corpus Check
- 62 files · ~26,557 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 513 nodes · 918 edges · 30 communities (22 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `56442f22`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- jellyfinApi.ts
- useWatchPartyStore.ts
- Jellyfin.Plugin.WatchParty.Models
- ChatMessageEntity
- WatchPartyRoomDto
- dependencies
- devDependencies
- Plugin
- compilerOptions
- compilerOptions
- WatchPartyRoom
- VoiceService
- WatchPartyWebSocketService
- WatchPartyManager
- IWatchPartyRoom
- WatchPartyMember
- RoomPermissions
- Jellyfin.Plugin.WatchParty
- CollectionGrid.tsx
- mockData.ts
- .GetActiveRooms
- jellyfinApiSdk.ts
- tsconfig.json
- build_plugin.sh
- 🎬 Jellyfin Watch Party & Tokoshan Cinema UI
- plugins
- React + TypeScript + Vite
- rules/graphify.md
- workflows/graphify.md

## God Nodes (most connected - your core abstractions)
1. `IWatchPartyRoom` - 29 edges
2. `useAuthStore` - 26 edges
3. `WatchPartyService` - 23 edges
4. `WatchPartyRoom` - 22 edges
5. `VoiceService` - 22 edges
6. `WatchPartyRoomDto` - 20 edges
7. `ChatMessageEntity` - 18 edges
8. `compilerOptions` - 18 edges
9. `WatchPartyMember` - 16 edges
10. `react` - 16 edges

## Surprising Connections (you probably didn't know these)
- `WatchPartyController` --references--> `IChatService`  [EXTRACTED]
  Jellyfin.Plugin.WatchParty/Controllers/WatchPartyController.cs → Jellyfin.Plugin.WatchParty/Data/IChatService.cs
- `WatchPartyController` --references--> `IWatchPartyManager`  [EXTRACTED]
  Jellyfin.Plugin.WatchParty/Controllers/WatchPartyController.cs → Jellyfin.Plugin.WatchParty/Services/IWatchPartyManager.cs
- `WatchPartyController` --references--> `IWatchPartyWebSocketService`  [EXTRACTED]
  Jellyfin.Plugin.WatchParty/Controllers/WatchPartyController.cs → Jellyfin.Plugin.WatchParty/Services/WatchPartyWebSocketService.cs
- `WatchPartyWebSocketService` --references--> `IChatService`  [EXTRACTED]
  Jellyfin.Plugin.WatchParty/Services/WatchPartyWebSocketService.cs → Jellyfin.Plugin.WatchParty/Data/IChatService.cs
- `CreateRoomRequest` --references--> `RoomPermissions`  [EXTRACTED]
  Jellyfin.Plugin.WatchParty/Models/CreateRoomRequest.cs → Jellyfin.Plugin.WatchParty/Models/RoomPermissions.cs

## Import Cycles
- None detected.

## Communities (30 total, 7 thin omitted)

### Community 0 - "jellyfinApi.ts"
Cohesion: 0.11
Nodes (49): App(), BentoCard(), BentoCardProps, DetailModal(), DetailModalProps, MovieData, Login(), Navbar() (+41 more)

### Community 1 - "useWatchPartyStore.ts"
Cohesion: 0.08
Nodes (26): ChatPanel(), QUICK_EMOJIS, ReactionOverlay(), formatStreamTitle(), QUALITY_PRESETS, QualityPreset, VideoQuality, WatchPartyPlayer() (+18 more)

### Community 2 - "Jellyfin.Plugin.WatchParty.Models"
Cohesion: 0.06
Nodes (21): Assembly, ControllerBase, Jellyfin.Plugin.WatchParty.Services, Jellyfin.Plugin.WatchParty.Controllers, Jellyfin.Plugin.WatchParty.Models, HttpGet, IActionResult, SpaController (+13 more)

### Community 3 - "ChatMessageEntity"
Cohesion: 0.10
Nodes (26): Jellyfin.Plugin.WatchParty.Data, DateTime, Guid, ChatMessageEntity, CreatedAt, Emoji, Id, Message (+18 more)

### Community 4 - "WatchPartyRoomDto"
Cohesion: 0.10
Nodes (23): ActionResult, AllowAnonymous, HttpDelete, HttpPost, CancellationToken, Guid, HttpGet, IActionResult (+15 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (33): @fontsource/bebas-neue, @fontsource/dm-sans, framer-motion, hls.js, jellyfin-apiclient, dependencies, @fontsource/bebas-neue, @fontsource/dm-sans (+25 more)

### Community 6 - "devDependencies"
Cohesion: 0.08
Nodes (24): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+16 more)

### Community 7 - "Plugin"
Cohesion: 0.09
Nodes (20): BasePlugin, BasePluginConfiguration, Jellyfin.Plugin.WatchParty, IEnumerable, IHasWebPages, IPluginServiceRegistrator, Guid, Plugin (+12 more)

### Community 8 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 10 - "WatchPartyRoom"
Cohesion: 0.12
Nodes (14): ConcurrentDictionary, Guid, IReadOnlyList, WatchPartyRoom, CurrentItemId, HostId, InviteCode, IsPaused (+6 more)

### Community 12 - "WatchPartyWebSocketService"
Cohesion: 0.22
Nodes (12): IServerApplicationHost, IServiceCollection, CancellationToken, ConcurrentDictionary, Guid, ILogger, Task, IWatchPartyWebSocketService (+4 more)

### Community 13 - "WatchPartyManager"
Cohesion: 0.26
Nodes (5): Guid, IWatchPartyManager, ConcurrentDictionary, Guid, WatchPartyManager

### Community 14 - "IWatchPartyRoom"
Cohesion: 0.15
Nodes (13): Guid, IReadOnlyList, IWatchPartyRoom, CurrentItemId, HostId, InviteCode, IsPaused, Members (+5 more)

### Community 15 - "WatchPartyMember"
Cohesion: 0.17
Nodes (11): DateTime, Guid, WatchPartyMember, AvatarUrl, ClockOffsetMs, DisplayName, IsBuffering, IsHost (+3 more)

### Community 16 - "RoomPermissions"
Cohesion: 0.22
Nodes (9): RoomPermissions, AllowInviteLinks, Default, MasterControlPlayPause, MasterControlSeek, MembersCanAddToQueue, MembersCanChat, MembersCanReact (+1 more)

### Community 17 - "Jellyfin.Plugin.WatchParty"
Cohesion: 0.33
Nodes (5): net9.0, Jellyfin.Plugin.WatchParty, Jellyfin.Controller (10.11.11), Jellyfin.Model (10.11.11), Microsoft.NET.Sdk

### Community 18 - "CollectionGrid.tsx"
Cohesion: 0.40
Nodes (4): CollectionCard(), CollectionCardProps, CollectionGridProps, CollectionItem

### Community 19 - "mockData.ts"
Cohesion: 0.50
Nodes (3): BENTO_DATA, COLLECTIONS_DATA, POSTER_DATA

### Community 25 - "🎬 Jellyfin Watch Party & Tokoshan Cinema UI"
Cohesion: 0.14
Nodes (13): 🌐 Accessing the Interface, Build the Plugin, 💻 Building from Source, ✨ Features, 🧪 Frontend Development Server, 🚀 Installation & Setup, 🎬 Jellyfin Watch Party & Tokoshan Cinema UI, 📄 License (+5 more)

### Community 26 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 27 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **185 isolated node(s):** `Id`, `RoomId`, `UserId`, `UserName`, `Message` (+180 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 241 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IWatchPartyRoom` connect `IWatchPartyRoom` to `Jellyfin.Plugin.WatchParty.Models`, `WatchPartyRoomDto`, `WatchPartyRoom`, `WatchPartyManager`, `WatchPartyMember`, `RoomPermissions`, `.GetActiveRooms`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Jellyfin.Plugin.WatchParty.Services` connect `Jellyfin.Plugin.WatchParty.Models` to `WatchPartyWebSocketService`, `Plugin`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `WatchPartyController` connect `WatchPartyRoomDto` to `Jellyfin.Plugin.WatchParty.Models`, `ChatMessageEntity`, `WatchPartyWebSocketService`, `WatchPartyManager`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `Id`, `RoomId`, `UserId` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `jellyfinApi.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11442307692307692 - nodes in this community are weakly interconnected._
- **Should `useWatchPartyStore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08446455505279035 - nodes in this community are weakly interconnected._
- **Should `Jellyfin.Plugin.WatchParty.Models` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._