require('dotenv').config();
const delay = require('delay');
const mineflayer = require('mineflayer');
const dateformat = require('dateformat');
const readline = require('readline');
const fs = require('fs');
const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(640);
Vec3 = require('vec3').Vec3;
mcData = require("minecraft-data")("1.12.2");//bot.version
bucketsJs = require('buckets-js');

glob = new Object();
glob.debug = true;
const PORT = "63695"
glob.isAnnounceDeathMode = true;

if (process.argv[3] == 'true' || process.argv[2] == 'true') {
  glob.debug = true;
  console.log("command line debug mode");
} else if (process.argv[3] == 'false' || process.argv[2] == 'false') {
  glob.debug = false;
  console.log("command line online mode");
}
console.log('starting');
console.log("repl to debug");

start();

glob.blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
glob.isSame = require("./isSameObject");
require("./calculator");
require("./musicPlayer");
require("./movement");
require("./inventoryManager");
require("./combat");
require("./eventManager");


function start() {
  if (glob.debug == false) {
    bot = mineflayer.createBot({
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      password: process.env.MC_PASSWORD,
      verbose: true
    });
    console.log('Connecting to [' + process.env.MC_HOST + ':' + process.env.MC_PORT + ']');
    console.log('User [' + process.env.MC_USERNAME + ']');
    console.log('Name [' + process.env.MC_USERNAME + ']');
  } else {
    bot = mineflayer.createBot({
      host: "localhost",
      port: PORT,
      username: "Steve",
      // password: process.env.MC_PASSWORD,
      verbose: true
    });
    console.log('Connecting to [localhost]');
    console.log('Name [' + bot.username + ']');
  }
  bot.on('end', () => {
    bot.log('[bot.end] bot.end');
  });
  /*
    bot.on('end', () => {
      console.log('end');
      if (bot.hasInterrupt) {
        process.exit(0);
      } else {
        // 自分で止めた時以外は再起動を試みる
        bot.log('[bot.end] Trying reconnection 2 min later...');
        delay(120000).then(() => {
          start();
        });
      }
    });
  */
  bot.on('connect', () => {
    bot.log('[bot.connect]');
    delay(1000).then(() => {
      if (glob.debug == true) {
        //bot.chatAddPattern(/^<([^ :]*)> (.*)$/, 'chat');
        bot.log('[bot.login] localhost');
      } else if (process.env.MC_HOST != null && ((process.env.MC_HOST == 'kenmomine.club' && process.env.PORT == 25565)|| process.env.MC_HOST == 'ironingot.net')) {
        // kenmomine.club向けchat/whisperパターン
        bot.chatAddPattern(/^(?:\[[^\]]*\])<([^ :]*)> (.*)$/, 'chat', 'kenmomine.club chat');
        bot.chatAddPattern(/^(?:\[[^\]]*\])<Super_AI> \[([^ :]*)\] (.*)$/, 'chat', 'kenmomine.club chat');
        bot.chatAddPattern(/^(?:\[Omikuji\]) ([^ :]*)は <(.*)>/, 'omikuji', 'kenmomine.club omikuji');
        bot.chatAddPattern(/^([^ ]*) whispers: (.*)$/, 'whisper', 'kenmomine.club whisper(Chatco)');
        bot.log('[bot.login]kenmomine');
      } else if (process.env.MC_HOST != null && process.env.MC_HOST == 'pcgamemc.dip.jp') {
        // pcgamemc.dip.jp向けchat/whisperパターン
        bot.chatAddPattern(/^(?:\[[^\]]*\])<([^ :]*)> (.*)$/, 'chat', 'pcgamemc.dip.jp chat');
        bot.chatAddPattern(/^([^ ]*) -> (.*)$/, 'whisper', 'pcgamemc.dip.jp whisper(Chatco)');
        bot.log('[bot.login]PCG');
      }
      console.log('chatAdded');
    });;
    console.log('connected');
  });

  var radarPlugin = require('./mineflayer-radar')(mineflayer);
  radarPlugin(bot, { host: 'localhost', port: 55146 });

  clock = new Date;
  minutes = clock.getMinutes();
  hours = clock.getHours();
  seconds = clock.getSeconds();
  setInterval(time_signal, 100);

  console.log('started');
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/// 同じメッセージのループ送信、短時間での大量送信などを
/// 防ぐ仕組みを入れたチャット送信メソッド
var safechat_send_text_cache = [];
var safechat_last_send_time = new Date().getTime();
var safechat_continuous_count = 0;

function safechat(text) {
  var current_time = new Date().getTime();
  var elapsed_ms = current_time - safechat_last_send_time;

  if (!text)
    return;

  if (elapsed_ms > 1000) {
    safechat_continuous_count = 0;
  }

  safechat_continuous_count++;
  if (safechat_continuous_count > 5) {
    bot.log('[bot.safechat] *REJECTED* 短時間での大量メッセージが送信がされました');
    return;
  }

  if (elapsed_ms > 3000) {
    // 一定時間経過したら直前のメッセージは忘れる
    safechat_send_text_cache = [];
  }

  if (safechat_send_text_cache.find((value) => { return value === text; })) {
    bot.log('[bot.safechat] *REJECTED* 一定時間内に同一の文章が複数回送信されました');
    return;
  }
  safechat_send_text_cache.push(text);

  safechat_last_send_time = current_time;
  bot.chat(text);
}

bot.safechat = (text, delay_ms = 100) => {
  delay(delay_ms).then(() => { safechat(text); });
}

// 配列で定義された複数の文言のうちの一つをランダム選択してチャット送信する
bot.randomchat = (messages, delay_ms = 800) => {
  var message;
  if (Array.isArray(messages)) {
    message = messages[Math.floor(Math.random() * messages.length)]
  } else {
    message = messages;
  }
  delay(delay_ms).then(() => { safechat(message); });
}


//prompt処理とかをちゃんとやるログ出力
bot.log = (...args) => {
  readline.cursorTo(process.stdout, 0);

  if (typeof args[0] === 'string') {
    // 出力の頭に現在時刻を挿入
    args[0] = '[' + dateformat(new Date(), 'isoTime') + '] ' + args[0];
  }
  console.log.apply(console, args);

  if (typeof rl !== 'undefined')
    rl.prompt(true);
}

function jmes_to_text(jmes) {
  var message = '';
  if (jmes.text)
    message = jmes.text;

  else if (jmes.extra)
    jmes.extra.forEach((v, i, a) => {
      message += v.text;
    });

  else if (jmes.json && jmes.json.with) {
    console.log(jmes);
    for (var i = 0; i < jmes.json.with.length; i++) {
      if (typeof jmes.json.with[i] == "object") {
        if (jmes.json.with[i].text) {
          message += "<";
          message += jmes.json.with[i].text;
          message += "> ";
        }
      } else if (typeof jmes.json.with[i] == "string") {
        message += jmes.json.with[i];
      }
    }
  }
  return message;
}

bot.on("message", (jmes) => {
  bot.log(jmes_to_text(jmes));
  logfile_out(jmes_to_text(jmes));
  //console.log(jmes);
});

bot.on("actionBar", (jmes) => {
  console.log(jmes);
});


var callfirst = true;
function logfile_out(text) {
  var now = new Date();
  var header = "["
    + ("0" + now.getHours()).slice(-2) + ":"
    + ("0" + now.getMinutes()).slice(-2) + ":"
    + ("0" + now.getSeconds()).slice(-2)
    + "] ";
  text = header + text;
  if (callfirst) {
    var now = new Date();
    var date = "["
      + now.getFullYear() + ":"
      + ("0" + now.getMonth() + 1).slice(-2) + ":"
      + ("0" + now.getDate()).slice(-2)
      + "] ";
    fs.appendFile('./log/' + dateformat(now, 'yyyy-mm-dd') + '.log', " ---------- " + date + " ---------- \r\n", 'UTF-8', function (err) {
      if (err) {
        console.log(err);
      }
    });
    callfirst = false;
  }
  fs.appendFile('./log/' + dateformat(now, 'yyyy-mm-dd') + '.log', text + "\r\n", 'UTF-8', function (err) {
    if (err) {
      console.log(err);
    }
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//hi
// 自分が入ったときの挨拶
bot.once('login', () => {
  // bot.safechat('hi', 1600);
});
// 最後に入ってきた人の hi に応答
var last_joined_player = null;
bot.on('playerJoined', (player) => {
  last_joined_player = player.username;
});

//normalchat
bot.on('chat', (username, message) => {
  if (username == "Super_AI") return;
  //Calculator
  if (message.match(/(.*)=$/)) {
    var calcMessage = glob.Calc(message);
    if (!calcMessage.match(/¬/)) bot.safechat(calcMessage, 0);
  }

  //Follow
  if (message.match(/おいで$/)) {
    if (bot.players[username] && bot.players[username].entity) {
      //glob.goToPos(bot.players[username].entity.position);
      bot.log("[move] chat follow " + username);
    }
  }

  //Auction
  if (message.match(/^>\s*(\d+)/) && glob.auctioning) {
    if (maxBid < Number(RegExp.$1)) {
      maxBid = Number(RegExp.$1);
      maxBidPlayer = username;
      bot.log("[Auction] max:" + maxBidPlayer + " " + maxBid);
    }
    setAuction(aucTimeSetting);
  }
  if (message.match(/^Auction \s*(-?\w+)\s*/i)) {
    setAuction(Number(RegExp.$1));
  }

  //Music
  if (message.match(/^Music info/i) && glob.isPlayingMusic) {
    if (glob.isEndlessing) {
      bot.safechat("今はプレイリスト" + glob.endlessPlaylist + ":" + glob.endlessIndex + "/" + glob.endlessFilelist.length + "曲目の" + glob.currentMusic.title
        + "(" + glob.currentMusic.duration + "秒)を演奏中です。");
    } else {
      bot.safechat("今は" + glob.currentMusic.title + "を演奏中です。");
    }
  }
  if (message.match(/^Music skip/i) && glob.isEndlessing) {
    glob.isPlayingMusic = false;
    bot.safechat("スキップ:" + glob.endlessFilelist[glob.endlessIndex - 1] + " => " + glob.endlessFilelist[glob.endlessIndex]);
  }
  if (message.match(/^Music restart/i) && glob.isEndlessing) {
    glob.isPlayingMusic = false;
    bot.safechat("最初から:" + glob.endlessFilelist[glob.endlessIndex - 1]);
    glob.endlessIndex--;
  }
  if (message.match(/^Music pre/i) && glob.isEndlessing) {
    glob.isPlayingMusic = false;
    bot.safechat("前の曲:" + glob.endlessFilelist[glob.endlessIndex - 2]);
    glob.endlessIndex -= 2;
    if (glob.endlessIndex < 0) {
      glob.endlessIndex = 0;
    }
  }
  if (message.match(/^Music set (\d+)/i) && glob.isEndlessing) {
    glob.isisPlayingMusic = false;
    bot.safechat("リクエスト:" + glob.endlessFilelist[Number(RegExp.$1)]);
    glob.endlessIndex = Number(RegExp.$1);
  }

  //selfchat
  if (bot.username === username) return;

  //hi
  if (username === last_joined_player) {
    if (message.match(/^(?:hi|hai|ひ|日|はい|へ|hi \(日\))$/))
      bot.safechat('hi', 2000);
    last_joined_player = null;
  }
});

//whisper
bot.on('whisper', (username, message) => {
  if (bot.username === username) {
    bot.log('[botselfcommand]');
  }
  if (message.match(/(.*)=$/)) {
    bot.safechat("/tell " + username + " " + message + "  " + glob.Calc(message));
  }
});


//omikuji
bot.on('omikuji', (username, message) => {
  if (bot.username === username) return;

  if (message.match(/柑橘類/)) {
    bot.randomchat(['wwwww', 'ｗｗｗｗｗ', 'かわいそう', 'w', 'かw',
      "キャー", "柑橘w", "黄色い", "柑橘類の日", "おめでとう！", "可哀想", "か ん き つ る い",
      "いいね", "ʬʬʬ", "草", "🍊", username + "さんは柑橘類ね", "柑橘系" + username, message,
      "", "柑橘…", "柑橘な日もあるよ", "www", "ｗｗｗ", "卍柑橘卍", "柑橘様だ", "かかかかかｗ",
      "大吉＞中吉＞吉＞＞＞大凶＞＞＞＞＞＞＞＞＞＞＞＞柑橘類", "17333", "55", "カ ン キ ツ", "[柑橘]<" + username + ">[柑橘]",
      "オレンジ様だ", "レモン様だ", "今日の運勢「柑橘類」", "(笑)", "柑橘類（笑）"]);
  }
});


//death
var is_dead = false;
bot.on('death', () => {
  is_dead = true;
});

bot.on('spawn', () => {
  if (!is_dead) return;
  if (glob.isAnnounceDeathMode) bot.safechat("私はBOTです。よろしければ遺品回収してください。");
  is_dead = false;
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


glob.auctioning = false;
var auc10called = false;
var aucDeadline;
var aucTimeSetting = 0;
var maxBid = 0;
var maxBidPlayer = "";
function setAuction(seconds) {
  try {
    if (seconds < 1) return;
    aucDeadline = new Date();
    aucDeadline.setSeconds(aucDeadline.getSeconds() + seconds);
    if (glob.auctioning == false) {
      glob.auctioning = true;
      bot.chat(">オークションを開始しました: 最終入札(>[数値])から" + seconds + "秒まで");
      aucTimeSetting = seconds;
      maxBid = 0;
      maxBidPlayer = "";
    }

    aucTimeSetting = seconds;
    if (aucTimeSetting > 10) auc10called = false;

    bot.log("[Auction]" + aucDeadline);
  } catch (e) {
    console.log(e);
  }
}

var clock;
var minutes;
var hours;
var seconds;
var prev_minutes;
var prev_hours;
function time_signal() {
  prev_minutes = minutes;

  prev_hours = hours;
  clock = new Date();
  minutes = clock.getMinutes();
  hours = clock.getHours();
  seconds = clock.getSeconds();
  try {

    if (hours == 0 && hours != prev_hours) {//omikuji
      bot.safechat('/omikuji', 3000);
    }

    if (glob.auctioning && clock.getTime() >= aucDeadline.getTime()) {//auction
      bot.chat(">落札！ Max: " + maxBidPlayer + " " + maxBid);
      glob.auctioning = false;
      aucTimeSetting = 0;
    }

    if (glob.auctioning && aucTimeSetting > 10 && auc10called == false && aucDeadline.getTime() - clock.getTime() <= 10000) {
      auc10called = true;
      bot.chat(">残り10秒未満  現在Max: " + maxBidPlayer + " " + maxBid);
    }
  }
  catch (e) { console.log(e); }
}

