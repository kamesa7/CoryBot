nbt = require("binary-nbt")
fs = require("fs")
zlib = require('zlib')

glob.stopBuild = stopBuild
glob.schematicBuild = schematicBuild
glob.createPoster = createPoster

glob.isBuildingMode = false;
glob.buildRange = 2.5
glob.buildInterval = 75
glob.buildWorkProgress = 32
glob.buildWarnBlock = 8
glob.buildData;

glob.logBuild = true

var builder;

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

        console.log(level.Materials)
        console.log(level.Height, level.Width, level.Length)
        Object.keys(level).forEach(function (key) {
            console.log(key, level[key].length)
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

function createPoster(origin) {
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
                glob.strictGoToPos(origin.plus(placing.offset(0, 0, 1)))
                createState = "move"
                break
            case "move":
                if (!glob.doNothing()) return;
                createState = "buildwait"
                break
            case "buildwait":
                if (!glob.doNothing()) return;
                placeBlock()
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
                                bot.log("[build] Create Poster Finished")
                                clearInterval(builder)
                                return
                            }
                            if (glob.logBuild) bot.log("[build] goto " + origin.plus(placing.offset(0, 0, 1)))
                        }
                    }
                    block = bot.blockAt(origin.plus(placing))
                } while (block.type != 0)
                createState = "movewait";
                break;
        }
    }
    function placeBlock() {
        var target = origin.plus(placing);
        var block = bot.blockAt(target)
        if (glob.buildData[placing.y] && glob.buildData[placing.y][placing.z] && glob.buildData[placing.y][placing.z][placing.x] &&
            block && block.type == 0) {
            glob.tryState("build", function () {
                var data = glob.buildData[placing.y][placing.z][placing.x]
                var item = glob.findItem(data.type, data.metadata)
                if (item) {
                    if (item.count == glob.buildWarnBlock)
                        bot.log("[build] low block: " + item.type + " " + mcData.blocks[item.type].name + " " + item.metadata)
                    bot.equip(item, "hand", (err) => {
                        if (err) {
                            bot.log(err)
                            glob.finishState("build")
                        }
                        bot.lookAt(target, true, () => {
                            bot.placeBlock(bot.blockAt(target), new Vec3(0, 1, 0), (err) => {//always error
                                glob.finishState("build")
                            })
                        })
                    })
                } else {
                    bot.log("[build] no block: " + data.type + " " + mcData.blocks[data.type].name + " " + data.metadata)
                    glob.finishState("build")
                }
            })
        }
    }
}

function nearBuild() {
    glob.finishState("build")
    if (!glob.isBuildingMode) clearInterval(builder);
    var rad = Math.random() * 2 * Math.PI;
    var plus = new Vec3(Math.random() * glob.buildRange * Math.sin(rad), -1, Math.random() * glob.buildRange * Math.cos(rad));
    var target = bot.entity.position.plus(plus).floored();
    var build = target.offset(0, 1, 0).minus(glob.buildData.origin)
    var block = bot.blockAt(target)
    if (glob.buildData[build.y] && glob.buildData[build.y][build.z] && glob.buildData[build.y][build.z][build.x] &&
        block && block.type == 0) {
        glob.tryState("build", function () {
            var data = glob.buildData[build.y][build.z][build.x]
            var item = glob.findItem(data.type, data.metadata)
            if (item) {
                bot.equip(item, "hand", (err) => {
                    if (err) {
                        bot.log(err)
                        glob.finishState("build")
                        return
                    }
                    bot.lookAt(target, true, () => {
                        bot.placeBlock(bot.blockAt(target), new Vec3(0, 1, 0), (err) => {
                            glob.finishState("build")
                        })
                    })
                })
            } else {
                bot.log("[build] no block: " + data.type + " " + mcData.blocks[data.type].name + " " + data.metadata)
                glob.finishState("build")
            }
        })
    }
}