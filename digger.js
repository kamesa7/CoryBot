
glob.digBlockAt = digBlockAt
glob.stopDigging = stopDigging
glob.mining = mining
glob.quarry = quarry

glob.logDig = false

glob.diggingInterval = 150
glob.diggingWorkProgress = 50

var digger;

const shovel = [277, 256, 273, 269, 284]
const pickaxe = []
const axe = []
const shears = 359

const diamondDamageLimit = 1500

const overpassBlock = [4, 1, 3]
const checkUp = [
    new Vec3(0, -1, 0),
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
    new Vec3(0, 1, 0)
]

const shieldMining = [
    new Vec3(0, -1, 0),
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
    new Vec3(1, 1, 0),
    new Vec3(-1, 1, 0),
    new Vec3(0, 1, 1),
    new Vec3(0, 1, -1),
    new Vec3(0, 2, 0)
]

for (let i = 0; i < shovel.length; i++) {
    pickaxe.push(shovel[i] + 1)
    axe.push(shovel[i] + 2)
}

var protectDiamondTool = (item) => { return item.metadata < diamondDamageLimit ? true : false }

function digBlockAt(pos, cb = noop) {
    pos = pos.floored();
    const block = bot.blockAt(pos)
    if (!block || !block.material || !bot.canDigBlock(block)) {
        if (block) cb("[dig] unable to dig " + block.name + " at " + pos)
        else cb("[dig] unable to dig block at " + pos)
        return
    }
    let tool = null
    switch (block.material) {
        case "dirt":
            tool = glob.findItem(shovel, undefined, protectDiamondTool)
            break
        case "rock":
            tool = glob.findItem(pickaxe, undefined, protectDiamondTool)
            break
        case "plant":
            tool = glob.findItem(axe, undefined, protectDiamondTool)
            break
        case "web":
        case "wool": tool = glob.findItem(shears)
            break
        default:
            bot.log("[dig] invalid block material")
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

bot.on('death', () => {
    stopDigging()
});

function stopDigging() {
    glob.stopMoving()
    if (digger && !digger._destroyed) {
        if (minedLength > 0) {
            bot.log("[dig] stop digging : mined " + minedLength + "m")
            minedLength = 0
        }
        if (quarryBlocks > 0) {
            bot.log("[dig] stop digging : quarry " + quarryBlocks + "blocks")
            quarryBlocks = 0
        }
    }
    clearInterval(digger)
}

var minedLength = 0;
function mining(d, length = 100) {
    stopDigging()
    var direction
    switch (d) {
        case "N": case "n": direction = new Vec3(0, 0, -1)
            break
        case "S": case "s": direction = new Vec3(0, 0, 1)
            break
        case "E": case "e": direction = new Vec3(1, 0, 0)
            break
        case "W": case "w": direction = new Vec3(-1, 0, 0)
            break
        default:
            direction = new Vec3(0, -1, 0)
    }
    bot.log("[mining] Mining Start  Direction:" + d + " Length:" + length)
    var origin = bot.entity.position.floored()
    bot.log("[mining] From:" + origin + " To:" + origin.plus(direction.scaled(length)))
    var miningState = "check";
    var digging = new Vec3(0, 0, 0);
    minedLength = 0;
    var prevMinedLength = 0;
    digger = setInterval(miningControl, glob.diggingInterval)
    function miningControl() {
        switch (miningState) {
            case "move":
                if (!glob.doNothing()) return;
                glob.goToPos(origin.plus(digging), {
                    ignore: !glob.logDig,
                    allowGoal: 3,
                    standadjust: 0,
                    strictfin: true,
                    continue: false,
                })
                miningState = "mining"
                break
            case "mining":
                if (!glob.doNothing()) return;
                let block = bot.blockAt(origin.plus(digging))
                if (!block) break
                let type = block.type
                glob.queueOnceState("mining", digBlockAt, origin.plus(digging), (err) => {
                    if (err) {
                        bot.log(err)
                        glob.goToPos(origin.plus(digging), {
                            allowGoal: 5,
                            rejectGoal: 4,
                            standadjust: 1,
                            strictfin: true,
                            continue: false,
                        })
                    }
                    if (err || type == 12 || type == 13 || type == 251) {
                        miningState = "gravel"
                        setTimeout(() => {
                            miningState = "check"
                        }, 300)
                    } else {
                        miningState = "check"
                    }
                    glob.finishState("mining")
                })
                break
            case "gravel":
                break
            case "check":
                if (!glob.doNothing()) return;

                for (let i = 0; i < checkUp.length; i++) {
                    let pos = origin.plus(digging).plus(checkUp[i])
                    let block = bot.blockAt(pos)
                    if (block && block.name.match(/_ore$/)) {
                        bot.log("[mining] Found " + block.name + " at " + bot.entity.position.floored())
                    }
                }

                digging = digging.minus(direction.scaled(Math.floor(Math.min(minedLength, 3))))
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
                        const stand = origin.offset(digging.x, -1, digging.z)
                        if (bot.blockAt(stand).boundingBox != "block") {
                            bot.log("[mining] place overpass")
                            glob.goToPos(stand, {
                                ignore: !glob.logDig,
                                allowGoal: 4,
                                standadjust: 0,
                                strictfin: true,
                                continue: false,
                            })
                            miningState = "bridge"
                            return
                        } else {
                            digging.add(direction)
                            minedLength = Math.floor(digging.norm())
                            if (minedLength > length) {
                                stopDigging()
                                bot.log("[mining] Mining Finished  " + length)
                                return
                            }
                        }
                    }
                }
                if (minedLength - prevMinedLength >= glob.diggingWorkProgress) {
                    bot.log("[mining] Mining " + minedLength + "m " + Math.floor(100 * minedLength / length) + "% at " + bot.entity.position.floored())
                    prevMinedLength = minedLength
                }
                miningState = "move";
                break;
            case "bridge":
                if (!glob.doNothing()) return;
                const stand = origin.offset(digging.x, -1, digging.z)
                let item = glob.findItem(overpassBlock)
                if (!item) {
                    bot.log("[mining] No overpass Block")
                    glob.stopDigging()
                    return
                }
                glob.queueOnceState("bridge", function () {
                    glob.placeBlockAt(item, stand, (err) => {
                        if (err) bot.log(err)
                        glob.finishState("bridge")
                    })
                })
                miningState = "check"
                break;
        }
    }
}

var quarryBlocks = 0
function quarry(size, origin = bot.entity.position.offset(0, 1, 0)) {
    origin.floor()
    bot.log("[quarry] Quarry Start  size " + size + " at " + origin)
    var depth = 0
    var digging = quarryNext()
    var quarryState = "move"
    var sizeSum = size.x * size.y * size.z
    quarryBlocks = 0
    digger = setInterval(quarryControl, glob.diggingInterval)
    function quarryControl() {
        switch (quarryState) {
            case "move":
                if (!glob.doNothing()) return
                glob.goToPos(origin.plus(digging), {
                    ignore: !glob.logDig,
                    allowGoal: 3,
                    standadjust: 0,
                    bridgeable: true,
                    buildstairable: true,
                    scaffordable: true,
                    strictfin: true,
                    continue: false,
                })
                quarryState = "quarry"
                break;
            case "quarry":
                if (!glob.doNothing()) return
                glob.queueOnceState("quarry", digBlockAt, origin.plus(digging), (err) => {
                    if (err) bot.log(err)
                    else quarryBlocks++;

                    if (quarryBlocks % glob.diggingWorkProgress == 0) {
                        bot.log("[quarry] Quarry " + quarryBlocks + "blocks " + Math.floor(100 * quarryBlocks / sizeSum) + "% at " + bot.entity.position.floored())
                    }

                    digging = quarryNext()
                    if (digging == null) {
                        bot.log("[quarry] Quarry Finished")
                        stopDigging()
                        glob.finishState("quarry")
                        return
                    }
                    quarryState = "move"
                    glob.finishState("quarry")
                })
                break;
        }
    }
    function quarryNext() {
        let nearest = null
        const distDigging = bot.entity.position.floored().minus(origin)
        for (let y = depth; y > -size.y; y -= 2) {
            depth = y
            for (let z = 0; z < size.z; z++) {
                for (let x = 0; x < size.x; x++) {
                    let pos1 = new Vec3(x, y, z)
                    let pos2 = new Vec3(x, y - 1, z)
                    if (!nearest || pos1.distanceTo(distDigging) < nearest.distanceTo(distDigging)) {
                        let block1 = bot.blockAt(origin.plus(pos1))
                        if (block1 && block1.boundingBox != "empty") {
                            nearest = pos1;
                        } else if (!nearest || pos2.distanceTo(distDigging) < nearest.distanceTo(distDigging)) {
                            let block2 = bot.blockAt(origin.plus(pos2))
                            if (block2 && block2.boundingBox != "empty")
                                nearest = pos2;
                        }
                    }
                }
            }
            if (nearest) {
                return nearest
            }
            if (y - 2 == size.y) y++;
        }
    }
    return null
}

function noop(err) {
    //do nothing special
}