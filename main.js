require('dotenv').config();
const mineflayer = require('mineflayer');
const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(640);

fs = require('fs');
jsonfile = require('jsonfile');
Vec3 = require('vec3').Vec3;
mcData = require("minecraft-data")("1.12.2");//bot.version
bucketsJs = require('buckets-js');
isSame = require("./isSameObject");

var steveNum = "";

glob = {
  debug: false,
  useCache: true,
  LOCAL: "localhost",
  LOCALPORT: "51899",
  event: new events.EventEmitter()
};

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
require("./radar")

function start() {
  if (glob.debug) {
    bot = mineflayer.createBot({
      host: glob.LOCAL,
      port: glob.LOCALPORT,
      username: "Steve" + steveNum,
      verbose: true
    });
    console.log('Connecting to [localhost]');
  } else if (glob.useCache) {
    var sessionCache = jsonfile.readFileSync("session_cache.json")
    bot = mineflayer.createBot({
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      session: sessionCache,
      password: process.env.MC_PASSWORD,
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
      jsonfile.writeFile("session_cache.json", bot._client.session)
    }
  });

  bot.on('end', () => {
    console.log('process exit');
    if (!glob.debug) jsonfile.writeFileSync("session_cache.json", bot._client.session)
    process.exit();
  });

}