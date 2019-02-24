require('dotenv').config();
const mineflayer = require('mineflayer');
Vec3 = require('vec3').Vec3;

botFunc = new Object();

console.log('starting');
console.log("repl to debug");

start();

blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);

function start() {
    bot = mineflayer.createBot({
      host: "localhost",
      port: "65519",
      username: "Steve",
      // password: process.env.MC_PASSWORD,
      verbose: true
    });
    console.log('Connecting to [localhost]');
  bot.on('end', () => {
    bot.log('[bot.end] bot.end');
  });
}

bot.loadPlugin(blockFinderPlugin);
bot.log = (args) => {
    console.log(args)
}

initNote = () => {
  bot.log("[note] Init");
  notes = [[], [], [], [], [], [], [], [], [], []];
  bot.findBlock(
    { point: bot.entity.position, matching: 25, maxDistance: 10}
    , function (err, blocks) {
      if (err) {
        return console.log('Error trying to find : ' + err);
      }
      if (blocks.length) {
        var i = 0;
        var initter = setInterval(function () {
          if (i < blocks.length) {
            if (blocks[i].position.distanceTo(bot.entity.position) > 8.0) {

            } else {
              bot.dig(blocks[i]);
            }
            i++;
          } else {
            clearInterval(initter);
            bot.log("[note] InitEnd");
          }
        }, 2800);

      } else {
        bot.log("I couldn't find within 5.");
        return;
      }
    });

}