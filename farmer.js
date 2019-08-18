flag.logFarm = false;
glob.farmInterval = 750
glob.farmReCheckInterval = 5000

flag.LongReeds = true

glob.stopFarm = stopFarm
glob.farm = farm
var farmer;

bot.on('death', () => {
    stopFarm()
});

function stopFarm() {
    glob.stopMoving()
    if (farmer && !farmer._destroyed) {
        bot.log("[farm] Stop Farm")
    }
    clearInterval(farmer)
}

function farm(argOrigin, argSize) {
    const origin = argOrigin.floored()
    const size = argSize.floored()
    stopFarm()
    bot.log("[farm] Start Farm  at: " + origin + " size: " + size)
    const placing = new Vec3(0, 0, 0)
    var farmState = "check"
    var seeds = ""
    var waiter = null
    farmer = setInterval(farmControl, glob.farmInterval)
    function farmControl() {
        if (!glob.doNothing()) return;
        switch (farmState) {
            case "check":
                let res = nearestFarm(origin, size, placing)
                if (!res) {
                    farmState = "wait"
                    return;
                }
                glob.goToPos(origin.plus(placing), {
                    ignore: !flag.logFarm,
                    allowGoal: 0,
                    standadjust: 3,
                    jumpoverable: false,
                    strictfin: true,
                    continue: false
                })
                farmState = "harvest"
                return;
            case "harvest":
                seeds = checkHarvestable(origin.plus(placing))
                glob.queueOnceState("harvest", () => {
                    if (flag.logFarm) bot.log("[farm] harvest " + blockdata(bot.blockAt(origin.plus(placing))))
                    glob.digBlockAt(origin.plus(placing), (err) => {
                        if (err) {
                            bot.log(err)
                            farmState = "check"
                        }
                        glob.finishState("harvest")
                    })
                })
                if (typeof seeds == "string") {
                    farmState = "sowing"
                } else {
                    farmState = "check"
                }
                return;
            case "sowing":
                let item = glob.findItem(mcData.itemsByName[seeds].id)
                if (!item) {
                    bot.log("[farm] No Seeds item at " + origin.plus(placing))
                    farmState = "check"
                    return
                }
                glob.queueOnceState("sowing", () => {
                    if (flag.logFarm) bot.log("[farm] sowing " + seeds)
                    item = glob.findItem(mcData.itemsByName[seeds].id)
                    glob.placeBlockAt(item, origin.plus(placing), (err) => {
                        if (err) {
                            bot.log(err)
                        }
                        glob.finishState("sowing")
                    })
                })
                farmState = "check"
                return;
            case "wait":
                if (waiter == null) waiter = new Date().getTime();
                if (new Date().getTime() - waiter > glob.farmReCheckInterval) {
                    farmState = "check"
                    waiter = null
                }
                return;
        }
    }
}

function checkHarvestable(pos) {
    var B1 = bot.blockAt(pos)
    if (B1 == null) {
        bot.log("[farm] error at " + pos)
        return false
    }

    switch (B1.name) {
        case "wheat":
            if (B1.metadata == 7) return "wheat_seeds"
            else return false
        case "potatoes":
            if (B1.metadata == 7) return "potato"
            else return false
        case "carrots":
            if (B1.metadata == 7) return "carrot"
            else return false
        case "beetroots":
            if (B1.metadata == 3) return "beetroot_seeds"
            else return false
        case "nether_wart":
            if (B1.metadata == 3) return "nether_wart"
            else return false
        case "pumpkin":
            return true
        case "melon_block":
            return true
        case "reeds":
            var B0 = bot.blockAt(pos.offset(0, -1, 0))
            if (flag.LongReeds) {
                var B2 = bot.blockAt(pos.offset(0, 1, 0))
                if (B0 && B0.name == "reeds" && B2 && B2.name == "reeds") return true
            } else {
                if (B0 && B0.name == "reeds") return true
            }
            return false
        default:
            return false
    }
}

const roundPos = [
    new Vec3(0, -1, 0),
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
    new Vec3(0, 1, 0)
]

function nearestFarm(origin, size, placing) {
    var ck = nearestPlacing(origin, size)
    var expanded = []
    var lastIndex = 0
    var index = 0
    expand(ck)
    while (index < expanded.length) {
        let explength = expanded.length
        for (let i = index; i < explength; i++) { // check
            let pos = expanded[i];
            let seeds = checkHarvestable(origin.plus(pos))
            if (seeds) { // find
                placing.update(pos)
                return seeds;
            }
        }

        for (let i = index; i < explength; i++) { // expand
            let pos = expanded[i];
            expand(pos)
        }
        lastIndex = index
        index = explength
    }
    return false;

    function expand(target) {
        for (let r = 0; r < roundPos.length; r++) {
            let exp = target.plus(roundPos[r])
            if (exp.y < 0 || exp.z < 0 || exp.x < 0 ||
                exp.y >= size.y || exp.z >= size.z || exp.x >= size.x)
                continue
            let i
            for (i = lastIndex; i < expanded.length; i++) {
                if (exp.equals(expanded[i])) break
            }
            if (i == expanded.length) expanded.push(exp)
        }
    }


    function nearestPlacing() {
        const me = bot.entity.position.minus(origin).floor().offset(0, -1, 0)
        if (me.x < 0) me.x = 0
        if (me.y < 0) me.y = 0
        if (me.z < 0) me.z = 0
        if (me.x >= size.x) me.x = size.x - 1
        if (me.y >= size.y) me.y = size.y - 1
        if (me.z >= size.z) me.z = size.z - 1
        return me
    }
}

function blockdata(block) {
    return block.name + " " + block.position
}