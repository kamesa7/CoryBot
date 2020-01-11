glob.loggingInterval = 200
flag.logChat = false;

bot.once('login', () => {
    bot.log('[bot.connect]');
    if (glob.LOCAL) {
        // normal
        bot.log('[chat pattern] vanilla');
    } else if (!glob.VANILLA_CHAT) {
        // server with plugins  sample
        bot.chatPatterns = [];// remove default
        bot.chatAddPattern(/^(?:\[[^\]]*\])<([^ :]*)> (.*)$/, 'chat', '[world]<username> message');
        bot.chatAddPattern(/^(?:\[[^\]]*\])<Super_AI> \[([^ :]*)\] (.*)$/, 'chat', '[world]<Super_AI> message');
        bot.chatAddPattern(/^(?:\[Omikuji\]) ([^ :]*)は <(.*)>/, 'omikuji', '[Omikuji] usernameは <fortune>');
        bot.chatAddPattern(/^([^ ]*) whispers: (.*)$/, 'whisper', 'username whispers: message');
        bot.chatAddPattern(/^([^ :]*) が (.*) を (?:over |)(\d*) 個発見しました$/, 'orefound', 'username が ore(s) を (over) count 個発見しました');
        bot.log('[chat pattern] multiverse');
    } else {
        // normal
        bot.log('[chat pattern] vanilla');
    }
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

    if (flag.Ignore)
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

var loggingFlower = null
var logQue = new bucketsJs.Queue();
bot.log = (str) => {
    logQue.add(timestamp(str))
    if (logQue.size() == 1) {
        loggingFlower = setInterval(flowLogger, glob.loggingInterval)
    }
}

function flowLogger() {
    var str = logQue.dequeue()
    var stroke = 1
    while (str == logQue.peek()) {
        stroke++
        logQue.dequeue()
    }
    if (stroke > 1) str += "  x " + stroke
    console.log('\u001b[0m' + str);
    glob.event.emit("log", str)
    if (logQue.size() == 0)
        clearInterval(loggingFlower)
}

bot.on("message", (jmes) => {
    var ansi = timestamp(jmes.toAnsi());
    var str = timestamp(jmes.toString());
    var motd = timestamp(jmes.toMotd());
    logfile_out(str);
    console.log('\u001b[0m' + ansi);
    glob.event.emit("log", motd)
});

bot.on("chat", (username, message) => {
    if (flag.logChat) bot.log("[chat] " + username + "  " + message)
});

bot.on("actionBar", (jmes) => {
    console.log(jmes.toAnsi());
});

bot.on('error', function (err) {
    bot.log("[Error] " + err.message);
})

function timestamp(str = "") {
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