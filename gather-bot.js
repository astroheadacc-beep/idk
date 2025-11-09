const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalNear, GoalBlock } = require('mineflayer-pathfinder').goals;

const serverConfig = require('./server-config.json');
const config = require('./gather-settings.json');
const blocksNeeded = require('./blocks-needed.json');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Gather Bot 1 is running');
});

app.listen(8000, () => {
  console.log('Gather Bot 1 server started on port 8000');
});

function createGatherBot() {
   const bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: serverConfig.server.ip,
      port: serverConfig.server.port,
      version: serverConfig.server.version,
   });

   bot.loadPlugin(pathfinder);
   
   const mcData = require('minecraft-data')(bot.version);
   const defaultMove = new Movements(bot, mcData);
   bot.settings.colorsEnabled = false;

   let currentTask = null;
   let currentExplorationPoint = null;
   let seedRandom = null;
   let hasEquipment = false;
   let currentTarget = null;
   const targetPlayer = config['deliver-to']['player-name'];
   const chestPos = serverConfig['item-chest'];

   const hostileMobs = [
      'zombie', 'skeleton', 'spider', 'creeper', 'enderman',
      'witch', 'blaze', 'ghast', 'slime', 'magma_cube',
      'silverfish', 'cave_spider', 'zombified_piglin', 'piglin',
      'husk', 'stray', 'drowned', 'phantom', 'pillager', 'vindicator'
   ];

   function seededRandom(seed) {
      let state = seed;
      return function() {
         state = (state * 1103515245 + 12345) & 0x7fffffff;
         return state / 0x7fffffff;
      };
   }

   function generateExplorationPoint() {
      if (!seedRandom) {
         seedRandom = seededRandom(config['gathering-area'].seed);
      }

      const spawnPos = bot.entity.position;
      const maxDist = config['gathering-area']['max-distance'];
      
      const angle = seedRandom() * Math.PI * 2;
      const distance = seedRandom() * maxDist;
      
      const x = Math.floor(spawnPos.x + Math.cos(angle) * distance);
      const z = Math.floor(spawnPos.z + Math.sin(angle) * distance);
      const y = spawnPos.y;

      return { x, y, z };
   }

   function checkEquipment() {
      const items = bot.inventory.items();
      
      let hasDiamondAxe = items.some(i => i.name.includes('diamond_axe'));
      let hasDiamondPickaxe = items.some(i => i.name.includes('diamond_pickaxe'));
      let hasShield = items.some(i => i.name.includes('shield'));
      let foodCount = items.filter(i => 
         i.name.includes('beef') || i.name.includes('pork') || 
         i.name.includes('chicken') || i.name.includes('bread') ||
         i.name.includes('potato') || i.name.includes('carrot')
      ).reduce((sum, i) => sum + i.count, 0);

      return {
         hasDiamondAxe,
         hasDiamondPickaxe,
         hasShield,
         hasFood: foodCount >= 64,
         foodCount
      };
   }

   async function collectFromChest() {
      try {
         console.log(`[Gather] Going to chest at (${chestPos.x}, ${chestPos.y}, ${chestPos.z})`);
         
         const goal = new GoalBlock(chestPos.x, chestPos.y, chestPos.z);
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(goal);

         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Timeout reaching chest'), 60000);
            
            bot.once('goal_reached', () => {
               clearTimeout(timeout);
               resolve();
            });
         });

         console.log('[Gather] Reached chest, opening...');
         
         const chestBlock = bot.blockAt({ x: chestPos.x, y: chestPos.y, z: chestPos.z });
         if (!chestBlock) {
            console.log('[Gather] No chest found at location!');
            return false;
         }

         const chest = await bot.openContainer(chestBlock);
         
         console.log('[Gather] Chest opened, taking items...');
         
         for (const item of chest.containerItems()) {
            if (item.name.includes('diamond_axe') || 
                item.name.includes('diamond_pickaxe') ||
                item.name.includes('shield') ||
                item.name.includes('beef') || item.name.includes('pork') || 
                item.name.includes('chicken') || item.name.includes('bread') ||
                item.name.includes('potato') || item.name.includes('carrot')) {
               await chest.withdraw(item.type, null, item.count);
               console.log(`[Gather] Took ${item.count}x ${item.name}`);
            }
         }

         chest.close();
         
         const equipment = checkEquipment();
         console.log(`[Gather] Equipment check:`, equipment);
         
         if (equipment.hasDiamondAxe && equipment.hasDiamondPickaxe && 
             equipment.hasShield && equipment.hasFood) {
            hasEquipment = true;
            console.log('[Gather] All required equipment obtained!');
            bot.chat('I have all my equipment! Starting gathering operations.');
            return true;
         } else {
            console.log('[Gather] Missing equipment, will try again later');
            bot.chat('Still missing equipment. Please put items in chest: diamond axe, diamond pickaxe, shield, and 64+ food.');
            return false;
         }
      } catch (err) {
         console.log(`[Gather] Error collecting from chest: ${err.message || err}`);
         return false;
      }
   }

   function defendFromHostiles() {
      setInterval(() => {
         if (!hasEquipment) return;
         
         if (!currentTarget || currentTarget.isValid === false) {
            const entities = Object.values(bot.entities);
            let nearest = null;
            let nearestDistance = 10;

            for (const entity of entities) {
               if (entity.type === 'player') continue;
               if (entity.type !== 'mob') continue;
               if (!entity.name) continue;
               if (!entity.position) continue;
               
               const mobName = entity.name.toLowerCase();
               const isHostile = hostileMobs.some(mob => mobName.includes(mob));
               
               if (isHostile) {
                  const distance = bot.entity.position.distanceTo(entity.position);
                  if (distance < nearestDistance) {
                     nearest = entity;
                     nearestDistance = distance;
                  }
               }
            }
            
            if (nearest) {
               currentTarget = nearest;
               console.log(`[Defense] Found hostile: ${currentTarget.name} at ${nearestDistance.toFixed(2)} blocks`);
            }
         }

         if (currentTarget && currentTarget.isValid) {
            const distance = bot.entity.position.distanceTo(currentTarget.position);
            
            if (distance < 4) {
               bot.lookAt(currentTarget.position.offset(0, currentTarget.height, 0));
               bot.attack(currentTarget);
            } else {
               currentTarget = null;
            }
         }
      }, 500);
   }

   function countItemInInventory(itemName) {
      const items = bot.inventory.items();
      let count = 0;
      for (const item of items) {
         if (item.name === itemName) {
            count += item.count;
         }
      }
      return count;
   }

   async function moveToExplorationPoint() {
      if (!currentExplorationPoint) {
         currentExplorationPoint = generateExplorationPoint();
         console.log(`[Explore] New point from seed ${config['gathering-area'].seed}: (${currentExplorationPoint.x}, ${currentExplorationPoint.y}, ${currentExplorationPoint.z})`);
      }

      try {
         const goal = new GoalNear(currentExplorationPoint.x, currentExplorationPoint.y, currentExplorationPoint.z, 5);
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(goal);

         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
               console.log('[Explore] Generating new point');
               currentExplorationPoint = generateExplorationPoint();
               reject('Timeout');
            }, 30000);
            
            bot.once('goal_reached', () => {
               clearTimeout(timeout);
               console.log('[Explore] Arrived!');
               resolve();
            });
         });
      } catch (err) {
         console.log(`[Explore] Error: ${err}`);
      }
   }

   async function collectBlockType(blockName) {
      try {
         const blockType = mcData.blocksByName[blockName];
         if (!blockType) {
            console.log(`[Gather] Unknown block: ${blockName}`);
            return false;
         }

         const block = bot.findBlock({
            matching: blockType.id,
            maxDistance: config['gathering-area']['search-radius'],
            count: 1
         });

         if (!block) {
            console.log(`[Gather] No ${blockName} nearby, moving...`);
            currentExplorationPoint = null;
            await moveToExplorationPoint();
            return false;
         }

         console.log(`[Gather] Found ${blockName}, going there...`);
         
         const goal = new GoalBlock(block.position.x, block.position.y, block.position.z);
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(goal);

         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Timeout'), 15000);
            
            bot.once('goal_reached', () => {
               clearTimeout(timeout);
               resolve();
            });
         });

         console.log(`[Gather] Mining ${blockName}...`);
         
         const tool = bot.pathfinder.bestHarvestTool(block);
         if (tool) {
            await bot.equip(tool, 'hand');
         }
         
         await bot.dig(block);
         
         console.log(`[Gather] Collected ${blockName}!`);
         await new Promise(resolve => setTimeout(resolve, 500));
         return true;
      } catch (err) {
         console.log(`[Gather] Error: ${err.message}`);
         return false;
      }
   }

   async function deliverItemsToPlayer() {
      try {
         const player = bot.players[targetPlayer];
         
         if (!player || !player.entity) {
            console.log(`[Deliver] Player ${targetPlayer} not found`);
            return false;
         }

         console.log(`[Deliver] Going to ${targetPlayer}...`);
         
         const goal = new GoalNear(player.entity.position.x, player.entity.position.y, player.entity.position.z, 2);
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(goal);

         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Timeout'), 30000);
            
            bot.once('goal_reached', () => {
               clearTimeout(timeout);
               resolve();
            });
         });

         bot.chat(`${targetPlayer}, I have your materials!`);
         return true;
      } catch (err) {
         console.log(`[Deliver] Error: ${err.message || err}`);
         return false;
      }
   }

   async function gatheringLoop() {
      if (currentTask) return;
      if (!hasEquipment) {
         console.log('[Gather] Waiting for equipment...');
         setTimeout(() => gatheringLoop(), 30000);
         return;
      }

      currentTask = 'gathering';

      for (const blockRequest of blocksNeeded.blocks) {
         const blockName = blockRequest.name;
         const needed = blockRequest.amount;
         const current = countItemInInventory(blockName);

         if (current >= needed) {
            console.log(`[Gather] Have enough ${blockName} (${current}/${needed})`);
            continue;
         }

         console.log(`[Gather] Need ${needed - current} more ${blockName}`);

         while (countItemInInventory(blockName) < needed) {
            const success = await collectBlockType(blockName);
            
            if (!success) {
               await new Promise(resolve => setTimeout(resolve, 5000));
            }
         }

         console.log(`[Gather] Completed ${blockName}!`);
      }

      console.log('[Gather] All items collected! Delivering...');
      await deliverItemsToPlayer();

      currentTask = null;
      console.log('[Gather] Waiting 30s before next cycle...');
      setTimeout(() => gatheringLoop(), 30000);
   }

   bot.once('spawn', async () => {
      console.log('\x1b[33m[GatherBot] Bot joined server\x1b[0m');
      console.log(`[GatherBot] Using seed: ${config['gathering-area'].seed}`);
      bot.pathfinder.setMovements(defaultMove);
      
      defendFromHostiles();
      
      setTimeout(async () => {
         const success = await collectFromChest();
         if (success) {
            await moveToExplorationPoint();
            gatheringLoop();
         } else {
            setInterval(() => collectFromChest(), 60000);
         }
      }, 5000);
   });

   bot.on('death', () => {
      console.log(`\x1b[33m[GatherBot] Died\x1b[0m`);
      currentTask = null;
      hasEquipment = false;
   });

   bot.on('end', () => {
      setTimeout(() => createGatherBot(), 5000);
   });

   bot.on('kicked', (reason) =>
      console.log('\x1b[33m', `[GatherBot] Kicked: \n${reason}`, '\x1b[0m')
   );

   bot.on('error', (err) =>
      console.log(`\x1b[31m[ERROR] ${err.message}`, '\x1b[0m')
   );
}

createGatherBot();
