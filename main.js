require('dotenv').config();
const delay = require('delay');
const jsonfile = require('jsonfile');
const mineflayer = require('mineflayer');
const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(640);

Vec3 = require('vec3').Vec3;
mcData = require("minecraft-data")("1.12.2");//bot.version
bucketsJs = require('buckets-js');
isSame = require("./isSameObject");

var steveNum = "";
glob = {
  debug: true,
  isAnnounceDeathMode: true
};

var CLIENTTOKEN = undefined;
const PORT = "62186"
// CLIENTTOKEN = "d93458a1-cfb7-40aa-a8ac-258607850dab";

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg == "-debug") glob.debug = true;
  else if (arg == "-name") steveNum = process.argv[i + 1];
}

console.log('starting');
console.log("repl to debug");

start()

glob.blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
require("./chat")
require("./calculator")
require("./musicPlayer")
require("./movement")
require("./inventoryManager")
require("./combat")
require("./eventManager")

function start() {
  if (glob.debug) {
    bot = mineflayer.createBot({
      port: PORT,
      username: "Steve" + steveNum,
      verbose: true
    });
    console.log('Connecting to [localhost]');
  } else if (CLIENTTOKEN) {
    bot = mineflayer.createBot({
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      password: process.env.MC_PASSWORD,
      clientToken: CLIENTTOKEN,
      verbose: true
    });
    console.log('Connecting to [' + process.env.MC_HOST + ':' + process.env.MC_PORT + ']');
    console.log('User [' + process.env.MC_USERNAME + ']');
  } else {
    bot = mineflayer.createBot({
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      password: process.env.MC_PASSWORD,
      verbose: true
    });
    console.log('Connecting to [' + process.env.MC_HOST + ':' + process.env.MC_PORT + ']');
    console.log('User [' + process.env.MC_USERNAME + ']');
  }

  bot.on('login', () => {
    console.log('Name [' + bot.username + ']');
    if (bot._client.session) {
      console.log('ClientToken [' + bot._client.session.clientToken + ']');
      console.log('AccessToken [' + bot._client.session.accessToken + ']');
    }
  });

  bot.on('end', () => {
    console.log('process exit');
    jsonfile.writeFileSync("session_cache.json", bot._client.session)
    process.exit();
  });

  if (!glob.debug) {
    var radarPlugin = require('./mineflayer-radar')(mineflayer);
    radarPlugin(bot, { host: 'localhost', port: 55146 });
  }
}