
flag.Ignore = false
flag.Auctioning = false
flag.AnnounceDeath = true
flag.OmikujiReaction = false

glob.setAuction = setAuction
glob.autoAuction = autoAuction
glob.secretInit = secretInit
glob.oreCheckCount = oreCheckCount
glob.oreDeleteCount = oreDeleteCount

setInterval(time_signal, 200)

var prevclock = new Date()
function time_signal() {
    const clock = new Date()
    newDayOmikuji(clock)
    auctionSignal(clock)
    prevclock = clock
}
function newDayOmikuji(clock) {
    if (clock.getHours() == 0 && clock.getHours() != prevclock.getHours()) {
        bot.safechat('/omikuji', 9000)
    }
}

//hi
// 自分が入ったときの挨拶
bot.once('spawn', () => {
    // bot.safechat('hi', 1600)
})
// 最後に入ってきた人の hi に応答
var last_joined_player = null
bot.on('playerJoined', (player) => {
    last_joined_player = player.username
})

//normalchat
bot.on('chat', (username, message) => {
    if (bot.username === username) return
    onMessage(username, message, chat)

    //Auction
    if (message.match(/^>\s*(\d+)$/)) {
        const money = Number(RegExp.$1)
        if (flag.Auctioning) {
            bidAuction(username, money)
        } else {
            secretAuction(username, money)
        }
    }
    if (message.match(/^(Auction|オークション)$/i)) {
        setAuction(60)
    }
    if (message.match(/^(Auction|オークション) \s*(-?\w+)\s*$/i)) {
        setAuction(Number(RegExp.$2))
    }
})

//whisper
bot.on('whisper', (username, message) => {
    if (bot.username === username) bot.log('[botselfcommand]')
    onMessage(username, message, whisper)

    if (message.match(/^autoAuction \s*(-?\w+)\s*/i)) {
        autoAuction(username, Number(RegExp.$1))
    }
})

function onMessage(username, message, cb) {
    if (username == "Super_AI") return

    //hi
    if (username === last_joined_player) {
        if (message.match(/^(?:hi|hai|ひ|日|はい|へ|hi \(日\))$/))
            safechat('hi', 2000)
        last_joined_player = null
    }

    //Calculator
    if (message.match(/(.*)=$/)) {
        var calcMessage = glob.Calc(message)
        if (!calcMessage.match(/¬/)) safechat(calcMessage)
    }

    //Name Call
    if (message.match(glob.NAMECALL_REGEXP) || cb === whisper) {
        if (message.match(/omikuji$/)) {
            safechat("/omikuji")
        }

        //Follow
        if (message.match(/おいで$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                bot.log("[move] chat goto " + username)
                glob.goToPos(bot.players[username].entity.position)
            }
        }
        if (message.match(/ついてきて$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                bot.log("[move] chat follow " + username)
                glob.follow(bot.players[username].entity)
            }
        }
        if (message.match(/走ってきて$/)) {
            if (bot.players[username] && bot.players[username].entity) {
                bot.log("[move] chat chase " + username)
                glob.chase(bot.players[username].entity)
            }
        }
        if (message.match(/止まれ$/) || message.match(/とまれ$/)) {
            glob.stopMoving()
            bot.log("[move] chat stop ")
        }

        if (message.match(/返事/)) {
            safechat("はい")
        }

        if (message.match(/かわいい/)) {
            safechat("^_^")
        }
    }

    //OreFound
    if (message.match(/^採掘(?:記録|ログ)$/)) {
        safechat(oreCheckCount(username))
    } else if (message.match(/^採掘(?:記録|ログ) (.+)$/)) {
        safechat(oreCheckCount(RegExp.$1))
    } else if (message.match(/^採掘(?:記録|ログ)削除$/)) {
        safechat(oreDeleteCount(username))
    }

    //Music
    if (message.match(/^Music info/i) && glob.getState() == "music") {
        if (flag.Playlist) {
            safechat("今はプレイリスト" + glob.Playlist + ":" + glob.PlaylistIndex + "/" + glob.PlaylistFiles.length + "曲目の" + glob.currentMusic.title
                + "(" + glob.currentMusic.duration + "秒)を演奏中です。")
        } else {
            safechat("今は" + glob.currentMusic.title + "を演奏中です。")
        }
    }

    if (message.match(/^fire$/i)) {
        bot.log("[combat] sniper mode")
        flag.Sniper = true
    }

    if (message.match(/^fire stop$/i) || message.match(/^stop fire$/i)) {
        bot.log("[combat] stop sniper mode")
        flag.Sniper = false
    }

    //inventoly
    if (message.match(/^equip$/i)) {
        glob.checkArmor()
    }

    if (message.match(/^equip head$/i)) {
        glob.equipHead()
    }

    function safechat(output, delay) {
        cb(username, output, delay)
    }
}
function chat(username, message, delay) {
    bot.safechat(message, delay)
}
function whisper(username, message, delay) {
    bot.safechat("/msg " + username + " " + message, delay)
}

//omikuji
bot.on('omikuji', (username, message) => {
    if (bot.username === username) return
    if (!flag.OmikujiReaction) return

    if (message.match(/柑橘類/)) {
        bot.randomchat(['wwwww', 'ｗｗｗｗｗ', 'かわいそう', 'w', 'かw',
            "キャー", "柑橘w", "黄色い", "柑橘類の日", "おめでとう！", "可哀想", "か ん き つ る い",
            "いいね", "ʬʬʬ", "草", "🍊", username + "さんは柑橘類ね", "柑橘系" + username, message,
            "", "柑橘…", "柑橘な日もあるよ", "www", "ｗｗｗ", "卍柑橘卍", "柑橘様だ", "かかかかかｗ",
            "大吉＞中吉＞吉＞＞＞大凶＞＞＞＞＞＞＞＞＞＞＞＞柑橘類", "17333", "55", "カ ン キ ツ", "[柑橘]<" + username + ">[柑橘]",
            "オレンジ様だ", "レモン様だ", "今日の運勢「柑橘類」", "(笑)", "柑橘類（笑）"])
    }
})


//death
var is_dead = false
var dead_point = null
bot.on('death', () => {
    is_dead = true
    dead_point = bot.entity.position.floored()
    bot.log("dead at " + dead_point)
})
bot.on('spawn', () => {
    if (!is_dead) return
    if (flag.AnnounceDeath) bot.safechat("よろしければ遺品回収してください。" + dead_point)
    is_dead = false
})

//orefound
glob.miningCount = {}
flag.logMining = false
bot.on('orefound', (username, ore, countStr) => {
    if (!glob.miningCount[username])
        glob.miningCount[username] = {
            start: dateformat(new Date(), 'd::HH:MM:ss'),
            last: null,
            sum: 0,
            data: {}
        }
    ore = ore.replace("ores", "ore")
    const user = glob.miningCount[username]
    const data = user.data
    const countNum = Number(countStr)
    user.last = dateformat(new Date(), 'd::HH:MM:ss')
    if (!data[ore])
        data[ore] = 0
    user.sum += countNum
    data[ore] += countNum
    if (flag.logMining) bot.log("[orefound] " + username + " " + ore + " " + (data[ore] - countNum) + " -> " + data[ore] + "  (+" + countNum + ")")
})

function oreCheckCount(username) {
    if (!glob.miningCount[username]) {
        return (username + "さんの採掘記録はありません")
    }
    const user = glob.miningCount[username]
    const data = user.data
    var output = username + "さんの採掘記録 " + user.start + "から "
    Object.keys(data).forEach(function (key) {
        output += key.replace(" ", "_") + ":" + data[key] + "個, "
    })
    return (output)
}

function oreDeleteCount(username) {
    glob.miningCount[username] = false
    return (username + "さんの採掘記録を消しました")
}


//Auctions
glob.auctionCall = 15
var aucTimeCalled = false
var aucDeadline
var aucTimeSetting = 0
var maxBid = 0
var maxBidPlayer = ""

function auctionSignal(clock) {
    try {
        if (flag.Auctioning) {
            for (let i = 0; i < glob.autoBiddings.length; i++) {
                const item = glob.autoBiddings[i]
                if (item.username != maxBidPlayer && item.limit > maxBid) {
                    const nextBid = Math.min(item.limit, maxBid + Math.floor(maxBid * 0.05 + 1))// 5%+1 up
                    bidAuction(item.username, nextBid)
                    bot.safechat("[auto] " + item.username + " > " + nextBid)
                    break
                }
            }
            if (aucTimeSetting > glob.auctionCall && aucTimeCalled == false && aucDeadline.getTime() - clock.getTime() <= glob.auctionCall * 1000) {
                aucTimeCalled = true
                bot.chat(">残り" + glob.auctionCall + "秒未満です  現在Max: " + maxBidPlayer + " " + maxBid + " 締切: " + dateformat(aucDeadline, 'isoTime'))
            }
            if (clock.getTime() >= aucDeadline.getTime()) {//auction
                bot.chat(">時間です！ Max: " + maxBidPlayer + " " + maxBid)
                flag.Auctioning = false
                aucTimeSetting = 0
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
        bot.log("[Auction Bid Accept] " + username + " " + money)
    } else {
        bot.log("[Auction Bid Deny] " + username + " " + money)
    }
    setAuction(aucTimeSetting)
}

function setAuction(seconds) {
    try {
        if (seconds < 1) return
        aucDeadline = new Date()
        aucDeadline.setSeconds(aucDeadline.getSeconds() + seconds)
        if (!flag.Auctioning) { // init
            flag.Auctioning = true
            bot.chat(">オークションを開始しました: 最終入札(>[数値])から" + seconds + "秒まで")
            aucTimeSetting = seconds
            maxBid = 0
            maxBidPlayer = ""
            glob.autoBiddings = []
        }

        aucTimeSetting = seconds
        if (aucTimeSetting > glob.auctionCall) aucTimeCalled = false

        bot.log("[Auction] " + aucDeadline)
    } catch (e) {
        console.log(e)
    }
}

glob.autoBiddings = []
function autoAuction(username, limit) {
    bot.log("[Auction Auto] " + username + " " + limit)
    glob.autoBiddings.push({ username: username, limit: limit })
}


var secretMaxBidPlayer = ""
var secretMaxBid = 0
glob.secretLimit = 0
function secretInit(limit = -Infinity) {
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
                bot.safechat(">" + Math.min(glob.secretLimit, secretMaxBid + Math.floor(secretMaxBid * 0.05 + 1)))// 5%+1 up
            }
        }
    } catch (e) {
        console.log(e)
    }
}