require('dotenv').config();
const mineflayer = require('mineflayer');
const events = require('events');

fs = require('fs');
jsonfile = require('jsonfile');
Vec3 = require('vec3').Vec3;
mcData = require("minecraft-data")(process.env.MC_VERSION);
bucketsJs = require('buckets-js');
isSame = require("./isSameObject");
dateformat = require('dateformat')

var steveNum = "";

glob = {
  debug: process.env.MC_LOCAL.match(/^true$/i) ? true : false,
  RADAR_PORT: process.env.MC_RADAR_PORT,
  useCache: true,
  event: new events.EventEmitter()
};

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg == "-debug") glob.debug = true;
  else if (arg == "-name") steveNum = process.argv[i + 1];
}
console.log("repl to debug");

start()

bot.loadPlugin(require('mineflayer-blockfinder')(mineflayer));
require("./state_controler")
require("./inventory_manager")
require("./event_manager")
require("./chat_manager")
require("./chat")
require("./movement")
require("./combat")
require("./elytra")
require("./radar")
require("./calculator")
require("./music_player")
require("./pearl_golf")
require("./builder")

function start() {
  if (glob.debug) {
    bot = mineflayer.createBot({
      host: process.env.MC_LOCAL_HOST,
      port: process.env.MC_LOCAL_PORT,
      username: "Steve" + steveNum,
      version: process.env.MC_VERSION,
      verbose: true,
    });
    console.log('Connecting to [localhost]');
  } else if (glob.useCache) {
    var sessionCache
    try {
      sessionCache = jsonfile.readFileSync("session_cache.json")
    } catch (e) {
      sessionCache = undefined
      console.log('Unable to read session_chache. Trying normal start');
    }
    bot = mineflayer.createBot({
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      session: sessionCache,
      password: process.env.MC_PASSWORD,
      version: process.env.MC_VERSION,
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
      version: process.env.MC_VERSION,
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

  bot.on('kicked', (reason, loggedIn) => {
    if (!loggedIn)
      console.log("login failed")
    console.log('kicked reason: ' + reason)
  })

  bot.on('end', () => {
    console.log('bot.end :: process exit');
    if (!glob.debug) jsonfile.writeFileSync("session_cache.json", bot._client.session)
    process.exit();
  });

}