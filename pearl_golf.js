
golf = {
    playing: false
}

golf.allowWalk = 5
golf.allowDist = 2
golf.allowEPS = 0.1
golf.pearlViewDistance = 60
golf.stickTime = 1500

golf.initGolfGame = initGolfGame
golf.startCourse = startCourse
golf.endCourse = endCourse
golf.endGolf = endGolf

golf.addPlayer = addPlayer
golf.leavePlayer = leavePlayer

golf.verifyGolf = verifyGolf
golf.checkTurn = checkTurn
golf.nextTurn = nextTurn

golf.saveGolf = saveGolf
golf.loadGolf = loadGolf

function initGolfGame() {
    ANNOUNCE("パールゴルフ初期化 : パール投げで参加受付中")
    golf.players = {}
    golf.cource = 0;
    golf.goal = new Vec3(0, 0, 0)
    golf.turn = 0;
    golf.results = {}
    golf.playing = true;
}

function addPlayer(username) {
    var pos;
    if (!bot.players[username].entity) {
        bot.log("[golf] cannot add player " + username)
        pos = new Vec3(0, 0, 0)
    } else {
        pos = bot.players[username].entity.position.clone()
    }

    if (golf.players[username]) {
        return
    } else {
        bot.log("[golf] new player " + username)
        announce(username + " さんの参加を受け付けました。")
        golf.players[username] = {
            username: username,
            joined: golf.cource,
            goaling: false,
            rated: golf.cource <= 1 ? true : false,//結果発表用
            comment: (golf.cource <= 1) ? "　" : (golf.cource + "から|"),//結果発表用
            alive: true,//監視するかどうか
            courceThrowCnt: 0,
            sumThrowCnt: 0,
            courceWaterCnt: 0,
            sumWaterCnt: 0,
            results: {},
            posArray: [],
            prevpos: pos,
            prevtick: pos,
            throwDate: new Date(),
            stickDate: new Date(),
            myPearlID: null,
            throwing: false,
            warping: false,
            falling: false,
            sticking: false
        }
    }
}

function leavePlayer(username) {
    const gp = golf.players[username]
    if (!gp) {
        bot.log("[golf] invalid username")
        return
    }
    bot.log("[golf] leave player " + username)
    gp.rated = false
    gp.alive = false
    gp.comment += (golf.playing ? golf.cource - 1 : golf.cource) + "まで|"
}

function canSee(gp) {
    const key = gp.username
    if (!bot.players[key] || !bot.players[key].entity) {
        bot.log("[golf_see] Not Found Player " + key)
        return false
    } else {
        return true
    }
}

function validTransaction(gp) {
    const key = gp.username
    if (gp.throwing || gp.warping || gp.falling || gp.sticking) {
        bot.log("[golf_transaction] Exception " + key + " " + gp.throwing + "||" + gp.warping + "||" + gp.falling + "||" + gp.sticking)
        return false
    } else {
        return true
    }
}

function onPrevPos(gp) {
    const key = gp.username
    const pos = bot.players[key].entity.position.clone()
    if (pos.xzDistanceTo(gp.prevpos) > golf.allowWalk) {
        bot.log("[golf_onPrevPos] " + key + " moved " + Math.floor(pos.xzDistanceTo(gp.prevpos)) + "m from " + gp.prevpos.floored() + " to " + pos.floored())
        return false
    } else {
        return true
    }
}

function inRange(gp) {
    const key = gp.username
    const pos = bot.players[key].entity.position.clone()
    if (pos.xzDistanceTo(bot.entity.position) > golf.pearlViewDistance) {
        bot.log("[golf_range] " + key + " is Far " + pos.floored() + " Dist " + Math.floor(pos.xzDistanceTo(bot.entity.position)))
        return false
    }
    return true
}

function verifyGolf(cnt) {
    bot.log("[golf_verify] VERIFY " + cnt)
    var playingPlayer = "未ゴール "
    var playedPlayer = "ゴール済 "
    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        if (!gp.alive) return
        if (gp.goaling) {
            playedPlayer += key + " "
            return
        }
        playingPlayer += key + " "

        if (canSee(gp)) {
            onPrevPos(gp)
            inRange(gp)
        }
        validTransaction(gp)
        if (!gp.goaling && cnt && gp.courceThrowCnt != cnt)
            bot.log("[golf_verify] " + key + " throw count difference " + gp.courceThrowCnt)
    })
    bot.log("[golf_verify] " + playingPlayer)
    bot.log("[golf_verify] " + playedPlayer)

    saveGolf();
}

function checkTurn() {
    if (golf.cource == 0)
        return
    var min = Infinity
    var max = 0
    var playing = false
    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        if (!gp.alive)
            return
        if (!gp.goaling)
            playing = true
        if (gp.courceThrowCnt < min) {
            min = gp.courceThrowCnt
        }
        if (gp.courceThrowCnt > max) {
            max = gp.courceThrowCnt
        }
    })
    if (golf.turn < min) {
        golf.turn = min
        bot.log("[golf_turn] min" + golf.turn + " -> " + min + " (max " + max + ")")
        if (playing) {
            announce("全員の " + golf.turn + " 投目が終了")
        } else {
            bot.log("[golf_turn] All Player Goaled")
            announce(golf.turn + " 投目が終了 全プレイヤーがゴール")
        }
        setTimeout(verifyGolf, golf.stickTime, golf.turn)
    }
}

function nextTurn(say = false) {
    var throwAbles = ""
    var farPlayers = ""
    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        if (!gp.alive || gp.goaling)
            return

        if (canSee(gp) && inRange(gp)) {
            throwAbles += gp.username + " "
        } else {
            farPlayers += gp.username + " "
        }
    })
    bot.log("[golf_throwable] " + throwAbles)
    bot.log("[golf_farplayer] " + farPlayers)
    if (say && farPlayers != "")
        ANNOUNCE(farPlayers + "さんは投げずに待っていてください")
}

function startCourse(goal) {
    if (!goal) {
        bot.log("need goal position")
        return
    }
    if (golf.playing) return
    golf.goal = goal.floored()
    golf.goal.add(new Vec3(0.5, 0, 0.5))
    golf.playing = true;
    golf.cource++;
    golf.turn = 0
    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        if (!gp.alive) {
            return
        }
        gp.courceThrowCnt = 0
        gp.courceWaterCnt = 0
        gp.goaling = false;
        if (canSee(gp)) {
            const pos = bot.players[key].entity.position.clone()
            gp.prevpos = pos.clone()
            gp.prevtick = pos.clone()
        }
    })
    bot.log("[golf] new cource" + golf.cource + " goal: " + golf.goal)
    ANNOUNCE("ホール " + golf.cource + " スタート！  ゴール地点: " + golf.goal)

    saveGolf()
}

function endCourse() {
    if (!golf.playing) return
    golf.playing = false;
    var resultarr = []
    golf.results[golf.cource] = {
        cource: golf.cource,
        goal: golf.goal,
        turn: golf.turn,
        counts: {}
    }
    var counts = golf.results[golf.cource].counts
    if (golf.cource == 0) {
        ANNOUNCE("プラクティスホール終了")
        Object.keys(golf.players).forEach(function (key) {
            const gp = golf.players[key]
            if (!gp.alive) {
                return
            }
            counts[key] = gp.courceThrowCnt
            resultarr.push(gp)
        })
    } else {
        ANNOUNCE("ホール " + golf.cource + " 終了")
        Object.keys(golf.players).forEach(function (key) {
            const gp = golf.players[key]
            if (!gp.alive) {
                return
            }
            counts[key] = gp.courceThrowCnt
            gp.sumThrowCnt += gp.courceThrowCnt
            gp.sumWaterCnt += gp.courceWaterCnt
            if (!gp.goaling) gp.comment += golf.cource + "棄権|"
            resultarr.push(gp)
        })
    }
    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        if (!gp.alive) {
            return
        }
        gp.results[golf.cource] = {
            throwCnt: gp.courceThrowCnt,
            posArray: gp.posArray,
            waterCnt: gp.courceWaterCnt
        }
        gp.posArray = []
    })

    resultarr.sort((a, b) => {
        return a.courceThrowCnt - b.courceThrowCnt
    })
    for (var i = 0; i < resultarr.length; i++) {
        bot.log((i + 1) + ": " + resultarr[i].username + " " + resultarr[i].courceThrowCnt + "  " + resultarr[i].comment)
    }

    saveGolf()
}

function endGolf() {
    if (golf.playing) {
        bot.log("unable to end : playing golf now")
        return
    }
    var resultarr = []
    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        if (gp.rated) {
            resultarr.push(gp)
        }
    })
    resultarr.sort((a, b) => {
        return a.sumThrowCnt - b.sumThrowCnt
    })
    bot.log("[golf] END GOLF")
    for (var i = 0; i < resultarr.length; i++) {
        bot.log((i + 1) + ": " + resultarr[i].username + " " + resultarr[i].sumThrowCnt + "  " + resultarr[i].comment)
    }
    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        if (!gp.rated) {
            bot.log(gp.username + " " + gp.sumThrowCnt + "  " + gp.comment)
        }
    })

    saveGolf()
}

bot.on("entitySpawn", function (entity) {
    if (!golf.playing) return;
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
                if (distance < golf.allowEPS) {
                    found++
                    throwers += " " + key
                    addPlayer(key)
                    const gp = golf.players[key]
                    if (!gp.alive || gp.goaling) return
                    validTransaction(gp)
                    gp.throwing = true;
                    gp.myPearlID = entity.id;
                    gp.throwDate = new Date();
                    gp.courceThrowCnt++
                    bot.log("[golf] " + key + " threw at " + ppos.floored())
                    onPrevPos(gp)
                    gp.posArray.push(ppos.clone())
                }
            }
        })
        if (found == 0) {
            bot.log("[golf_error] Thrower Not Found Exception at " + epos.floored() + " maybe " + nearestKey + " " + nearestDist + "m")
        } else if (found > 1) {
            bot.log("[golf_error] Cannot Detect One Exception " + found + " at " + epos.floored() + " " + throwers)
        }
    }
})

bot.on("entityGone", function (entity) {
    if (!golf.playing) return;
    if (entity.name == "ender_pearl") {
        Object.keys(golf.players).forEach(function (key) {
            const gp = golf.players[key]
            if (gp.myPearlID == entity.id) {
                gp.myPearlID = null;
                gp.warping = true;
            }
        })
    }
})

bot.on("entityHurt", function (entity) {
    if (!golf.playing) return;
    if (entity.username && golf.players[entity.username] && golf.players[entity.username].throwing) {
        golf.players[entity.username].warping = true
    }
})

bot.on("entityMoved", function (entity) {
    if (!golf.playing) return;
    if (!entity.username || !golf.players[entity.username]) return
    const key = entity.username
    const gp = golf.players[key]
    if (!gp.alive || gp.goaling) return
    const pos = entity.position.clone()
    if (gp.throwing && !gp.falling && !gp.sticking && (gp.warping || gp.prevtick.xzDistanceTo(pos) > golf.allowDist)) {
        gp.warping = true
        bot.log("[golf]  " + key + " warped to " + pos.floored())
        gp.falling = true
        setTimeout(() => {
            gp.sticking = true
        }, golf.stickTime)
    } else if (gp.sticking && gp.prevtick.distanceTo(pos) == 0) {
        gp.throwing = false
        gp.warping = false
        gp.falling = false
        gp.sticking = false
        gp.stickDate = new Date()
        var waters = 0
        for (var i = -2; i <= 2; i++) {
            if (bot.blockAt(pos.offset(0, i, 0)).name.match(/water/)) waters++;
        }
        if (waters >= 2) {
            gp.courceWaterCnt++
            bot.log("[golf]    " + key + " falled in water " + pos.floored() + " : back to " + gp.prevpos.floored() + "  took " + (gp.stickDate - gp.throwDate) + "ms")
            announce(key + " さん：池ポチャ判定です。　投げた場所:" + gp.prevpos.floored())
        } else {
            bot.log("[golf]   " + key + " falled to " + pos.floored() + "  took " + (gp.stickDate - gp.throwDate) + "ms")
            if (pos.xzDistanceTo(golf.goal) < golf.allowDist && pos.y > golf.goal.y - 1) {
                bot.log("[golf] " + key + " GOAL " + pos)
                announce(key + " ゴール！ " + gp.courceThrowCnt)
                gp.goaling = true
            }            
            gp.prevpos = pos
        }
        checkTurn()
    } else if (gp.prevtick.xzDistanceTo(pos) > golf.allowWalk) {
        bot.log("[golf_transaction] " + key + " warped by not throwing " + Math.floor(gp.prevtick.xzDistanceTo(pos)) + "m from " + gp.prevpos.floored() + " to " + pos.floored())
    }
    gp.prevtick = pos
})

function saveGolf() {
    jsonfile.writeFile("golf_cache.json", golf)
    bot.log("[golf] Game Saved")
}

function loadGolf() {
    const data = jsonfile.readFileSync("golf_cache.json")

    golf.playing = data.playing
    golf.players = data.players
    golf.cource = data.cource
    golf.goal = new Vec3(data.goal)
    golf.turn = data.turn
    golf.results = data.results

    Object.keys(golf.players).forEach(function (key) {
        const gp = golf.players[key]
        gp.prevpos = new Vec3(gp.prevpos)
        gp.prevtick = new Vec3(gp.prevtick)
    })
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