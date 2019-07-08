
const dateformat = require('dateformat');

var clock = new Date;
var minutes = clock.getMinutes();
var hours = clock.getHours();
var seconds = clock.getSeconds();

glob.isIgnoreMode = false;
glob.isAuctioning = false;
glob.isAnnounceDeathMode = true;
glob.isOmikujiReactionMode = false;

glob.setAuction = setAuction
glob.autoAuction = autoAuction
glob.secretInit = secretInit
glob.checkCount = checkCount
glob.deleteCount = deleteCount

const keyNames = ["コリドラ", "こりどら", "コリちゃん", "こりちゃん", "Cory"];
var str = "^(" + keyNames[0];
for (var i = 1; i < keyNames.length; i++)str += "|" + keyNames[i];
str += ")";
const nameCall = new RegExp(str);

setInterval(time_signal, 200);

bot.on('login', () => {
    bot.log('[bot.connect]');
    if (glob.debug == true) {
        //bot.chatAddPattern(/^<([^ :]*)> (.*)$/, 'chat');
        bot.log('[bot.login] localhost');
    } else if (process.env.MC_HOST != null && ((process.env.MC_HOST == 'kenmomine.club' && process.env.MC_PORT == 25565) || process.env.MC_HOST == 'ironingot.net')) {
        // kenmomine.club向けchat/whisperパターン
        bot.chatAddPattern(/^(?:\[[^\]]*\])<([^ :]*)> (.*)$/, 'chat', 'kenmomine.club chat');
        bot.chatAddPattern(/^(?:\[[^\]]*\])<Super_AI> \[([^ :]*)\] (.*)$/, 'chat', 'kenmomine.club chat');
        bot.chatAddPattern(/^(?:\[Omikuji\]) ([^ :]*)は <(.*)>/, 'omikuji', 'kenmomine.club omikuji');
        bot.chatAddPattern(/^([^ ]*) whispers: (.*)$/, 'whisper', 'kenmomine.club whisper');
        bot.chatAddPattern(/^([^ :]*) が (.*) を (\d*) 個発見しました$/, 'orefound', 'kenmomine.club orefound');
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
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//hi
// 自分が入ったときの挨拶
bot.once('spawn', () => {
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
        if (!calcMessage.match(/¬/)) bot.safechat(calcMessage);
    }

    //Follow
    if (message.match(nameCall)) {
        if (message.match(/おいで$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                bot.log("[move] chat goto " + username);
                glob.goToPos(bot.players[username].entity.position);
            }
        }
        if (message.match(/ついてきて$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                bot.log("[move] chat follow " + username);
                glob.follow(bot.players[username].entity);
            }
        }
        if (message.match(/走ってきて$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                bot.log("[move] chat chase " + username);
                glob.chase(bot.players[username].entity);
            }
        }
        if (message.match(/止まれ$/) || message.match(/とまれ$/)) {
            glob.stopMoving()
            bot.log("[move] chat stop ");
        }
    }

    //OreFound
    if (message.match(/^採掘記録$/)) {
        checkCount(username)
    } else if (message.match(/^採掘記録 (.+)$/)) {
        checkCount(RegExp.$1)
    } else if (message.match(/^採掘記録削除$/)) {
        deleteCount(username)
    }

    //Auction
    if (message.match(/^>\s*(\d+)$/)) {
        const money = Number(RegExp.$1)
        if (glob.isAuctioning) {
            bidAuction(username, money)
        } else {
            secretAuction(username, money)
        }
    }
    if (message.match(/^(Auction|オークション)$/i)) {
        setAuction(60);
    }
    if (message.match(/^(Auction|オークション) \s*(-?\w+)\s*$/i)) {
        setAuction(Number(RegExp.$2));
    }

    //Music
    if (message.match(/^Music info/i) && glob.getState() == "music") {
        if (glob.isPlaylistMode) {
            bot.safechat("今はプレイリスト" + glob.Playlist + ":" + glob.PlaylistIndex + "/" + glob.PlaylistFiles.length + "曲目の" + glob.currentMusic.title
                + "(" + glob.currentMusic.duration + "秒)を演奏中です。");
        } else {
            bot.safechat("今は" + glob.currentMusic.title + "を演奏中です。");
        }
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
    if (message.match(/^autoAuction \s*(-?\w+)\s*/i)) {
        autoAuction(username, Number(RegExp.$1));
    }
});


//omikuji
bot.on('omikuji', (username, message) => {
    if (bot.username === username) return;
    if (!glob.isOmikujiReactionMode) return;

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
var dead_point = null;
bot.on('death', () => {
    is_dead = true;
    dead_point = bot.entity.position.floored()
    bot.log("dead at " + dead_point)
});

bot.on('spawn', () => {
    if (!is_dead) return;
    if (glob.isAnnounceDeathMode) bot.safechat("よろしければ遺品回収してください。" + dead_point);
    is_dead = false;
});


//orefound
glob.miningCount = {}
glob.logMining = false;
bot.on('orefound', (username, ore, count) => {
    if (!glob.miningCount[username])
        glob.miningCount[username] = { start: dateformat(new Date(), 'isoTime') }
    const data = glob.miningCount[username]
    if (!data[ore])
        data[ore] = 0
    data[ore] += Number(count)
    if (glob.logMining) bot.log("[orefound] " + username + " " + ore + " " + data[ore] + "  +" + count)
})

function checkCount(username) {
    if (!glob.miningCount[username]) {
        bot.safechat(username + "さんの採掘記録はありません")
        return
    }
    const data = glob.miningCount[username]
    var output = username + "さんの採掘記録 " + data.start + "から ";
    Object.keys(data).forEach(function (key) {
        if (key == "start") return
        output += key.replace(" ", "_") + ":" + data[key] + "個, ";
    })
    bot.safechat(output);
}

function deleteCount(username) {
    glob.miningCount[username] = false
    bot.safechat(username + "さんの採掘記録を消しました")
}

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
            bot.safechat('/omikuji', 9000);
        }

        if (glob.isAuctioning) {
            for (let i = 0; i < glob.autoBiddings.length; i++) {
                const item = glob.autoBiddings[i];
                if (item.username != maxBidPlayer && item.limit > maxBid) {
                    const nextBid = Math.min(item.limit, maxBid + Math.floor(maxBid * 0.05 + 1));
                    bidAuction(item.username, nextBid)
                    bot.safechat("[auto] " + item.username + " > " + nextBid)
                    break;
                }
            }
            if (aucTimeSetting > glob.auctionCall && aucTimeCalled == false && aucDeadline.getTime() - clock.getTime() <= glob.auctionCall * 1000) {
                aucTimeCalled = true;
                bot.chat(">残り" + glob.auctionCall + "秒未満です  現在Max: " + maxBidPlayer + " " + maxBid + " 締切: " + aucDeadline);
            }
            if (clock.getTime() >= aucDeadline.getTime()) {//auction
                bot.chat(">落札！ Max: " + maxBidPlayer + " " + maxBid);
                glob.isAuctioning = false;
                aucTimeSetting = 0;
            }
        }
    }
    catch (e) { console.log(e); }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

glob.auctionCall = 15
var aucTimeCalled = false;
var aucDeadline;
var aucTimeSetting = 0;
var maxBid = 0;
var maxBidPlayer = "";

var secretMaxBidPlayer = ""
var secretMaxBid = 0
glob.secretLimit = 0
function secretInit(limit = 0) {
    secretMaxBidPlayer = ""
    secretMaxBid = 0
    glob.secretLimit = limit
}
function secretAuction(username, money) {
    try {
        if (secretMaxBid < money) {
            secretMaxBid = money
            secretMaxBidPlayer = username
            bot.log("[secret auction] " + username + "  " + money)
            if (secretMaxBidPlayer != bot.username && glob.secretLimit > secretMaxBid) {
                bot.safechat(">" + Math.min(glob.secretLimit, secretMaxBid + Math.floor(secretMaxBid * 0.05 + 1)))
            }
        }
    } catch (e) {
        console.log(e)
    }
}

function bidAuction(username, money) {
    if (money > maxBid) {
        maxBid = money
        maxBidPlayer = username
        bot.log("[Auction Bid Accept]" + username + " " + money);
    } else {
        bot.log("[Auction Bid Deny]" + username + " " + money);
    }
    setAuction(aucTimeSetting);
}

function setAuction(seconds) {
    try {
        if (seconds < 1) return;
        aucDeadline = new Date();
        aucDeadline.setSeconds(aucDeadline.getSeconds() + seconds);
        if (!glob.isAuctioning) { // init
            glob.isAuctioning = true;
            bot.chat(">オークションを開始しました: 最終入札(>[数値])から" + seconds + "秒まで");
            aucTimeSetting = seconds;
            maxBid = 0;
            maxBidPlayer = "";
            glob.autoBiddings = [];
        }

        aucTimeSetting = seconds;
        if (aucTimeSetting > glob.auctionCall) aucTimeCalled = false;

        bot.log("[Auction] " + aucDeadline);
    } catch (e) {
        console.log(e);
    }
}

glob.autoBiddings = [];
function autoAuction(username, limit) {
    bot.log("[Auction Auto] " + username + " " + limit);
    glob.autoBiddings.push({ username: username, limit: limit })
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

    if (glob.isIgnoreMode)
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

bot.safechat = (message, delay = 100) => {
    setTimeout(safechat, delay, message);
}

// 配列で定義された複数の文言のうちの一つをランダム選択してチャット送信する
bot.randomchat = (messages, delay = 800) => {
    var message;
    if (Array.isArray(messages)) {
        message = messages[Math.floor(Math.random() * messages.length)]
    } else {
        message = messages;
    }
    setTimeout(safechat, delay, message);
}


bot.log = (str) => {
    str = timestamp(str)
    console.log('\u001b[0m' + str);
    glob.event.emit("log", str)
}

bot.on("message", (jmes) => {
    var ansi = timestamp(jmes.toAnsi());
    var str = timestamp(jmes.toString());
    var motd = timestamp(jmes.toMotd());
    logfile_out(str);
    console.log('\u001b[0m' + ansi);
    glob.event.emit("log", motd)
});

bot.on("actionBar", (jmes) => {
    console.log(jmes.toAnsi());
});


bot.on('error', function (err) {
    bot.log("[Error] " + err.message);
})

function timestamp(str) {
    return '[' + dateformat(new Date(), 'isoTime') + '] ' + str;
}


var callfirst = true;
function logfile_out(text) {
    var now = new Date();
    if (callfirst) {
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