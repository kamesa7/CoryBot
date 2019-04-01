
const delay = require('delay');
const dateformat = require('dateformat');
const readline = require('readline');
const fs = require('fs');

var clock = new Date;
var minutes = clock.getMinutes();
var hours = clock.getHours();
var seconds = clock.getSeconds();

glob.isAuctioning = false;
glob.isAnnounceDeathMode = true;

const keyNames = ["コリドラ", "こりどら", "コリちゃん", "こりちゃん", "Cory", "Corydoras81"];
var str = "^(" + keyNames[0];
for (var i = 1; i < keyNames.length; i++)str += "|" + keyNames[i];
str += ")";
const nameCall = new RegExp(str);

setInterval(time_signal, 100);

var init = true;
bot.on('spawn', () => {
    if (init) {
        init = false;
        bot.log('[bot.connect]');
        if (glob.debug == true) {
            //bot.chatAddPattern(/^<([^ :]*)> (.*)$/, 'chat');
            bot.log('[bot.login] localhost');
        } else if (process.env.MC_HOST != null && ((process.env.MC_HOST == 'kenmomine.club' && process.env.MC_PORT == 25565) || process.env.MC_HOST == 'ironingot.net')) {
            // kenmomine.club向けchat/whisperパターン
            bot.chatAddPattern(/^(?:\[[^\]]*\])<([^ :]*)> (.*)$/, 'chat', 'kenmomine.club chat');
            bot.chatAddPattern(/^(?:\[[^\]]*\])<Super_AI> \[([^ :]*)\] (.*)$/, 'chat', 'kenmomine.club chat');
            bot.chatAddPattern(/^(?:\[Omikuji\]) ([^ :]*)は <(.*)>/, 'omikuji', 'kenmomine.club omikuji');
            bot.chatAddPattern(/^([^ ]*) whispers: (.*)$/, 'whisper', 'kenmomine.club whisper(Chatco)');
            bot.log('[bot.login] kenmomine');
        } else if (process.env.MC_HOST != null && process.env.MC_HOST == 'pcgamemc.dip.jp') {
            // pcgamemc.dip.jp向けchat/whisperパターン
            bot.chatAddPattern(/^(?:\[[^\]]*\])<([^ :]*)> (.*)$/, 'chat', 'pcgamemc.dip.jp chat');
            bot.chatAddPattern(/^([^ ]*) -> (.*)$/, 'whisper', 'pcgamemc.dip.jp whisper(Chatco)');
            bot.log('[bot.login]PCG');
        } else {
            bot.log('[bot.login] unknown host');
        }
        bot.log('[bot.chatAdded]');
    }
});

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
    if (message.match(nameCall)) {
        if (message.match(/おいで$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                glob.goToPos(bot.players[username].entity.position);
                bot.log("[move] chat goto " + username);
            }
        }
        if (message.match(/ついてきて$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                glob.follow(bot.players[username].entity);
                bot.log("[move] chat follow " + username);
            }
        }
        if (message.match(/走ってきて$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                glob.chase(bot.players[username].entity);
                bot.log("[move] chat chase " + username);
            }
        }
        if (message.match(/止まれ$/) || message.match(/とまれ$/)) {
            glob.stopMoving()
            bot.log("[move] chat stop ");
        }
    }

    //Auction
    if (message.match(/^>\s*(\d+)/) && glob.isAuctioning) {
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

    //combat
    if (message.match(/^enemy (.*)$/i)) {
        glob.hostiles.push(RegExp.$1);
        bot.log("[combat] add hostile : " + RegExp.$1);
    }

    if (message.match(/^fire$/i)) {
        bot.log("[combat] sniper mode");
        glob.isSniperMode = true;
    }

    if (message.match(/^fire stop$/i) || message.match(/^stop fire$/i)) {
        bot.log("[combat] stop sniper mode");
        glob.isSniperMode = false;
    }

    //inventoly
    if (message.match(/^equip$/i)) {
        glob.equipArmor();
    }

    if (message.match(/^equip head$/i)) {
        glob.equipHead();
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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

        if (glob.isAuctioning && clock.getTime() >= aucDeadline.getTime()) {//auction
            bot.chat(">落札！ Max: " + maxBidPlayer + " " + maxBid);
            glob.isAuctioning = false;
            aucTimeSetting = 0;
        }

        if (glob.isAuctioning && aucTimeSetting > 10 && auc10called == false && aucDeadline.getTime() - clock.getTime() <= 10000) {
            auc10called = true;
            bot.chat(">残り10秒未満  現在Max: " + maxBidPlayer + " " + maxBid);
        }
    }
    catch (e) { console.log(e); }
}


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
        if (!glob.isAuctioning) {
            glob.isAuctioning = true;
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

    if (elapsed_ms > 10000) {
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
        message += "  : " + jmes.translate
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