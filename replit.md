# Minecraft Bot System

## Overview

This is a Minecraft bot management system built with Node.js and the Mineflayer library. The system manages multiple specialized bots that connect to Minecraft servers to perform various automated tasks including AFK prevention, resource gathering, and chunk destruction. All bots share a centralized server configuration and run as independent Express.js services on different ports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Architecture Pattern

The system uses a **multi-bot microservice pattern** where each bot runs as an independent Node.js process with its own Express server. This design allows:

- Independent bot operation and lifecycle management
- Isolation of bot failures (one bot crash doesn't affect others)
- Easy scaling by adding new bot instances
- Per-bot configuration while sharing common server settings

**Rationale**: Running multiple bots as separate processes prevents a single bot failure from taking down the entire system. Each bot can be started, stopped, and monitored independently.

### Bot Types and Responsibilities

1. **AFK Bot** (`index.js`, port 3000)
   - Prevents AFK kicks through realistic player simulation
   - Sends periodic chat messages
   - Primary use: Keeping player presence active on servers

2. **Gather Bots** (5 instances, ports 8000-9000)
   - Autonomous resource collection and delivery
   - Pathfinding and navigation
   - Equipment management and hostile mob avoidance
   - Each instance uses different exploration seeds for area distribution

3. **Chunk Destroyer Bot** (`chunk-destroyer-bot.js`, port 6000)
   - Command-triggered chunk (16x16 area) destruction
   - Activated via in-game chat codeword system

**Design Decision**: Multiple gather bot instances with different seeds ensure efficient resource distribution across the game world without overlap or competition between bots.

### Configuration Management

**Centralized Server Config** (`server-config.json`):
- Single source of truth for server connection details (IP, port, version)
- Shared item chest coordinates for all gather bots
- Eliminates configuration duplication and reduces maintenance

**Per-Bot Settings** (`settings.json`, `gather-settings-*.json`):
- Bot-specific authentication credentials
- Individual bot behavior customization
- Auto-authentication and reconnection policies

**Shared Resource Definitions** (`blocks-needed.json`):
- Centralized list of resources to gather
- Consistent targeting across all gather bots

**Pros**: Centralized config reduces errors and simplifies multi-bot coordination
**Cons**: Requires coordination when changing server settings across running instances

### Mineflayer Plugin System

The bots use the **Mineflayer pathfinder plugin** for navigation and movement:

- Handles complex pathfinding calculations
- Manages movement physics and collision detection
- Provides goal-based navigation (GoalBlock, GoalNear)

**Why Pathfinder**: Minecraft world navigation is complex with varying terrain, obstacles, and physics. The pathfinder plugin abstracts this complexity and provides reliable bot movement.

### Authentication Strategy

Supports multiple authentication types:
- Mojang/Microsoft accounts
- Offline/cracked server mode
- Optional auto-authentication for login security plugins

**Design**: Flexible authentication allows the system to work with both official and community servers with varying security requirements.

### Anti-Detection Features

The AFK bot implements **realistic player simulation**:
- Random movements (jumping, looking around, sprinting)
- Natural timing variations
- Chat message intervals
- Position-based movements

**Purpose**: Server anti-AFK systems detect patterns. Randomization and realistic behavior help bots avoid detection and automated kicks.

### State Management

Bots use **promise-based sequential execution** for task management:
- Pending promise chain prevents action conflicts
- Ensures operations complete before starting new tasks
- Handles asynchronous Minecraft server responses

**Alternative Considered**: Event-driven state machines were considered but promise chains provide simpler code flow for sequential bot actions.

### Health Monitoring

Each bot runs an **Express.js health check endpoint**:
- Simple HTTP GET returns bot status
- Enables external monitoring and orchestration
- Different ports allow independent monitoring

**Use Case**: External systems (like Replit always-on or monitoring tools) can ping these endpoints to verify bot status and trigger restarts if needed.

## External Dependencies

### Core Libraries

**Mineflayer** (v4.3.0)
- Primary Minecraft bot framework
- Handles protocol communication with Minecraft servers
- Provides bot lifecycle and event management
- Supports Minecraft versions 1.8 through 1.21.3

**mineflayer-pathfinder** (v2.1.1)
- Navigation and pathfinding plugin
- A* algorithm for optimal path calculation
- Movement physics simulation

**mineflayer-collectblock** (v1.3.0)
- Automated block collection
- Tool management for gathering
- Used by gather bots for resource collection

### Supporting Libraries

**Express.js** (v4.18.1)
- Lightweight HTTP server for health checks
- Each bot instance runs independent Express server
- Enables external monitoring and status endpoints

**minecraft-data**
- Version-specific Minecraft game data
- Block types, item IDs, and game mechanics
- Loaded dynamically based on server version

### Minecraft Server Connection

**Target Server**: AstroHardSurvival.aternos.me:53491
- Version: 1.12.1
- Authentication: Mojang (offline mode capable)
- Shared across all bot instances

**Item Storage**: Centralized chest at coordinates (151, 69, -37)
- All gather bots deposit collected resources here
- Configurable via `server-config.json`

### Authentication Services

**@azure/msal-node** & **@xboxreplay/xboxlive-auth**
- Microsoft/Xbox Live authentication support
- Required for online-mode servers with Microsoft accounts
- Optional dependency based on authentication type

### Runtime Environment

**Node.js**: JavaScript runtime
- Required for all bot execution
- Provides event loop for asynchronous Minecraft protocol handling

**npm**: Package management
- Dependency installation and version management