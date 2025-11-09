const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const serverConfig = require('./server-config.json');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Chunk Destroyer Bot is running');
});

app.listen(6000, () => {
  console.log('Chunk Destroyer Bot server started on port 6000');
});

const CODEWORD = "destroychunk";

function createDestroyerBot() {
   const bot = mineflayer.createBot({
      username: "ChunkDestroyer",
      password: "",
      auth: "mojang",
      host: serverConfig.server.ip,
      port: serverConfig.server.port,
      version: serverConfig.server.version,
   });

   bot.loadPlugin(pathfinder);
   const mcData = require('minecraft-data')(bot.version);
   const defaultMove = new Movements(bot, mcData);
   bot.settings.colorsEnabled = false;

   let isDestroying = false;
   let playerPosition = null;

   async function destroyChunk(chunkX, chunkZ) {
      console.log(`[Destroyer] Starting to destroy chunk at ${chunkX}, ${chunkZ}`);
      bot.chat(`Starting chunk destruction! This will take a while...`);
      
      isDestroying = true;
      let blocksDestroyed = 0;

      const startX = chunkX * 16;
      const startZ = chunkZ * 16;
      
      try {
         for (let y = playerPosition.y + 5; y >= Math.max(playerPosition.y - 10, 1); y--) {
            for (let x = startX; x < startX + 16; x++) {
               for (let z = startZ; z < startZ + 16; z++) {
                  if (!isDestroying) {
                     console.log('[Destroyer] Destruction cancelled');
                     return;
                  }

                  const block = bot.blockAt({ x, y, z });
                  
                  if (block && block.name !== 'air' && block.name !== 'bedrock') {
                     try {
                        bot.pathfinder.setMovements(defaultMove);
                        const goal = new GoalBlock(x, y, z);
                        bot.pathfinder.setGoal(goal);

                        await new Promise((resolve, reject) => {
                           const timeout = setTimeout(() => resolve(), 5000);
                           bot.once('goal_reached', () => {
                              clearTimeout(timeout);
                              resolve();
                           });
                        });

                        if (bot.entity.position.distanceTo({ x, y, z }) > 6) {
                           continue;
                        }

                        const tool = bot.pathfinder.bestHarvestTool(block);
                        if (tool) {
                           await bot.equip(tool, 'hand');
                        }

                        await bot.dig(block);
                        blocksDestroyed++;

                        if (blocksDestroyed % 50 === 0) {
                           console.log(`[Destroyer] Destroyed ${blocksDestroyed} blocks...`);
                        }
                     } catch (err) {
                        console.log(`[Destroyer] Error mining block at ${x}, ${y}, ${z}: ${err.message}`);
                     }
                  }
               }
            }
         }

         bot.chat(`Chunk destruction complete! Destroyed ${blocksDestroyed} blocks.`);
         console.log(`[Destroyer] Finished! Total blocks destroyed: ${blocksDestroyed}`);
      } catch (err) {
         console.log(`[Destroyer] Error: ${err.message}`);
         bot.chat(`Chunk destruction failed: ${err.message}`);
      }

      isDestroying = false;
   }

   bot.on('chat', (username, message) => {
      if (username === bot.username) return;

      console.log(`[Chat] <${username}> ${message}`);

      if (message.toLowerCase() === CODEWORD) {
         const player = bot.players[username];
         
         if (!player || !player.entity) {
            bot.chat(`${username}, I can't see you! Get closer to me.`);
            return;
         }

         if (isDestroying) {
            bot.chat(`Already destroying a chunk! Type 'stop' to cancel.`);
            return;
         }

         playerPosition = player.entity.position.floored();
         const chunkX = Math.floor(playerPosition.x / 16);
         const chunkZ = Math.floor(playerPosition.z / 16);

         bot.chat(`${username}, destroying chunk at (${chunkX}, ${chunkZ})...`);
         destroyChunk(chunkX, chunkZ);
      }

      if (message.toLowerCase() === 'stop' && isDestroying) {
         bot.chat('Stopping chunk destruction...');
         isDestroying = false;
         bot.pathfinder.setGoal(null);
      }
   });

   bot.once('spawn', () => {
      console.log('\x1b[33m[ChunkDestroyer] Bot joined the server', '\x1b[0m');
      bot.pathfinder.setMovements(defaultMove);
      bot.chat(`Chunk Destroyer ready! Type '${CODEWORD}' to destroy the chunk you're standing in.`);
   });

   bot.on('death', () => {
      console.log(`\x1b[33m[ChunkDestroyer] Bot has died\x1b[0m`);
      isDestroying = false;
   });

   bot.on('end', () => {
      setTimeout(() => {
         createDestroyerBot();
      }, 5000);
   });

   bot.on('kicked', (reason) =>
      console.log('\x1b[33m', `[ChunkDestroyer] Bot was kicked: \n${reason}`, '\x1b[0m')
   );

   bot.on('error', (err) =>
      console.log(`\x1b[31m[ERROR] ${err.message}`, '\x1b[0m')
   );
}

createDestroyerBot();
