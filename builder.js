nbt = require("binary-nbt")
fs = require("fs")
zlib = require('zlib')

glob.stopBuild = stopBuild
glob.loadSchematic = loadSchematic
glob.placeBlockAt = placeBlockAt

glob.buildPoster = buildPoster
glob.buildBuilding = buildBuilding
glob.lighting = lighting

glob.viewBuildData = viewBuildData
glob.viewBlockNeeds = viewBlockNeeds

glob.buildRange = 4
glob.buildInterval = 100
glob.buildWorkProgress = 64
glob.buildWarnBlock = 8
const buildTimeout = 3000

glob.rawBuildData;
glob.buildData;

glob.isLightingMode = false;
glob.logBuild = false

var builder;

const roundPos = [
    new Vec3(0, -1, 0),
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
    new Vec3(0, 1, 0)
]

bot.on('death', () => {
    stopBuild()
});

function stopBuild() {
    glob.stopMoving()
    if (builder && !builder._destroyed) {
        bot.log("[build] Stop Construction")
    }
    clearInterval(builder)
}

function loadSchematic(file) {
    binary = fs.readFileSync("nbt/" + file)
    zlib.gunzip(binary, function (err, content) {
        if (err) {
            console.log(err)
            return
        }
        level = nbt.deserializeNBT(content)
        glob.rawBuildData = level
        // level = nbt.deserializeCompressedNBT(data)

        console.log(String(level.Materials))
        Object.keys(level).forEach(function (key) {
            console.log(key, level[key].length)
        })

        level.Height = Number(level.Height)
        level.Length = Number(level.Length)
        level.Width = Number(level.Width)

        console.log(level.Height, level.Length, level.Width)
        console.log("x:" + level.Width + " y:" + level.Height + " z:" + level.Length)

        const buildData = []
        glob.buildData = buildData;
        buildData.size = {
            height: level.Height,
            length: level.Length,
            width: level.Width
        }
        for (let y = 0; y < level.Height; y++) {
            buildData.push([])
            for (let z = 0; z < level.Length; z++) {
                buildData[y].push([])
                for (let x = 0; x < level.Width; x++) {
                    let type = Number(level.Blocks[y * level.Length * level.Width + z * level.Width + x])
                    buildData[y][z][x] = {
                        type: type >= 0 ? type : 128 * 2 + type,
                        metadata: Number(level.Data[y * level.Length * level.Width + z * level.Width + x])
                    }
                }
            }
        }
    })
}

//////////////////////////////////////////////////////////////////////////////////////////////
var posterSlideRight = true
function buildPoster(origin) {
    const buildData = glob.buildData
    stopBuild()
    if (origin) {
        origin = origin.floored()
    } else {
        bot.log("[build] Need Origin for Poster")
        return
    }
    if (buildData.length != 1) {
        bot.log("[build] Poster should be height 1")
        return
    }
    bot.log("[build] Create Poster At " + origin)
    posterSlideRight = true
    generalBuild(origin, new Vec3(-1, 0, 0), posterGoTo, buildingNext)
}

function posterGoTo(origin, placing) {
    glob.goToPos(origin.plus(placing.offset(0, 0, 1)), { // from flat position
        ignore: !glob.logBuild,
        allowGoal: 0,
        standadjust: 1,
        continue: false
    })
}

function posterNext(origin, placing, open) {
    const buildData = glob.buildData
    do {
        // X
        if ((posterSlideRight && ++placing.x == buildData.size.width) || (!posterSlideRight && --placing.x < 0)) {
            if (posterSlideRight) {
                posterSlideRight = false
                placing.x = buildData.size.width - 1;
            } else {
                posterSlideRight = true
                placing.x = 0;
            }
            // Z
            if (++placing.z == buildData.size.length) {
                placing.z = 0;
                // Y
                if (++placing.y == buildData.size.height) { // assert
                    bot.log("[build] Create Poster Finished")
                    stopBuild()
                    return null
                }
            }
        }
    } while (!open[placing.y][placing.z][placing.x])
    return placing
}

function buildBuilding(origin) {
    const buildData = glob.buildData
    stopBuild()
    if (origin) {
        origin = origin.floored()
    } else {
        origin = bot.entity.position.floored()
    }
    bot.log("[build] Create Building At " + origin)
    const start = nearestPlacing(origin)
    start.y = 0
    generalBuild(origin, start, buildingGoTo, buildingNext)
}

function buildingGoTo(origin, placing) {
    glob.goToPos(origin.plus(placing.offset(0, 1, 0)), {
        ignore: !glob.logBuild,
        allowGoal: 2,
        rejectGoal: 0,
        standadjust: 1,
        strictfin: true,
        bridgeable: true,
        buildstairable: true,
        scaffordable: true,
        continue: false,
    })
}

function buildingNext(origin, placing, open) {
    const buildData = glob.buildData
    let nearest = null
    for (let y = placing.y; y < buildData.size.height; y++) {
        for (let z = 0; z < buildData.size.length; z++) {
            for (let x = 0; x < buildData.size.width; x++) {
                if (open[y][z][x]) {
                    let pos = new Vec3(x, y, z)
                    if (!nearest || placing.distanceTo(pos) < placing.distanceTo(nearest)) {
                        nearest = pos;
                    }
                }
            }
        }
        if (nearest) {
            placing.update(nearest)
            open[placing.y][placing.z][placing.x] = false
            return placing
        }
    }
    bot.log("[build] Create Building Finished")
    stopBuild()
    return null
}

function nearestNext(origin, placing, open) {
    const buildData = glob.buildData
    var ck = nearestPlacing(origin)
    var expanded = []
    var lastIndex = 0
    var index = 0
    expand(ck)
    while (index < expanded.length) {
        let explength = expanded.length
        for (let i = index; i < explength; i++) { // check
            let pos = expanded[i];
            if (open[pos.y][pos.z][pos.x]) { // find
                open[pos.y][pos.z][pos.x] = false
                placing.update(pos)
                return placing;
            }
        }

        for (let i = index; i < explength; i++) { // expand
            let pos = expanded[i];
            expand(pos)
        }
        lastIndex = index
        index = explength
    }
    bot.log("[build] Create Building Finished")
    stopBuild()
    return null;

    function expand(target) {
        for (let r = 0; r < roundPos.length; r++) {
            let exp = target.plus(roundPos[r])
            if (exp.y < 0 || exp.z < 0 || exp.x < 0 ||
                exp.y >= buildData.size.height || exp.z >= buildData.size.length || exp.x >= buildData.size.width)
                continue
            let i
            for (i = lastIndex; i < expanded.length; i++) {
                if (exp.equals(expanded[i])) break
            }
            if (i == expanded.length) expanded.push(exp)
        }
    }
}

function generalBuild(origin, start, gotofunc, nextfunc) {
    stopBuild()
    const buildData = glob.buildData
    var createState = "build";
    var placing = start;
    var placeCnt = 0;
    var prevPlaceCnt = 0;
    const size = buildData.length * buildData[0].length * buildData[0][0].length
    var open = []
    const blockSum = viewBlockNeeds(origin, open)
    bot.log("[build] size: " + size + "  needs: " + blockSum)
    var prevTime = new Date().getTime();
    builder = setInterval(buildingControl, glob.buildInterval)
    function buildingControl() {
        switch (createState) {
            case "movewait":
                if (!glob.doNothing()) return;
                gotofunc(origin, placing)
                createState = "move"
                break
            case "move":
                if (!glob.doNothing()) return;
                createState = "buildwait"
                break
            case "buildwait":
                if (!glob.doNothing()) return;
                placeBlockFromSchematic(origin, placing)
                prevTime = new Date().getTime();
                createState = "build"
                break
            case "build":
                if (new Date().getTime() - prevTime > buildTimeout) {
                    bot.log("[build] Something Error At" + origin.plus(placing))
                    glob.finishState("build")
                }
                if (!glob.doNothing()) return;
                prevTime = new Date().getTime();
                let skip = 0
                let item = null
                let data = null
                let result
                let NEED = {}
                do {
                    if (new Date().getTime() - prevTime > buildTimeout) {
                        bot.log("[build] Timeout in Serching Next")
                        stopBuild()
                        return
                    }
                    result = nextfunc(origin, placing, open)
                    if (result == null) break
                    skip++
                    data = glob.buildData[placing.y][placing.z][placing.x]
                    item = glob.findItem(data.type, getConstructiveBlockMetadata(data.type, data.metadata))
                    if (!item && isPlaceable(origin.plus(placing)) && skip < glob.buildWorkProgress)
                        NEED["[build] NEED block: " + blockdata(data.type, data.metadata)] += placing
                } while (!item || !isPlaceable(origin.plus(placing)))
                placeCnt += skip
                Object.keys(NEED).forEach(function (key) {
                    bot.log(key + NEED[key].replace("undefined", " at "));
                })
                if (result == null) break
                bot.equip(item, "hand", (err) => { // speed up by before placing
                    if (err) bot.log(err)
                })
                if (placeCnt - prevPlaceCnt >= glob.buildWorkProgress) {
                    bot.log("[build] Construction " + placeCnt + " " + (100 * placeCnt / blockSum) + "% ")
                    prevPlaceCnt = placeCnt
                }
                createState = "movewait";
                break;
        }
    }
}

function placeBlockFromSchematic(origin, placing) {
    const newBlockPos = origin.plus(placing)
    if (glob.buildData[placing.y] && glob.buildData[placing.y][placing.z] && glob.buildData[placing.y][placing.z][placing.x]) { // assert
        glob.tryState("build", function () {
            const data = glob.buildData[placing.y][placing.z][placing.x]
            const item = glob.findItem(data.type, getConstructiveBlockMetadata(data.type, data.metadata))
            const placingMethod = getPlacingMethod(data.type, data.metadata)
            if (item) {
                let count = glob.checkItemCount(item.type, item.metadata)
                if (count == glob.buildWarnBlock)
                    bot.log("[build] LOW(" + (count - 1) + ") block: " + blockdata(item.type, item.metadata))
                else if (count == 1)
                    bot.log("[build] USED block: " + blockdata(item.type, item.metadata))

                if (placingMethod.look != undefined || placingMethod.direction != undefined) {
                    placeDirectedBlockAt(item, newBlockPos, placingMethod, (err) => {
                        if (err) bot.log(err)
                        glob.finishState("build")
                    })
                } else {
                    placeBlockAt(item, newBlockPos, (err) => {
                        if (err) bot.log(err)
                        glob.finishState("build")
                    })
                }
            } else {
                glob.finishState("build")
            }
        })
    }
}

/**
 * @param {*} item 
 * @param {*} pos 
 * @param {*} cb isError
 */
function placeBlockAt(item, pos, cb = noop) {
    const newBlockPos = pos.floored()
    const oldBlock = bot.blockAt(newBlockPos)
    if (!item) {
        cb("[place] Not block item")
        return
    }
    if (!oldBlock || !isPlaceable(pos)) {
        cb("[place] cannot place there")
        return
    }
    bot.setControlState("sneak", true)
    bot.equip(item, "hand", (error) => {
        if (error) {
            cb(error)
            return
        }
        let refBlock, face, isNoRef = false
        refBlock = referenceAt(newBlockPos)
        if (refBlock) {
            face = newBlockPos.minus(refBlock.position)
        } else {
            bot.log("[place] No reference block At: " + newBlockPos)
            refBlock = oldBlock
            face = new Vec3(0, 1, 0)
            isNoRef = true
        }
        if (glob.logBuild) bot.log("[place] place: ref " + refBlock.position + " new " + newBlockPos + " face " + face)
        bot.lookAt(refBlock.position.offset(0.5, 0.5, 0.5), true, () => {
            bot.placeBlock(refBlock, face, (error) => {
                bot.clearControlStates();
                if (glob.logBuild) {
                    const newBlock = bot.blockAt(newBlockPos);
                    bot.log("[place] placed: " + blockdata(newBlock.type, newBlock.metadata))
                }
                if (isNoRef)
                    cb()
                else
                    cb(error)
                return
            })
        })
    })
}

/**
 * @param {*} item 
 * @param {*} pos 
 * @param {*} detail 
 * @param {*} cb 
 */
function placeDirectedBlockAt(item, pos, detail, cb = noop) {
    const newBlockPos = pos.floored()
    const oldBlock = bot.blockAt(newBlockPos)
    if (!item) {
        cb("[place] No block item : null item")
        return
    }
    if (!oldBlock || !isPlaceable(pos)) {
        cb("[place] cannot place there : not air pos")
        return
    }
    if (!detail.direction) detail.direction = 0
    if (!detail.look) detail.look = pos.offset(0.5, 0.5, 0.5)
    else detail.look = bot.entity.position.offset(0, 1.2, 0).minus(detail.look)
    bot.setControlState("sneak", true)
    bot.equip(item, "hand", (error) => {
        if (error) {
            cb(error)
            return
        }
        if (glob.logBuild) bot.log("[place] place directed: pos " + newBlockPos + " direct " + detail.direction + " look " + detail.look)
        bot.lookAt(detail.look, true, () => {
            if (!bot.heldItem) cbb(new Error('must be holding an item to place a block'))
            bot._client.write('arm_animation', { hand: 0 })
            bot._client.write('block_place', {
                location: pos,
                direction: detail.direction,
                hand: 0,
                cursorX: 0.5,
                cursorY: 0.5,
                cursorZ: 0.5
            })
            const eventName = `blockUpdate:${pos}`
            bot.once(eventName, onBlockUpdate)
            function onBlockUpdate(oldBlock, newBlock) {
                if (oldBlock.type === newBlock.type) {
                    cbb(new Error(`No block has been placed : the block is still ${oldBlock.name}`))
                } else {
                    cbb()
                }
            }
        })
    })
    function cbb(error) {
        bot.clearControlStates();
        if (glob.logBuild) {
            const newBlock = bot.blockAt(newBlockPos);
            bot.log("[place] placed: " + blockdata(newBlock.type, newBlock.metadata))
        }
        cb(error)
        return
    }
}

function blockdata(type, metadata) {
    return type + " " + mcData.blocks[type].name + " " + metadata
}

function referenceAt(vec) {
    for (let i = 0; i < roundPos.length; i++) {
        if (bot.blockAt(vec.plus(roundPos[i])).type != 0) {
            return bot.blockAt(vec.plus(roundPos[i]))
        }
    }
    return null
}

function isPlaceable(pos) {
    const B = bot.blockAt(pos)
    if (B.boundingBox == "empty" || B.boundingBox == "water")
        return true
    else
        return false
}

function nearestPlacing(origin) {
    const size = glob.buildData.size
    const me = bot.entity.position.minus(origin).floor().offset(0, -1, 0)
    if (me.x < 0) me.x = 0
    if (me.y < 0) me.y = 0
    if (me.z < 0) me.z = 0
    if (me.x >= size.width) me.x = size.width - 1
    if (me.y >= size.height) me.y = size.height - 1
    if (me.z >= size.length) me.z = size.length - 1
    return me
}

function lighting() {
    glob.isLightingMode = true
    var rad = Math.random() * 2 * Math.PI;
    var brightPos = bot.entity.position.offset(Math.random() * glob.buildRange * Math.sin(rad), 0, Math.random() * glob.buildRange * Math.cos(rad)).floored();
    var cont = true
    var cnt = 0
    while (cont && cnt < 10) {
        if (isNeedLight(brightPos)) {
            var torch = glob.findItem(50);
            if (torch != null) {
                bot.log("[brighten] " + brightPos + ": " + bot.blockAt(brightPos).light);
                placeBlockAt(torch, brightPos, false)
            } else {
                glob.isLightingMode = false;
                bot.log("[brighten] no torch end");
            }
            cont = false
        }
        cnt++;
    }
}

function isNeedLight(pos) {
    let ground = bot.blockAt(pos.offset(0, -1, 0))
    let block = bot.blockAt(pos)
    let walks = [
        new Vec3(1, 0, 0),
        new Vec3(-1, 0, 0),
        new Vec3(0, 0, 1),
        new Vec3(0, 0, -1)
    ]
    if (ground.boundingBox == "block" && !mcData.blocks[ground.type].transparent) {
        var next;
        if (block.name != "air") return false;
        if (block.light <= 1) return true;
        if (block.light == 2) {
            for (var i = 0; i < walks.length; i++) {
                next = bot.blockAt(pos.plus(walks[i]));
                if (next.name != "air") continue;
                if (next.light <= 1) {
                    add(pos, walks[i]);
                    return true;
                }
            }
        }
        if (block.light <= 7) {
            for (var i = 0; i < walks.length; i++) {
                next = bot.blockAt(pos.plus(walks[i]));
                if (next.name != "air") continue;
                if (next.light < block.light) return false;
            }
            return true;
        }
    }
    return false;
}

function viewBuildData() {
    const buildData = glob.buildData
    for (let y = 0; y < buildData.length; y++) {
        for (let z = 0; z < buildData[y].length; z++) {
            let str = ""
            for (let x = 0; x < buildData[y][z].length; x++) {
                str += buildData[y][z][x].type + "  "
            }
            console.log(str)
        }
        console.log("---")
    }
}

function viewBlockNeeds(origin, open = []) {
    const buildData = glob.buildData
    const count = {};
    let needs = 0;
    if (origin) {
        origin = origin.floored()
        for (let y = 0; y < buildData.length; y++) {
            open.push([])
            for (let z = 0; z < buildData[y].length; z++) {
                open[y].push([])
                for (let x = 0; x < buildData[y][z].length; x++) {
                    let block = bot.blockAt(origin.offset(x, y, z))
                    let data = buildData[y][z][x]
                    let meta = getConstructiveBlockMetadata(data.type, data.metadata)
                    let tag;
                    if (meta != null && meta != 0) tag = data.type + "." + meta
                    else tag = data.type
                    if (block.type == data.type && block.metadata == data.metadata) {//一致
                        if (!count[tag]) count[tag] = 0
                        open[y][z].push(false);
                    } else {//不一致
                        if (!count[tag]) count[tag] = 0
                        count[tag]++;
                        if (data.type == 0) {//空気予定
                            open[y][z].push(false);
                        } else {//非空気予定
                            needs++
                            open[y][z].push(true);
                        }
                    }
                }
            }
        }
    } else {
        for (let y = 0; y < buildData.length; y++) {
            for (let z = 0; z < buildData[y].length; z++) {
                for (let x = 0; x < buildData[y][z].length; x++) {
                    let data = buildData[y][z][x]
                    let meta = getConstructiveBlockMetadata(data.type, data.metadata)
                    let tag;
                    if (meta != null && meta != 0) tag = data.type + "." + meta
                    else tag = data.type
                    if (!count[tag]) count[tag] = 0
                    count[tag]++;
                    if (data.type != 0) needs++
                }
            }
        }
    }
    bot.log("All Blocks : " + needs)
    Object.keys(count).forEach(function (key) {
        let split = key.split(".")
        let type = split[0]
        let meta = split[1] ? split[1] : 0
        let have = glob.checkItemCount(type, meta)
        if (mcData.blocks[type])
            bot.log(key + " : " + mcData.blocks[type].name + " : " + have + "/" + count[key] + "  (" + Math.max(count[key] - have, 0) + ")")
        else
            bot.log(key + " :     : " + count[key])
    })
    return needs
}

function getConstructiveBlockMetadata(type, metadata) {
    let retMeta
    switch (type) {
        /*3 faces*/
        //log
        case 17: case 162:
            retMeta = (metadata & 0x3)
            break
        case 155:
            if (metadata <= 1)
                retMeta = (metadata)
            else
                retMeta = (2)
            break
        /*4 faces*/
        //pumpkin
        case 86: case 91:
        //chest
        case 54: case 146:
        //furnace
        case 61: case 62:
        //ladder
        case 65:
        //rail
        case 27: case 28: case 66: case 157:
            retMeta = null
            break
        /*5 faces*/
        //torch
        case 50: case 75: case 76:
            retMeta = null
            break
        /*6 faces*/
        //piston
        case 29: case 33:
        //dispenser observer hopper
        case 23: case 218: case 154:
        //button
        case 77: case 143:
            retMeta = null
            break
        /*stairs*/
        case 53: case 67: case 108: case 109: case 114: case 128: case 134: case 135: case 136: case 156: case 163: case 164: case 180: case 203:
            retMeta = null
            break
        /*slabs*/
        case 44: case 126: case 182: case 205:
            retMeta = (metadata & 0x7)
            break
        default:
            retMeta = (metadata)
            break
    }
    return retMeta
}

function getPlacingMethod(type, metadata) {
    let direction = undefined
    let look = undefined
    switch (type) {
        /*3 faces*/
        //log
        case 17: case 162:
            switch ((metadata >> 2) & 0x3) {
                case 0: direction = 0; break;
                case 1: direction = 4; break;
                case 2: direction = 2; break;
                case 3: direction = 0; break;
            }
            break
        case 155:
            switch (metadata) {
                case 0: break;
                case 1: break;
                case 2: direction = 0; break;
                case 3: direction = 4; break;
                case 4: direction = 2; break;
            }
            break
        /*4 faces*/
        //pumpkin
        case 86: case 91:
        //chest
        case 54: case 146:
        //furnace
        case 61: case 62:
        //ladder
        case 65:
            switch (metadata) {
                case 2: look = new Vec3(0, 0, 1); break;
                case 3: look = new Vec3(0, 0, -1); break;
                case 4: look = new Vec3(1, 0, 0); break;
                case 5: look = new Vec3(-1, 0, 0); break;
            }
        //rail
        case 27: case 28: case 66: case 157:
            break
        /*5 faces*/
        //torch
        case 50: case 75: case 76:
            break
        /*6 faces*/
        //piston
        case 29: case 33:
        //dispenser observer hopper
        case 23: case 218: case 154:
        //button
        case 77: case 143:
            switch (metadata & 0x7) {
                case 0: look = new Vec3(0, 1, 0); break;
                case 1: look = new Vec3(0, -1, 0); break;
                case 2: look = new Vec3(0, 0, 1); break;
                case 3: look = new Vec3(0, 0, -1); break;
                case 4: look = new Vec3(1, 0, 0); break;
                case 5: look = new Vec3(-1, 0, 0); break;
            }
            break
        /*stairs*/
        case 53: case 67: case 108: case 109: case 114: case 128: case 134: case 135: case 136: case 156: case 163: case 164: case 180: case 203:
            switch (metadata & 0x3) {
                case 0: look = new Vec3(-1, 0, 0); break;
                case 1: look = new Vec3(1, 0, 0); break;
                case 2: look = new Vec3(0, 0, -1); break;
                case 3: look = new Vec3(0, 0, 1); break;
            }
            if (metadata < 4)
                direction = 1//normal
            else
                direction = 0//reverse
            break
        /*slabs*/
        case 44: case 126: case 182: case 205:
            if (metadata < 8) {
                direction = 1//normal
            } else {
                direction = 0//reverse
            }
            break
        default:
            break
    }
    return { direction: direction, look: look }
}

function noop(err) {
    //do nothing special
}