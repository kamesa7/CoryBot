nbt = require("binary-nbt")
fs = require("fs")
zlib = require('zlib')

glob.stopBuild = stopBuild
glob.schematicBuild = schematicBuild
glob.createPoster = createPoster
glob.placeBlockAt = placeBlockAt
glob.lighting = lighting

glob.isLightingMode = false;

glob.isBuildingMode = false;
glob.buildRange = 2.5
glob.buildInterval = 50
glob.buildWorkProgress = 64
glob.buildWarnBlock = 8
glob.buildData;

glob.logBuild = true

var builder;

var roundPos = [
    new Vec3(0, -1, 0),
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
    new Vec3(0, 1, 0)
]

function stopBuild() {
    clearInterval(builder)
    bot.log("[build] Stop Construction")
}

function schematicBuild(file) {
    binary = fs.readFileSync("nbt/" + file)
    zlib.gunzip(binary, function (err, content) {
        if (err) {
            console.log(err)
            return
        }
        level = nbt.deserializeNBT(content)
        // level = nbt.deserializeCompressedNBT(data)

        console.log(String(level.Materials))
        Object.keys(level).forEach(function (key) {
            console.log(key, Number(level[key]), level[key].length)
        })

        level.Height = Number(level.Height)
        level.Width = Number(level.Width)
        level.Length = Number(level.Length)

        console.log(level.Height, level.Width, level.Length)

        const buildData = []
        buildData.origin = bot.entity.position.floored();
        glob.buildData = buildData;
        for (let y = 0; y < level.Height; y++) {
            buildData.push([])
            for (let z = 0; z < level.Width; z++) {
                buildData[y].push([])
                for (let x = 0; x < level.Length; x++) {
                    let type = Number(level.Blocks[y * level.Height + z * level.Width + x])
                    buildData[y][z][x] = {
                        type: type >= 0 ? type : 128 * 2 + type,
                        metadata: Number(level.Data[y * level.Height + z * level.Width + x])
                    }
                }
            }
        }
    })
}

function createPoster(origin) { // height should be 1
    clearInterval(builder)
    glob.isBuildingMode = true;
    var buildData = glob.buildData
    buildData.origin = origin
    bot.log("[build] Create Poster At " + origin)
    var createState = "movewait";
    var placing = new Vec3(0, 0, 0);
    var placeCnt = 0;
    var blockSum = buildData[0].length * buildData[0][0].length
    var prevTime = new Date().getTime();
    builder = setInterval(posterControl, glob.buildInterval)
    function posterControl() {
        switch (createState) {
            case "movewait":
                if (!glob.doNothing()) return;
                glob.strictGoToPos(origin.plus(placing.offset(0, 0, 1)), false)
                createState = "move"
                break
            case "move":
                if (!glob.doNothing()) return;
                createState = "buildwait"
                break
            case "buildwait":
                if (!glob.doNothing()) return;
                placeBlockFromSchematic(placing)
                prevTime = new Date().getTime();
                createState = "build"
                break
            case "build":
                if (new Date().getTime() - prevTime > 3000) {
                    bot.log("[build] Something Error At" + origin.plus(placing))
                    glob.finishState("build")
                }
                if (!glob.doNothing()) return;
                let block
                let item
                let data
                do {
                    placeCnt++
                    if (placeCnt % glob.buildWorkProgress == 0) {
                        bot.log("[build] Construction " + placeCnt + " " + (100 * placeCnt / blockSum) + "% ")
                    }
                    // X
                    if (++placing.x == buildData[placing.y][placing.z].length) {
                        placing.x = 0;
                        // Z
                        if (++placing.z == buildData[placing.y].length) {
                            placing.z = 0;
                            // Y
                            if (++placing.y == buildData.length) { // assert
                                bot.log("[build] Create Poster Finished")
                                clearInterval(builder)
                                return
                            }
                            if (glob.logBuild) bot.log("[build] goto " + origin.plus(placing.offset(0, 0, 1)))
                        }
                    }
                    block = bot.blockAt(origin.plus(placing))
                    data = glob.buildData[placing.y][placing.z][placing.x]
                    item = glob.findItem(data.type, data.metadata)
                    if (!item && block.type == 0)
                        bot.log("[build] NEED block: " + blockdata(data.type, data.metadata))
                } while (!item || block.type != 0)
                if (glob.doNothing()) { // speed up by before placing
                    bot.equip(item, "hand", (err) => {
                        if (err) {
                            bot.log(err)
                        }
                    })
                }
                createState = "movewait";
                break;
        }
    }
}

function placeBlockFromSchematic(placing) {
    var origin = glob.buildData.origin
    var newBlockPos = origin.plus(placing)
    if (glob.buildData[placing.y] && glob.buildData[placing.y][placing.z] && glob.buildData[placing.y][placing.z][placing.x]) { // assert
        glob.tryState("build", function () {
            var data = glob.buildData[placing.y][placing.z][placing.x]
            var item = glob.findItem(data.type, data.metadata)
            if (item) {
                if (item.count == glob.buildWarnBlock)
                    bot.log("[build] LOW block: " + blockdata(item.type, item.metadata))
                else if (item.count == 1)
                    bot.log("[build] SHORTAGE block: " + blockdata(item.type, item.metadata))
            }
            placeBlockAt(item, newBlockPos, (msg, log) => {
                if (msg) bot.log(msg)
                if (glob.logBuild && log) bot.log(log)
            }, (err) => {
                //if(err)
                glob.finishState("build")
            })
        })
    }
}

/**
 * Global placing method
 * (torch, brightPos,
 *  (msg, log) => {
 *      if (msg) bot.log(msg)
 *      if (logmode) bot.log(log)
 *  },(err)=>{
 *      if(err) catch
 *      else fin
 *  })
 * @param {*} item 
 * @param {*} pos 
 * @param {*} msgcb (ErrorMessage, LogMessage)
 * @param {*} cb isError
 */
function placeBlockAt(item, pos, msgcb, cb) {
    bot.setControlState("sneak", true)
    var newBlockPos = pos
    var oldBlock = bot.blockAt(newBlockPos)
    if (oldBlock && oldBlock.type == 0) {
        if (item) {
            bot.equip(item, "hand", (error) => {
                if (error) {
                    if (msgcb) msgcb(error)
                    if (cb) cb(true)
                }
                var refBlock, i
                for (i = 0; i < roundPos.length; i++) {
                    if (bot.blockAt(newBlockPos.plus(roundPos[i])).type != 0) {
                        refBlock = bot.blockAt(newBlockPos.plus(roundPos[i]))
                        break
                    }
                }
                if (i == roundPos.length) {
                    if (msgcb) msgcb("[place] NO reference block At: " + newBlockPos)
                    refBlock = oldBlock
                    i = 0;
                }
                if (msgcb) msgcb(null, "[place] place: ref " + refBlock.position + " new " + newBlockPos + " face " + roundPos[i])
                bot.lookAt(refBlock.position.offset(0.5, 0.5, 0.5), true, () => {
                    bot.placeBlock(refBlock, roundPos[i].scaled(-1), (error) => {
                        if (error) if (msgcb) msgcb(error)
                        bot.clearControlStates();
                        cb(false)
                    })
                })
            })
        } else {
            if (msgcb) msgcb("[place] NO block item")
            bot.clearControlStates();
            if (cb) cb(true)
        }
    } else {
        if (msgcb) msgcb("[place] cannot place")
        bot.clearControlStates();
        if (cb) cb(true)
    }
}

function blockdata(type, metadata) {
    return type + " " + mcData.blocks[type].name + " " + metadata
}

function nearBuild() {
    glob.finishState("build")
    if (!glob.isBuildingMode) clearInterval(builder);
    var rad = Math.random() * 2 * Math.PI;
    var plus = new Vec3(Math.random() * glob.buildRange * Math.sin(rad), -1, Math.random() * glob.buildRange * Math.cos(rad));
    var target = bot.entity.position.plus(plus).floored();
    var build = target.offset(0, 1, 0).minus(glob.buildData.origin)
    var block = bot.blockAt(target)
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
                placeBlockAt(torch, brightPos, (msg, log) => {
                    if (msg) bot.log(msg)
                })
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