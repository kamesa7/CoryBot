glob.isPearlGolfMode = false;
glob.golfPlayers = {}
glob.golfCource = 0
glob.golfGoal = new Vec3(0, 0, 0)
glob.allowGolf = 2
glob.pearlViewDistance = 60

glob.initGolfGame = initGolfGame
glob.startCourse = startCourse
glob.endCourse = endCourse
glob.endGolf = endGolf
glob.addPlayer = addPlayer
glob.verifyGolf = verifyGolf

glob.saveGolf = saveGolf
glob.loadGolf = loadGolf

function initGolfGame() {
    announce("パールゴルフ初期化 : パール投げで参加受付中")
    glob.golfPlayers = {}
    glob.golfCource = 0;
    glob.isPearlGolfMode = true;
}

function addPlayer(username) {
    var pos;
    if (!bot.players[username].entity) {
        bot.log("[golf] cannot add player " + username)
        pos = new Vec3(0, 0, 0)
    } else {
        pos = bot.players[username].entity.position.clone()
    }

    if (glob.golfPlayers[username]) {

    } else {
        bot.log("[golf] new player " + username)
        announce(username + " さんの参加を受け付けました。")
        glob.golfPlayers[username] = {
            username: username,
            joined: glob.golfCource,
            goaling: false,
            courceThrowCnt: 0,
            sumThrowCnt: 0,
            waterCnt: 0,
            detail: (glob.golfCource <= 1) ? "" : (glob.golfCource + "から "),
            prevpos: pos,
            prevtick: pos,
            myPearlID: null,
            throwing: false,
            warping: false,
            falling: false,
        }
    }
}

function verifyGolf(cnt) {
    bot.log("[golf_verify] VERIFY " + cnt)
    var playingPlayer = "未ゴール "
    var playedPlayer = "ゴール済 "
    Object.keys(glob.golfPlayers).forEach(function (key) {
        const gp = glob.golfPlayers[key]        
        if (gp.goaling)
            playedPlayer += key + " "
        else
            playingPlayer += key + " "
            
        if (!bot.players[key] || !bot.players[key].entity) {
            bot.log("[golf_verify] not found player " + key)
            return
        }
        const entity = bot.players[key].entity
        if (gp.throwing || gp.warping || gp.falling)
            bot.log("[golf_verify] " + key + " transaction exception " + gp.throwing + "||" + gp.warping + "||" + gp.falling)
        if (!gp.goaling && cnt && gp.courceThrowCnt != cnt)
            bot.log("[golf_verify] " + key + " throw count difference " + gp.courceThrowCnt)
        if (!gp.goaling && XZdistance(entity.position, gp.prevpos) > glob.allowGolf)
            bot.log("[golf_verify] " + key + " moved " + XZdistance(entity.position, gp.prevpos) + " from " + gp.prevpos.floored() + " to " + entity.position.floored())
        if (entity.position.distanceTo(bot.entity.position) > glob.pearlViewDistance)
            bot.log("[golf_verify] " + key + " is far from me " + entity.position + " dist " + entity.position.distanceTo(bot.entity.position))
    })
    bot.log("[golf_verify] " + playingPlayer)
    bot.log("[golf_verify] " + playedPlayer)
}

function startCourse(goal) {
    if (!goal) return
    if (glob.isPearlGolfMode) return
    glob.golfGoal = goal.floored()
    glob.golfGoal.add(new Vec3(0.5, 0, 0.5))
    glob.isPearlGolfMode = true;
    glob.golfCource++;
    Object.keys(glob.golfPlayers).forEach(function (key) {
        const gp = glob.golfPlayers[key]
        gp.courceThrowCnt = 0
        if (bot.players[gp.username] && bot.players[gp.username].entity) {
            gp.prevpos = bot.players[key].entity.position.clone()
            gp.goaling = false;
        } else {
            bot.log("[golf] not found player " + key)
            announce(key + " さんが見つかりません")
        }
    })
    bot.log("[golf] new cource" + glob.golfCource + " goal: " + glob.golfGoal)
    announce("ホール " + glob.golfCource + " スタート！  ゴール地点: " + glob.golfGoal)

    saveGolf()
}

function endCourse() {
    if (!glob.isPearlGolfMode) return
    glob.isPearlGolfMode = false;

    var resultarr = []
    if (glob.golfCource == 0) {
        announce("プラクティスホール")
        Object.keys(glob.golfPlayers).forEach(function (key) {
            const gp = glob.golfPlayers[key]
            resultarr.push(gp)
        })
    } else {
        announce("ホール " + glob.golfCource + " 終了")
        Object.keys(glob.golfPlayers).forEach(function (key) {
            const gp = glob.golfPlayers[key]
            gp.sumThrowCnt += gp.courceThrowCnt
            if (!gp.goaling) gp.detail += glob.golfCource + "棄権 "
            resultarr.push(gp)
        })
    }

    resultarr.sort((a, b) => {
        return a.courceThrowCnt - b.courceThrowCnt
    })
    for (var i = 0; i < resultarr.length; i++) {
        var det = (resultarr[i].goaling || glob.golfCource == 0) ? "" : " リタイア"
        announce((i + 1) + ": " + resultarr[i].username + " " + resultarr[i].courceThrowCnt + "  " + det)
    }

    saveGolf()
}

function endGolf() {
    if (glob.isPearlGolfMode) return
    var resultarr = []
    Object.keys(glob.golfPlayers).forEach(function (key) {
        const gp = glob.golfPlayers[key]
        resultarr.push(gp)
    })
    resultarr.sort((a, b) => {
        return a.sumThrowCnt - b.sumThrowCnt
    })
    announce("結果発表")
    for (var i = 0; i < resultarr.length; i++) {
        announce((i + 1) + ": " + resultarr[i].username + " " + resultarr[i].sumThrowCnt + "  " + resultarr[i].detail)
    }

    saveGolf()
}

bot.on("entitySpawn", function (entity) {
    if (!glob.isPearlGolfMode) return;
    if (entity.name == "ender_pearl") {
        var found = 0;
        Object.keys(bot.players).forEach(function (key) {
            if (bot.players[key].entity) {
                const distance = XZdistance(bot.players[key].entity.position, entity.position)
                if (distance < 0.1) {
                    found++
                    addPlayer(key)
                    const gp = glob.golfPlayers[key]
                    const pos = bot.players[key].entity.position.clone()
                    if (gp.goaling) return
                    if (gp.throwing || gp.warping || gp.falling)
                        bot.log("[golf] Transaction Exception " + key + " " + gp.throwing + "||" + gp.warping + "||" + gp.falling)
                    gp.throwing = true;
                    gp.myPearlID = entity.id;
                    gp.courceThrowCnt++
                    bot.log("[golf] " + key + " threw at " + bot.players[key].entity.position)
                    if (XZdistance(gp.prevpos, pos) > glob.allowGolf) {
                        bot.log("[golf] " + key + " was at defferent place " + XZdistance(gp.prevpos, pos) + " from " + gp.prevpos.floored() + " to " + pos.floored())
                    }
                    gp.prevpos = pos
                }
            }
        })
        if (found == 0) {
            bot.log("[golf] Thrower Not Found Exception " + entity.position)
        } else if (found > 1) {
            bot.log("[golf] Cannot Detect One Exception " + found + "  " + entity.position)
        }
    }
})

bot.on("entityGone", function (entity) {
    if (!glob.isPearlGolfMode) return;
    if (entity.name == "ender_pearl") {
        Object.keys(glob.golfPlayers).forEach(function (key) {
            const gp = glob.golfPlayers[key]
            if (gp.myPearlID == entity.id) {
                gp.myPearlID = null;
            }
        })
    }
})

bot.on("entityHurt", function (entity) {
    if (!glob.isPearlGolfMode) return;
    if (entity.username && glob.golfPlayers[entity.username] && glob.golfPlayers[entity.username].throwing) {
        glob.golfPlayers[entity.username].warping = true
    }
})

bot.on("entityMoved", function (entity) {
    if (!glob.isPearlGolfMode) return;
    if (!entity.username) return
    const key = entity.username
    const gp = glob.golfPlayers[key]
    if (!gp) return
    if (gp.goaling) return
    const pos = entity.position.clone()
    if (gp.throwing && (gp.warping || XZdistance(gp.prevtick, pos) > glob.allowGolf)) {
        if (gp.prevpos.distanceTo(pos) != 0) {
            bot.log("[golf]  " + key + " warped to " + pos)
            gp.warping = false
            gp.throwing = false
            gp.falling = true
        }
    } else if (gp.falling) {
        if (bot.blockAt(pos.plus(new Vec3(0, 1, 0))).name.match(/water/)) {
            bot.log("[golf]   " + key + " falled to " + pos)
            gp.falling = false
            gp.waterCnt++
            bot.log("[golf]    " + key + " falled in water : back to " + gp.prevpos)
            announce(key + " さん：池ポチャ判定です。　元の場所:" + gp.prevpos.floored())
        } else if (gp.prevtick.y == pos.y) {
            bot.log("[golf]   " + key + " falled to " + pos)
            gp.falling = false
            gp.prevpos = pos
            if (XZdistance(pos, glob.golfGoal) < glob.allowGolf) {
                bot.log("[golf] " + key + " GOAL " + pos)
                announce(key + " ゴール！")
                gp.goaling = true
            }
        }
    } else if (XZdistance(gp.prevtick, pos) > glob.allowGolf) {
        bot.log("[golf] " + key + " moved " + XZdistance(gp.prevtick, pos) + " from " + gp.prevpos.floored() + " to " + pos.floored())
    }
    gp.prevtick = pos
})

function XZdistance(pos1, pos2) {
    return Math.sqrt((pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.z - pos2.z) * (pos1.z - pos2.z))
}

function saveGolf() {
    jsonfile.writeFile("golf_cache.json", {
        players: glob.golfPlayers,
        cource: glob.golfCource,
        playing: glob.isPearlGolfMode,
        goal: glob.golfGoal
    })
    bot.log("[golf] Game Saved")
}

function loadGolf() {
    const data = jsonfile.readFileSync("golf_cache.json")
    glob.golfPlayers = data.players
    Object.keys(glob.golfPlayers).forEach(function (key) {
        const gp = glob.golfPlayers[key]
        gp.prevpos = new Vec3(gp.prevpos.x, gp.prevpos.y, gp.prevpos.z)
        gp.prevtick = new Vec3(gp.prevtick.x, gp.prevtick.y, gp.prevtick.z)
    })
    glob.golfCource = data.cource
    glob.isPearlGolfMode = data.playing
    glob.golfGoal = new Vec3(data.goal.x, data.goal.y, data.goal.z)
    bot.log("[golf] Game Loaded")
}

function announce(msg) {
    if (glob.isIgnoreMode)
        bot.log("[ignored] " + msg)
    else
        bot.chat("[Golf] " + msg)
}