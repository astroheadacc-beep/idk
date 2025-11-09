# Minecraft Bot System

## Overview
You now have 7 different bots ready to use! All bots use the universal `server-config.json` file for server settings.

---

## 🌐 Universal Configuration

**File: `server-config.json`**
- Change server IP, port, and version here
- Change item chest location here (currently: 151, 69, -37)
- All bots will use these settings automatically

---

## 🤖 Bot 1: AFK Bot (index.js)
**Status:** ✅ CURRENTLY RUNNING
**Port:** 3000
**Username:** AFKBot

### Features:
- Prevents AFK kicks with realistic movements
- Jumps, looks around, walks randomly, sprints
- Sends chat messages every 60 seconds
- Auto-reconnects if kicked/disconnected

### Configuration:
Edit `settings.json` to customize:
- Chat messages
- Chat message delay
- Enable/disable anti-afk movements
- Enable auto-auth with password

---

## 💣 Bot 2: Chunk Destroyer (chunk-destroyer-bot.js)
**Status:** Ready to start manually
**Port:** 6000
**Username:** ChunkDestroyer
**Codeword:** `destroychunk`

### How to Use:
1. Start this bot (run: `node chunk-destroyer-bot.js`)
2. In Minecraft, stand in the chunk you want destroyed
3. Type in chat: `destroychunk`
4. The bot will destroy all blocks in that chunk (16x16 area)
5. Type `stop` to cancel destruction

### Features:
- Destroys entire chunks on command
- Listens for the codeword in chat
- Can be stopped mid-destruction
- Automatically equips best tools

---

## 📦 Bots 3-7: Gather Bots (gather-bot.js, gather-bot-2.js, etc.)
**Status:** Ready to start when equipped
**Usernames:** GatherBot, GatherBot2, GatherBot3, GatherBot4, GatherBot5
**Ports:** 8000, 8008, 8080, 8099, 9000

### IMPORTANT - Equipment Required:
Before gathering, each bot needs these items from the chest at (151, 69, -37):
- ✅ Diamond Axe
- ✅ Diamond Pickaxe
- ✅ Shield
- ✅ 64+ Food (any type: beef, pork, chicken, bread, etc.)

### How to Start a Gather Bot:
1. Put required items in the chest at 151, 69, -37
2. Start the bot: `node gather-bot.js` (or gather-bot-2.js, etc.)
3. Bot will automatically:
   - Go to chest
   - Collect equipment
   - Start gathering blocks from `blocks-needed.json`
   - Defend itself from hostile mobs
   - Deliver items to Astro1540 when done

### Features:
- **Seed-based exploration** - Each bot has a different seed
- **Auto-defense** - Attacks nearby hostile mobs
- **Smart mining** - Uses best tools
- **Auto-delivery** - Brings items to Astro1540
- **Safety checks** - Won't start without proper equipment

### Configuration Files:
- `gather-settings.json` - GatherBot 1 (seed: 12345)
- `gather-settings-2.json` - GatherBot 2 (seed: 22222)
- `gather-settings-3.json` - GatherBot 3 (seed: 33333)
- `gather-settings-4.json` - GatherBot 4 (seed: 44444)
- `gather-settings-5.json` - GatherBot 5 (seed: 55555)

### What Blocks to Gather:
Edit `blocks-needed.json`:
```json
{
  "blocks": [
    {
      "name": "oak_log",
      "amount": 64
    },
    {
      "name": "cobblestone",
      "amount": 128
    }
  ]
}
```

Block names must match Minecraft's internal names (e.g., `oak_log`, `cobblestone`, `dirt`, `stone`, `iron_ore`)

---

## 🚀 Quick Start Guide

### Start the AFK Bot:
Already running! It will keep you from being kicked.

### Start the Chunk Destroyer:
```bash
node chunk-destroyer-bot.js
```
Then in Minecraft chat, type: `destroychunk`

### Start a Gather Bot:
1. Put equipment in chest (151, 69, -37)
2. Run:
```bash
node gather-bot.js
```

### Start All 5 Gather Bots at Once:
```bash
node gather-bot.js &
node gather-bot-2.js &
node gather-bot-3.js &
node gather-bot-4.js &
node gather-bot-5.js &
```

---

## 📝 Important Notes

1. **Server must be online** - Make sure your Aternos server is running
2. **Equipment first** - Gather bots won't work without equipment
3. **Different seeds** - Each gather bot explores different areas
4. **Chest location** - Default is 151, 69, -37 (change in `server-config.json`)
5. **Player delivery** - Bots deliver to "Astro1540" (change in gather-settings files)

---

## 🛠️ Troubleshooting

**Bot won't connect:**
- Check if server is online
- Verify IP/port in `server-config.json`

**Gather bot won't start gathering:**
- Check if chest has all required items
- Check console logs for missing equipment

**Chunk destroyer not responding:**
- Make sure you typed the exact codeword: `destroychunk`
- Bot must be able to see you in-game

---

## 📋 File Summary

**Config Files:**
- `server-config.json` - Universal server settings
- `settings.json` - AFK bot config
- `gather-settings.json` through `gather-settings-5.json` - Gather bot configs
- `blocks-needed.json` - What blocks to gather

**Bot Files:**
- `index.js` - AFK Bot
- `chunk-destroyer-bot.js` - Chunk Destroyer
- `gather-bot.js` through `gather-bot-5.js` - 5 Gather Bots
