flag.PearlGolf = false;

glob.golfPlayers = {}
glob.golfCource = 0
glob.golfGoal = new Vec3(0, 0, 0)
glob.allowGolfWalk = 5
glob.allowGolfDist = 2
glob.allowGolfEPS = 0.1
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
    ANNOUNCE("パールゴルフ初期化 : パール投げで参加受付中")
    glob.golfPlayers = {}
    glob.golfCource = 0;
    flag.PearlGolf = true;
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
        return
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
            detail: (glob.golfCource <= 1) ? "" : "|" + (glob.golfCource + "から|"),
            preprepos: pos,
            prevpos: pos,
            prevtick: pos,
            throwDate: Date.now(),
            stickDate: Date.now(),
            myPearlID: null,
            throwing: false,
            warping: false,
            falling: false,
            sticking: false
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
        const pos = bot.players[key].entity.position.clone()
        if (gp.throwing || gp.warping || gp.falling || gp.sticking)
            bot.log("[golf_verify] Transaction Exception " + key + " " + gp.throwing + "||" + gp.warping + "||" + gp.falling + "||" + gp.sticking)
        if (!gp.goaling && cnt && gp.courceThrowCnt != cnt)
            bot.log("[golf_verify] " + key + " throw count difference " + gp.courceThrowCnt)
        if (!gp.goaling && pos.xzDistanceTo(gp.prevpos) > glob.allowGolfWalk)
            bot.log("[golf_verify] " + key + " moved " + Math.floor(pos.xzDistanceTo(gp.prevpos)) + "m from " + gp.prevpos.floored() + " to " + pos.floored())
        if (pos.distanceTo(bot.entity.position) > glob.pearlViewDistance)
            bot.log("[golf_verify] " + key + " is far from me " + entity.position + " dist " + Math.floor(pos.distanceTo(bot.entity.position)))
    })
    bot.log("[golf_verify] " + playingPlayer)
    bot.log("[golf_verify] " + playedPlayer)

    saveGolf();
}

function startCourse(goal) {
    if (!goal) return
    if (flag.PearlGolf) return
    glob.golfGoal = goal.floored()
    glob.golfGoal.add(new Vec3(0.5, 0, 0.5))
    flag.PearlGolf = true;
    glob.golfCource++;
    Object.keys(glob.golfPlayers).forEach(function (key) {
        const gp = glob.golfPlayers[key]
        gp.courceThrowCnt = 0
        gp.goaling = false;
        if (bot.players[gp.username] && bot.players[gp.username].entity) {
            const pos = bot.players[key].entity.position.clone()
            gp.preprepos = pos.clone()
            gp.prevpos = pos.clone()
            gp.prevtick = pos.clone()
        } else {
            bot.log("[golf] not found player " + key)
        }
    })
    bot.log("[golf] new cource" + glob.golfCource + " goal: " + glob.golfGoal)
    ANNOUNCE("ホール " + glob.golfCource + " スタート！  ゴール地点: " + glob.golfGoal)

    saveGolf()
}

function endCourse() {
    if (!flag.PearlGolf) return
    flag.PearlGolf = false;

    var resultarr = []
    if (glob.golfCource == 0) {
        ANNOUNCE("プラクティスホール終了")
        Object.keys(glob.golfPlayers).forEach(function (key) {
            const gp = glob.golfPlayers[key]

            resultarr.push(gp)
        })
    } else {
        ANNOUNCE("ホール " + glob.golfCource + " 終了")
        Object.keys(glob.golfPlayers).forEach(function (key) {
            const gp = glob.golfPlayers[key]

            gp.sumThrowCnt += gp.courceThrowCnt
            if (!gp.goaling) gp.detail += "|" + glob.golfCource + "棄権|"
            resultarr.push(gp)
        })
    }

    resultarr.sort((a, b) => {
        return a.courceThrowCnt - b.courceThrowCnt
    })
    for (var i = 0; i < resultarr.length; i++) {
        var det = (resultarr[i].goaling || glob.golfCource == 0) ? "" : "|リタイア|"
        bot.log((i + 1) + ": " + resultarr[i].username + " " + resultarr[i].courceThrowCnt + "  " + det)
    }

    saveGolf()
}

function endGolf() {
    if (flag.PearlGolf) {
        bot.log("unable to end : playing golf now")
        return
    }
    var resultarr = []
    Object.keys(glob.golfPlayers).forEach(function (key) {
        const gp = glob.golfPlayers[key]
        resultarr.push(gp)
    })
    resultarr.sort((a, b) => {
        return a.sumThrowCnt - b.sumThrowCnt
    })
    bot.log("[golf] END GOLF")
    for (var i = 0; i < resultarr.length; i++) {
        bot.log((i + 1) + ": " + resultarr[i].username + " " + resultarr[i].sumThrowCnt + "  " + resultarr[i].detail)
    }

    saveGolf()
}

bot.on("entitySpawn", function (entity) {
    if (!flag.PearlGolf) return;
    if (entity.name == "ender_pearl") {
        var found = 0;
        var throwers = ""
        var nearestKey = ""
        var nearestDist = 100
        const epos = entity.position.clone();
        Object.keys(bot.players).forEach(function (key) {
            if (bot.players[key].entity) {
                const ppos = bot.players[key].entity.position.clone()
                const distance = ppos.xzDistanceTo(epos)
                if (distance < nearestDist) {
                    nearestKey = key
                    nearestDist = distance
                }
                if (distance < glob.allowGolfEPS) {
                    found++
                    throwers += " " + key
                    addPlayer(key)
                    const gp = glob.golfPlayers[key]
                    if (gp.goaling) return
                    if (gp.throwing || gp.warping || gp.falling || gp.sticking)
                        bot.log("[golf] Transaction Exception " + key + " " + gp.throwing + "||" + gp.warping + "||" + gp.falling + "||" + gp.sticking)
                    gp.throwing = true;
                    gp.myPearlID = entity.id;
                    gp.throwDate = Date.now();
                    gp.courceThrowCnt++
                    bot.log("[golf] " + key + " threw at " + ppos)
                    if (gp.prevpos.xzDistanceTo(ppos) > glob.allowGolfWalk) {
                        bot.log("[golf] " + key + " was far from prevpos (" + Math.floor(gp.prevpos.xzDistanceTo(ppos)) + "m)  from " + gp.prevpos.floored() + " to " + ppos.floored())
                    }
                    gp.preprepos = gp.prevpos
                    gp.prevpos = ppos
                }
            }
        })
        if (found == 0) {
            bot.log("[golf] Thrower Not Found Exception " + epos + " maybe " + nearestKey + " " + nearestDist + "m")
        } else if (found > 1) {
            bot.log("[golf] Cannot Detect One Exception " + found + " at " + epos.floored() + " " + throwers)
        }
    }
})

bot.on("entityGone", function (entity) {
    if (!flag.PearlGolf) return;
    if (entity.name == "ender_pearl") {
        Object.keys(glob.golfPlayers).forEach(function (key) {
            const gp = glob.golfPlayers[key]
            if (gp.myPearlID == entity.id) {
                gp.myPearlID = null;
                gp.warping = true;
            }
        })
    }
})

bot.on("entityHurt", function (entity) {
    if (!flag.PearlGolf) return;
    if (entity.username && glob.golfPlayers[entity.username] && glob.golfPlayers[entity.username].throwing) {
        glob.golfPlayers[entity.username].warping = true
    }
})

bot.on("entityMoved", function (entity) {
    if (!flag.PearlGolf) return;
    if (!entity.username) return
    const key = entity.username
    const gp = glob.golfPlayers[key]
    if (!gp) return
    if (gp.goaling) return
    const pos = entity.position.clone()
    if (gp.throwing && !gp.falling && !gp.sticking && (gp.warping || gp.prevtick.xzDistanceTo(pos) > glob.allowGolfDist)) {
        gp.warping = true
        bot.log("[golf]  " + key + " warped to " + pos)
        gp.falling = true
        setTimeout(() => {
            gp.sticking = true
        }, 1500)
    } else if (gp.sticking && gp.prevtick.distanceTo(pos) == 0) {
        gp.throwing = false
        gp.warping = false
        gp.falling = false
        gp.sticking = false
        gp.stickDate = Date.now()
        var waters = 0
        for (var i = -2; i <= 2; i++) {
            if (bot.blockAt(pos.offset(0, i, 0).name.match(/water/))) waters++;
        }
        if (waters >= 2) {
            gp.waterCnt++
            bot.log("[golf]    " + key + " falled in water : back to " + gp.prevpos + "  took " + (gp.stickDate - gp.throwDate) + "ms")
            announce(key + " さん：池ポチャ判定です。　元の場所:" + gp.prevpos.floored())
        } else {
            bot.log("[golf]   " + key + " falled to " + pos + "  took " + (gp.stickDate - gp.throwDate) + "ms")
            gp.prevpos = pos
            if (pos.xzDistanceTo(glob.golfGoal) < glob.allowGolfDist && pos.y > glob.golfGoal.y - 1) {
                bot.log("[golf] " + key + " GOAL " + pos)
                announce(key + " ゴール！ " + gp.courceThrowCnt)
                gp.goaling = true
            }
        }
    } else if (gp.prevtick.xzDistanceTo(pos) > glob.allowGolfWalk) {
        bot.log("[golf] " + key + " warped by not throwing " + Math.floor(gp.prevtick.xzDistanceTo(pos)) + "m from " + gp.prevpos.floored() + " to " + pos.floored())
    }
    gp.prevtick = pos
})

function saveGolf() {
    jsonfile.writeFile("golf_cache.json", {
        players: glob.golfPlayers,
        cource: glob.golfCource,
        playing: flag.PearlGolf,
        goal: glob.golfGoal
    })
    bot.log("[golf] Game Saved")
}

function loadGolf() {
    const data = jsonfile.readFileSync("golf_cache.json")
    glob.golfPlayers = data.players
    Object.keys(glob.golfPlayers).forEach(function (key) {
        const gp = glob.golfPlayers[key]
        gp.prevpos = new Vec3(gp)
        gp.prevtick = new Vec3(gp)
    })
    glob.golfCource = data.cource
    flag.PearlGolf = data.playing
    glob.golfGoal = new Vec3(data.goal)
    bot.log("[golf] Game Loaded")
}

function announce(msg) {
    if (flag.Ignore)
        bot.log("[ignored] " + msg)
    else
        bot.chat("[Golf] " + msg)
}

function ANNOUNCE(msg) {
    if (flag.Ignore)
        bot.log(">[ignored] " + msg)
    else
        bot.chat(">[Golf] " + msg)
}