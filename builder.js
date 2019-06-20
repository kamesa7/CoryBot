nbt = require("binary-nbt")
fs = require("fs")
zlib = require('zlib')

glob.stopBuild = stopBuild
glob.schematicBuild = schematicBuild
glob.placeBlockAt = placeBlockAt

glob.createPoster = createPoster
glob.createBuilding = createBuilding
glob.lighting = lighting

glob.viewBuildData = viewBuildData
glob.viewBlockNeeds = viewBlockNeeds

glob.buildRange = 4
glob.buildInterval = 100
glob.buildWorkProgress = 64
glob.buildWarnBlock = 8

glob.rawBuildData;
glob.buildData;

glob.isLightingMode = false;
glob.isBuildingMode = false;
glob.logBuild = false

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

        const buildData = []
        buildData.origin = bot.entity.position.floored();
        glob.buildData = buildData;
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

function createPoster(origin) { // height should be 1
    clearInterval(builder)
    glob.isBuildingMode = true;
    var buildData = glob.buildData
    if (origin) {
        origin = origin.floored()
        buildData.origin = origin
    } else {
        origin = buildData.origin
    }

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
                glob.goToPos(origin.plus(placing.offset(0, 0, 1)), { ignore: !glob.logBuild, allowGoal: 0, standable: 1 })
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

function createBuilding(origin) {
    clearInterval(builder)
    glob.isBuildingMode = true;
    var buildData = glob.buildData
    if (origin) {
        origin = origin.floored()
        buildData.origin = origin
    } else {
        origin = buildData.origin
    }

    bot.log("[build] Create Building At " + origin)
    var createState = "movewait";
    var placing = new Vec3(0, 0, 0);
    var placeCnt = 0;
    var blockSum = buildData.length * buildData[0].length * buildData[0][0].length
    var prevTime = new Date().getTime();
    builder = setInterval(posterControl, glob.buildInterval)
    function posterControl() {
        switch (createState) {
            case "movewait":
                if (!glob.doNothing()) return;
                glob.goToPos(origin.plus(placing.offset(-1, 1, 0)), {
                    ignore: !glob.logBuild,
                    allowGoal: 0,
                    standable: 1,
                    bridgeable: true,
                    scaffordable: true,
                })
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
                            if (++placing.y == buildData.length) {
                                bot.log("[build] Create Building Finished")
                                clearInterval(builder)
                                return
                            }
                        }
                    }
                    block = bot.blockAt(origin.plus(placing))
                    data = glob.buildData[placing.y][placing.z][placing.x]
                    if (data.type == 0) continue
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
            placeBlockAt(item, newBlockPos, glob.logBuild, (err) => {
                if (err) bot.log(err)
                glob.finishState("build")
            })
        })
    }
}

/**
 * @param {*} item 
 * @param {*} pos 
 * @param {*} logMode 
 * @param {*} cb isError
 */
function placeBlockAt(item, pos, logMode, cb) {
    bot.setControlState("sneak", true)
    var newBlockPos = pos
    var oldBlock = bot.blockAt(newBlockPos)
    var refBlock, i
    if (oldBlock && oldBlock.type == 0) {
        if (item) {
            bot.equip(item, "hand", (error) => {
                if (error) {
                    if (cb) cb(error)
                    return
                }
                for (i = 0; i < roundPos.length; i++) {
                    if (bot.blockAt(newBlockPos.plus(roundPos[i])).type != 0) {
                        refBlock = bot.blockAt(newBlockPos.plus(roundPos[i]))
                        break
                    }
                }
                if (i == roundPos.length) {
                    if (logMode) bot.log("[place] NO reference block At: " + newBlockPos)
                    refBlock = oldBlock
                    i = 0;
                }
                if (logMode) bot.log("[place] place: ref " + refBlock.position + " new " + newBlockPos + " face " + roundPos[i])
                bot.lookAt(refBlock.position.offset(0.5, 0.5, 0.5), true, () => {
                    bot.placeBlock(refBlock, roundPos[i].scaled(-1), (error) => {
                        bot.clearControlStates();
                        if (cb) cb(error)
                        return
                    })
                })
            })
        } else {
            bot.clearControlStates();
            if (cb) cb("[place] NO block item to place : " + item)
        }
    } else {
        bot.clearControlStates();
        if (cb) cb("[place] cannot place theres")
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

function viewBlockNeeds(origin) {
    const buildData = glob.buildData
    const count = {};
    if (origin) {
        origin = origin.floored()
        for (let y = 0; y < buildData.length; y++) {
            for (let z = 0; z < buildData[y].length; z++) {
                for (let x = 0; x < buildData[y][z].length; x++) {
                    let block = bot.blockAt(origin.offset(x, y, z))
                    let data = buildData[y][z][x]
                    let tag;
                    if (data.metadata != 0) tag = data.type + "." + data.metadata
                    else tag = data.type
                    if (block.type = data.type && block.metadata == data.metadata) {
                        if (!count[tag]) count[tag] = 0
                    } else {
                        if (!count[tag]) count[tag] = 0
                        count[tag]++;
                    }
                }
            }
        }
    } else {
        for (let y = 0; y < buildData.length; y++) {
            for (let z = 0; z < buildData[y].length; z++) {
                for (let x = 0; x < buildData[y][z].length; x++) {
                    let data = buildData[y][z][x]
                    let tag;
                    if (data.metadata != 0) tag = data.type + "." + data.metadata
                    else tag = data.type
                    if (!count[tag]) count[tag] = 0
                    count[tag]++;
                }
            }
        }
    }
    Object.keys(count).forEach(function (key) {
        let type = key.split(".")[0]
        if (mcData.blocks[type])
            console.log(key + " : " + mcData.blocks[type].name + " : " + count[key])
        else
            console.log(key + " :     : " + count[key])
    })
}