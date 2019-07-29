require('dotenv').config();
const mineflayer = require('mineflayer');
const events = require('events');

fs = require('fs');
jsonfile = require('jsonfile');
Vec3 = require('vec3');
mcData = require("minecraft-data")(process.env.MC_VERSION);
bucketsJs = require('buckets-js');
isSame = require("./isSameObject");
dateformat = require('dateformat')

var steveNum = "";

glob = {
  LOCAL: process.env.MC_LOCAL === "true" ? true : false,
  USE_CACHE: process.env.MC_USE_CACHE === "true" ? true : false,
  RADAR: process.env.MC_RADAR === "true" ? true : false,
  RADAR_PORT: process.env.MC_RADAR_PORT,
  VANILLA_CHAT: process.env.MC_VANILLA_CHAT === "true" ? true : false,
  NAMECALL_REGEXP: new RegExp(process.env.MC_NAMECALL_REGEXP, "i"),
  CHATPROXY_SEND: process.env.MC_CHATPROXY_SEND === "true" ? true : false,
  CHATPROXY_READ: process.env.MC_CHATPROXY_READ === "true" ? true : false,
  event: new events.EventEmitter()
};

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg == "-debug") { glob.LOCAL = true; }
  else if (arg == "-name") { steveNum = process.argv[i + 1]; }
  else if (arg == "-host") { process.env.MC_LOCAL_HOST = process.argv[i + 1]; process.env.MC_HOST = process.argv[i + 1]; }
  else if (arg == "-port") { process.env.MC_LOCAL_PORT = process.argv[i + 1]; process.env.MC_PORT = process.argv[i + 1]; }
  else if (arg == "-rport") { glob.RADAR_PORT = process.argv[i + 1]; glob.RADAR = true; }
  else if (arg == "-vchat") { glob.VANILLA_CHAT = true; }
  else if (arg == "-frader") { glob.RADAR = false; }
  else if (arg == "-fproxy") { glob.CHATPROXY_SEND = false; glob.CHATPROXY_READ = false; }
}
console.log("repl to debug");

initialize()
dirCheck()
addVectorPrototype()

bot.loadPlugin(require('mineflayer-blockfinder')(mineflayer));
require("./state_controler")
require("./inventory_manager")
require("./event_manager")
require("./chat_manager")
require("./chat")
require("./movement")
require("./combat")
require("./builder")
require("./digger")
require("./elytra")
require("./calculator")
require("./music_player")
require("./pearl_golf")
if (glob.RADAR) require("./radar")
if (!glob.LOCAL && (glob.CHATPROXY_SEND || glob.CHATPROXY_READ)) require("./chat_proxy")

function initialize() {
  if (glob.LOCAL) {
    bot = mineflayer.createBot({
      host: process.env.MC_LOCAL_HOST,
      port: process.env.MC_LOCAL_PORT,
      username: "Steve" + steveNum,
      version: process.env.MC_VERSION,
      verbose: true,
    });
    console.log('Connecting to [localhost]');
  } else if (glob.USE_CACHE) {
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
    glob.event.emit("log", "---[[bot.end]]---")
    if (!glob.LOCAL) jsonfile.writeFileSync("session_cache.json", bot._client.session)
    process.nextTick(process.exit);
  });
}

function dirCheck() {
  check("log")
  check("MineMusic")
  check("nbt")
  check("PlayLists")

  function check(path) {
    fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
      if (err) {
        console.log(err)
        fs.mkdir(path)
      }
    })
  }
}

function addVectorPrototype() {
  const Vec3Plus = Vec3.Vec3;
  Vec3Plus.prototype.norm = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  };
  Vec3Plus.prototype.unit = function () {
    var norm = this.norm();
    if (norm === 0) {
      return this.clone();
    } else {
      return this.scaled(1 / norm);
    }
  };
  Vec3Plus.prototype.scale = function (scalar) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  };
  Vec3Plus.prototype.xzDistanceTo = function (other) {
    var dx = other.x - this.x;
    var dz = other.z - this.z;
    return Math.sqrt(dx * dx + dz * dz);
  };
  Vec3Plus.prototype.innerProduct = function (other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  };
  Vec3Plus.prototype.manhattanDistanceTo = function (other) {
    return Math.abs(other.x - this.x) + Math.abs(other.y - this.y) + Math.abs(other.z - this.z);
  };
  Vec3Plus.prototype.toArray = function () {
    return [this.x, this.y, this.z];
  };
}