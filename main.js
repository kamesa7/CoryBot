console.log("starting");
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

var steveName = null;

glob = {
  LOCAL: process.env.MC_LOCAL === "true" ? true : false,
  USE_CACHE: process.env.MC_USE_CACHE === "true" ? true : false,
  USE_RADAR: process.env.MC_RADAR === "true" ? true : false,
  RADAR_PORT: process.env.MC_RADAR_PORT,
  VANILLA_CHAT: process.env.MC_VANILLA_CHAT === "true" ? true : false,
  NAMECALL_REGEXP: new RegExp(process.env.MC_NAMECALL_REGEXP, "i"),
  BOUYOMICHAN: process.env.MC_BOUYOMI === "true" ? true : false,
  event: new events.EventEmitter()
};

flag = {

}

for (var i = 2; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg == "-debug" || arg == "-local") { glob.LOCAL = true; }
  else if (arg == "-name") { steveName = process.argv[++i]; }
  else if (arg == "-host") { glob.LOCAL = false; process.env.MC_HOST = process.argv[++i]; }
  else if (arg == "-port") { process.env.MC_LOCAL_PORT = process.argv[++i]; process.env.MC_PORT = process.argv[i]; }
  else if (arg == "-version") { process.env.MC_VERSION = process.argv[++i]; }
  else if (arg == "-rport") { glob.USE_RADAR = true; glob.RADAR_PORT = process.argv[++i]; }
  else if (arg == "-vchat") { glob.VANILLA_CHAT = process.argv[++i] === "true" ? true : false; }
  else if (arg == "-radar") { glob.USE_RADAR = process.argv[++i] === "true" ? true : false; }
  else {
    console.log("Invalid Argument : " + arg);
    process.exit();
  }
}

dirCheck()
moduleReplace()
addVectorPrototype()
initialize()
bot.loadPlugin(require('mineflayer-blockfinder')(mineflayer));
require("./state_controler")
require("./inventory_manager")
//require("./event_manager")
require("./chat_manager")
require("./chat")
require("./movement")
require("./combat")
require("./builder")
require("./digger")
require("./elytra")
require("./farmer")
require("./calculator")
require("./music_player")
require("./pearl_golf")
if (glob.USE_RADAR) require("./radar")
if (glob.BOUYOMICHAN) require("./chat_bouyomi")

function initialize() {
  if (glob.LOCAL) {
    bot = mineflayer.createBot({
      host: process.env.MC_LOCAL_HOST,
      port: process.env.MC_LOCAL_PORT,
      username: steveName ? steveName : "Steve",
      version: process.env.MC_VERSION,
      verbose: true,
    });
    console.log('Connecting to [localhost' + ':' + process.env.MC_LOCAL_PORT + ']');
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

  process.env.MC_USERNAME = undefined
  process.env.MC_PASSWORD = undefined

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
    glob.event.emit("log", "---[[bot.end]]--- " + dateformat(new Date(), "isoTime"))
    if (!glob.LOCAL) jsonfile.writeFileSync("session_cache.json", bot._client.session)
    setTimeout(process.exit, 500);
  });
}

// UNUSED
function moduleReplace() {
  //   check("blocks.json", "minecraft-data/minecraft-data/data/pc/1.13.2")
  function check(source, targetdir) {
    const src = __dirname + "/replace/" + source;
    const dest = __dirname + "/node_modules/" + targetdir + "/" + source;
    fs.stat(src, function (err, stats) {
      if (err) throw err;
      let date1 = stats.mtimeMs;
      fs.stat(dest, function (err, stats) {
        if (err) throw err;
        let date2 = stats.mtimeMs;
        if (date1 == date2) return
        fs.copyFile(src, dest, function (err) {
          if (err) throw err;
          console.log("Replaced module " + source)
          console.log("--RESTART IS NEEDED-- to complete replace")
        })
      })
    })
  }
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
        fs.mkdir(path, (err2) => {
          if (err2) {
            console.log("Please Create " + path + " Folder")
            console.log(err2)
          }
        })
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
  Vec3Plus.prototype.round = function () {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    this.z = Math.round(this.z);
    return this;
  };
  Vec3Plus.prototype.rounded = function () {
    var rx = Math.round(this.x);
    var ry = Math.round(this.y);
    var rz = Math.round(this.z);
    return new Vec3(rx, ry, rz);
  };
  Vec3Plus.prototype.rectDistanceTo = function (other) {
    return Math.max(Math.abs(other.x - this.x), Math.abs(other.y - this.y), Math.abs(other.z - this.z))
  };
}