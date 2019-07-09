bot.once('login', () => {
    bot.log('[bot.connect]');
    if (glob.debug == true) {
        //bot.chatAddPattern(/^<([^ :]*)> (.*)$/, 'chat');
        bot.log('[bot.login] localhost');
    } else if (process.env.MC_HOST != null && ((process.env.MC_HOST == 'kenmomine.club' && process.env.MC_PORT == 25565) || process.env.MC_HOST == 'ironingot.net')) {
        // kenmomine.club向けchat/whisperパターン
        bot.chatPatterns = [];// remove default
        bot.chatAddPattern(/^(?:\[[^\]]*\])<([^ :]*)> (.*)$/, 'chat', 'kenmomine.club chat');
        bot.chatAddPattern(/^(?:\[[^\]]*\])<Super_AI> \[([^ :]*)\] (.*)$/, 'chat', 'kenmomine.club chat');
        bot.chatAddPattern(/^(?:\[Omikuji\]) ([^ :]*)は <(.*)>/, 'omikuji', 'kenmomine.club omikuji');
        bot.chatAddPattern(/^([^ ]*) whispers: (.*)$/, 'whisper', 'kenmomine.club whisper');
        bot.chatAddPattern(/^([^ :]*) が (.*) を (?:over |)(\d*) 個発見しました$/, 'orefound', 'kenmomine.club orefound');
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
        fs.appendFile('./log/' + dateformat(now, 'isoDate') + '.log', " ---------- " + date + " ---------- \r\n", 'UTF-8', function (err) {
            if (err) {
                console.log(err);
            }
        });
        callfirst = false;
    }
    fs.appendFile('./log/' + dateformat(now, 'isoDate') + '.log', text + "\r\n", 'UTF-8', function (err) {
        if (err) {
            console.log(err);
        }
    });
}