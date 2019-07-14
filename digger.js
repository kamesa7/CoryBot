
glob.digBlockAt = digBlockAt
glob.stopDigging = stopDigging
glob.mining = mining

glob.logDig = false

glob.miningInterval = 150
glob.miningWorkProgress = 50

const shovel = [277, 256, 273, 269, 284]
const pickaxe = []
const axe = []
const shears = 359

for (let i = 0; i < shovel.length; i++) {
    pickaxe.push(shovel[i] + 1)
    axe.push(shovel[i] + 2)
}

function digBlockAt(pos, cb = noop) {
    pos = pos.floored();
    const block = bot.blockAt(pos)
    if (!block || !block.material || !bot.canDigBlock(block)) {
        cb("[dig] unable to dig block at " + pos)
        return
    }
    let tool = null
    switch (block.material) {
        case "dirt":
            tool = glob.findItem(shovel)
            break
        case "rock":
            tool = glob.findItem(pickaxe)
            break
        case "plant":
            tool = glob.findItem(axe)
            break
        case "web":
        case "wool": tool = glob.findItem(shears)
            break
        default:
            cb("[dig] invalid block material")
            return
    }
    if (tool) {
        bot.equip(tool, "hand", (err) => {
            if (err) {
                bot.log(err)
            }
            doDig()
        })
    } else {
        doDig()
    }

    function doDig() {
        let time = bot.digTime(block)
        if (glob.logDig) bot.log("[dig] dig " + block.name + " at " + pos + " by " + ((tool) ? tool.name : "hand") + " digtime " + time + "ms")
        bot.dig(block, (err) => {
            if (err) bot.log(err)
        })
    }

    bot.once("diggingCompleted", (block) => {
        cb()
    })
    bot.once("diggingAborted", (block) => {
        cb("[dig] diggingAborted")
    })
}


/* not my digging */
// bot.on("blockBreakProgressObserved", (block, destroyStage) => {
//     if (glob.logDig) bot.log("[dig] blockBreaking " + destroyStage)
// })
// bot.on("blockBreakProgressEnd", (block) => {
//     if (glob.logDig) bot.log("[dig] blockBroken")
// })

function stopDigging() {
    glob.stopMoving()
    clearInterval(miner)
    if(glob.logDig)
        bot.log("[dig] stop digging")
}

var miner;
function mining(direction, length = 100) {
    clearInterval(miner)
    var dir
    switch (direction) {
        case "n": dir = new Vec3(0, 0, -1)
            break
        case "s": dir = new Vec3(0, 0, 1)
            break
        case "w": dir = new Vec3(1, 0, 0)
            break
        case "e": dir = new Vec3(-1, 0, 0)
            break
        default:
            dir = new Vec3(0, -1, 0)
    }
    var origin = bot.entity.position.floored()
    var miningState = "mining";
    var digging = new Vec3(0, 0, 0);
    var minedLength = 0;
    var prevMinedLength = 0;
    miner = setInterval(miningControl, glob.miningInterval)
    function miningControl() {
        switch (miningState) {
            case "movewait":
                if (!glob.doNothing()) return;
                glob.goToPos(origin.plus(digging), {
                    ignore: !glob.logDig,
                    allowGoal: 3,
                    standadjust: 0,
                    strictfin: true,
                    bridgeable: true,
                    scaffordable: true,
                    continue: false,
                })
                miningState = "move"
                break
            case "move":
                if (!glob.doNothing()) return;
                miningState = "miningWait"
                break
            case "miningWait":
                if (!glob.doNothing()) return;
                let type = bot.blockAt(origin.plus(digging)).type
                glob.tryState("mining", digBlockAt, origin.plus(digging), (err) => {
                    if (err) bot.log(err)
                    glob.finishState("mining")
                    if (type == 12 || type == 13 || type == 251) {
                        miningState = "gravel"
                        setTimeout(() => {
                            miningState = "mining"
                        }, 300)
                    } else {
                        miningState = "mining"
                    }
                })
                break
            case "gravel":
                break
            case "mining":
                if (!glob.doNothing()) return;
                digging = new Vec3(0, 0, 0)
                while (true) {
                    let block = bot.blockAt(origin.plus(digging))
                    if (block && block.boundingBox != "empty") break
                    if (digging.y == 0) {
                        digging.y = 1
                    } else {
                        digging.y = 0
                    }
                    if (bot.blockAt(origin.offset(digging.x, 0, digging.z)).boundingBox == "empty"
                        && bot.blockAt(origin.offset(digging.x, 1, digging.z)).boundingBox == "empty"
                    ) {
                        digging.add(dir)
                        minedLength = digging.distanceTo(new Vec3(0, 0, 0))
                        if (minedLength > length) {
                            clearInterval(miner)
                            bot.log("[mining] Mining Finished  " + length)
                            return
                        }
                    }
                }
                if (minedLength - prevMinedLength >= glob.miningWorkProgress) {
                    bot.log("[mining] Construction " + minedLength + " " + (100 * minedLength / length) + "% ")
                    prevMinedLength = minedLength
                }
                miningState = "movewait";
                break;
        }
    }
}


function noop(err) {
    //do nothing special
}