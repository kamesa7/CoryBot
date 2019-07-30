
glob.isFollowing = false;
glob.isRandomWalking = false;

glob.isWaiting = false;

glob.isCollisionalMode = true;
glob.isInterestMode = true;

const onGround = 0.001;
const eyeHeight = 1.42;

glob.moveConfig = {
    stepTime: 60,
    stepError: 30,
    searchLimit: 5000,
    onPos: 0.2,
    stopRad: Math.PI / 4,
    allowGoal: 1,
    allowFollow: 4,
    allowChase: 2,
    followInterval: 25,//step
    followWait: 50,//step
    randomDistance: 10,
    randomCollar: Infinity,
    randomHeight: 3,
    randomWait: 50,
    randomLengthLimit: 100,
    pathblocks: [3]//dirt
}

const CONFIG = glob.moveConfig;

glob.logMove = false;
glob.logInterest = false;

var finalDestination;
var randomOrigin = null
var targetEntity = null

//functions
glob.goToPos = goToPos;
glob.stopMoving = stopMoving;
glob.randomWalk = randomWalk;
glob.follow = follow;
glob.chase = chase;

setInterval(interest_signal, 500);

/*
    forward: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    sprint: boolean;
    sneak: boolean;
*/

function stopMoving() {
    glob.finishState("move")
    glob.isFollowing = false;
    glob.isRandomWalking = false;
    glob.isWaiting = false;
    targetEntity = null;
    clearInterval(chaser)
    clearInterval(mover);
    bot.clearControlStates();
    if (glob.logMove)
        bot.log("[move] Full Stop ");
}

function stopPath() {
    glob.finishState("move")
    glob.isWaiting = false;
    clearInterval(mover);
    bot.clearControlStates();
    if (glob.logMove)
        bot.log("[move] stop ");
}

bot.on('death', () => {
    stopMoving()
});
bot.on('forcedMove', () => {
    // stopMoving()
});
bot.on('respawn', () => {
    stopMoving()
});

/**
 * options
 * allowGoal : rejectGoal : searchLimit : strictfin : standadjust
 * landable : bridgeable : buildstairable : scaffordable
 * ignore : continue
 */
function goToPos(point, reqOptions) {
    stopMoving();
    const options = setDefaultOptions(reqOptions)
    var start = myPosition().floor()
    var goal = point.floored();
    setStandable(start);

    const msgable = glob.logMove || !options.ignore
    const logable = glob.logMove
    if (msgable) bot.log("[move] goto " + goal + " from " + start);
    if (logable) var pathfindtime = new Date().getTime();
    const path = bestFirstSearch(start, goal, options);
    if (logable) bot.log("[move] pathfind took: " + (new Date().getTime() - pathfindtime) + "ms");
    if (path) {
        if (path.pathBlockCnt > 0) {
            let sum = 0;
            for (let i = 0; i < CONFIG.pathblocks.length; i++)
                sum += glob.checkItemCount(CONFIG.pathblocks[i])
            if (msgable) bot.log("[move] path blocks " + path.pathBlockCnt + "/" + sum);
            if (path.pathBlockCnt > sum) bot.log("[move] NEED more path blocks : " + (path.pathBlockCnt - sum) + " : " + path.pathBlockCnt + "/" + sum);
        }
        glob.queueOnceState("move", followPath, path)
    }
}

function follow(entity) {
    stopMoving();
    if (entity == undefined || !entity.isValid) {
        bot.log("[move] cannot find entity");
        return;
    }
    if (entity.name != undefined) bot.log("[move] follow: " + entity.name + " " + entity.position.floored());
    else bot.log("[move] follow: " + entity.username + " " + entity.position.floored());
    targetEntity = entity;
    glob.isFollowing = true;
    reFollow(entity);
}

function reFollow(entity) {
    if (!glob.isFollowing) return
    var start = myPosition().floor();
    var goal = entity.position.floored();
    setStandable(start);

    if (glob.logMove) bot.log("[move] follow revice " + goal);
    if (entity.position.distanceTo(bot.entity.position) < CONFIG.allowFollow) {
        setTimeout(
            reFollow,
            Math.ceil(Math.random() * CONFIG.followWait * CONFIG.stepTime),
            entity
        )
    } else {
        var path = bestFirstSearch(start, goal, { allowGoal: CONFIG.allowFollow, continue: false });
        if (!path) return
        if (CONFIG.followInterval < path.length) {
            path[CONFIG.followInterval].action = "follow"
        } else {
            let folw = start.clone(); folw.action = "follow"
            path.push(folw);
        }
        glob.queueOnceState("move", followPath, path)
    }
}

function randomWalk(range = Infinity) {
    stopMoving();
    bot.log("[move] random walk ");
    glob.isRandomWalking = true;
    CONFIG.randomCollar = range
    randomOrigin = myPosition().floor()
    reRandom();
}

function reRandom() {
    if (!glob.isRandomWalking) return;
    var start = myPosition().floor()
    setStandable(start);
    var goal = getRandomPos(start, Math.min(CONFIG.randomDistance, CONFIG.randomCollar), CONFIG.randomHeight);
    if (goal.distanceTo(randomOrigin) > CONFIG.randomCollar) {
        if (glob.logMove) bot.log("[move] too far: reRandom " + goal.distanceTo(randomOrigin))
        reRandom()
        return
    }

    if (glob.logMove) bot.log("[move] random revice " + goal);
    var path = bestFirstSearch(start, goal, { landable: false, continue: false });
    if (!path || CONFIG.randomLengthLimit < path.length) {
        reRandom();
        return;
    }
    if (CONFIG.randomInterval < path.length) {
        path[CONFIG.randomInterval].action = "random";
    } else {
        let gl = goal.clone(); gl.action = "random";
        path.push(gl);
    }
    setTimeout(function () {
        glob.queueOnceState("move", followPath, path)
    }, Math.ceil(Math.random() * CONFIG.randomWait * CONFIG.stepTime));
}

var chaser;
function chase(entity) {
    stopMoving();
    if (!entity || !entity.isValid) {
        bot.log("[move] cannot find entity");
        return;
    }
    targetEntity = entity;

    if (entity.name) bot.log("[move] chase: " + entity.name + " " + entity.position.floored());
    else bot.log("[move] chase: " + entity.username + " " + entity.position.floored());
    chaser = setInterval(reChase, CONFIG.stepTime);
    function reChase() {
        if (!entity || !entity.isValid) {
            bot.log("[move] cannot find entity");
            stopMoving();
            return;
        }

        if (entity.position.distanceTo(bot.entity.position) < CONFIG.allowChase) {
            bot.setControlState("sprint", false);
            bot.setControlState("forward", false);
            glob.finishState("move");
        } else {
            glob.letState("move", function () {
                bot.lookAt(entity.position.offset(0, eyeHeight, 0), true);
                bot.setControlState("sprint", true);
                bot.setControlState("forward", true);
                var direct
                direct = entity.position.minus(bot.entity.position);
                direct = direct.scaled(1.5 / entity.position.distanceTo(bot.entity.position))
                if (bot.blockAt(bot.entity.position.offset(direct.x, 0, direct.z)).boundingBox != "empty") {
                    bot.setControlState("jump", true)
                    bot.setControlState("jump", false)
                }
            });
        }
    }
}

var mover;
function followPath(path) {
    if (!path || !path.options) throw new Error("Invalid path or options")
    var index = 0;
    var exception = false;
    var preRad;
    var prePos = myPosition();
    var preIndex = -1;
    var indexCount;
    var waitCount = 0;
    var stopCount = 0;
    var options = path.options
    var msgable = glob.logMove || !options.ignore
    var logable = glob.logMove
    mover = setInterval(step, CONFIG.stepTime);
    function step() {
        if (index < path.length) {
            if (preIndex != index) {
                indexCount = 0;
                preIndex = index;
            }
            if (myPosition().floor().manhattanDistanceTo(prePos) == 0) {
                stopCount++;
            } else {
                stopCount = 0;
            }
            prePos = myPosition().floor()
            if (exception || (!glob.isWaiting && stopCount > CONFIG.stepError)) { // exception = true or stopping long time
                bot.clearControlStates();
                bot.log("[move] path error end : " + path[index] + path[index].action +" stops: " + stopCount);
                if (glob.isFollowing) {
                    if (targetEntity && targetEntity.isValid) {
                        stopPath();
                        reFollow(targetEntity);
                    } else {
                        stopMoving();
                    }
                } else if (glob.isRandomWalking) {
                    stopPath();
                    reRandom();
                } else {
                    stopPath();
                    if (options.continue)
                        goToPos(finalDestination, options)
                }
                return
            } else {
                const elem = path[index]
                const dest = elem.offset(0.5, 0, 0.5)
                const look = dest.offset(0, eyeHeight, 0)
                const rad = getRad2(myPosition(), dest);
                const distance = myPosition().xzDistanceTo(dest)
                if (indexCount == 0) preRad = rad;
                const height = myPosition().y;
                if (logable) bot.log("[move] " + elem + "  cnt: " + indexCount + " stop: " + stopCount + " dist: " + Math.floor(1000 * distance) / 1000 + " rad: " + Math.floor(1000 * getRadDiff(preRad, rad) / Math.PI * 180) / 1000);
                switch (elem.action) {
                    case "walk":
                        if (indexCount == 0) {
                            bot.lookAt(look, true);
                            bot.setControlState('forward', true);
                        }
                        if (indexCount > CONFIG.stepError) {
                            exception = true;
                            break;
                        } else if (distance > 2) {
                            exception = true;
                            break;
                        } else if (getRadDiff(preRad, rad) > CONFIG.stopRad || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        break;
                    case "sprint":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('forward', true);
                            bot.setControlState('sprint', true);
                        }
                        if (getRadDiff(preRad, rad) > CONFIG.stopRad || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        break;
                    case "upstair":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                            bot.setControlState('forward', true);
                        } else if (indexCount > CONFIG.stepError) {
                            exception = true;
                            break;
                        }
                        if ((height - onGround) % 1 != 0) break;
                        if (dest.y != height - onGround && indexCount > 1) {
                            exception = true;
                            break;
                        } else if (getRadDiff(preRad, rad) > CONFIG.stopRad || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        break;
                    case "land":
                    case "downstair":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('forward', true);
                        } else if (indexCount == 10) {
                            bot.entity.position = dest.offset(0, onGround, 0)
                        } else if (indexCount > CONFIG.stepError) {
                            exception = true;
                            break;
                        }
                        if (getRadDiff(preRad, rad) > CONFIG.stopRad || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                        }
                        if ((dest.y == height - onGround) && ((height - onGround) % 1 == 0)) {//onGround
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        break;
                    case "longjumpover":
                        bot.setControlState('sprint', true)
                    case "jumpover":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                            bot.setControlState('forward', true);
                        }
                        if ((height - onGround) % 1 != 0) break;
                        if (dest.y != height - onGround) {
                            exception = true;
                            break;
                        }
                        if (getRadDiff(preRad, rad) > CONFIG.stopRad || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        break;
                    case "door":
                        bot.clearControlStates();
                        bot.lookAt(look, true);
                        bot.setControlState('forward', true);
                        var door = bot.blockAt(elem);
                        if (door.metadata < 4 || 7 < door.metadata) {
                            if (indexCount % 3 == 0)
                                bot.lookAt(dest, true, function () {
                                    bot.activateBlock(door);
                                });
                        } else {
                            index++;
                        }
                        break;
                    case "strict":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            bot.lookAt(look, true);
                            bot.entity.position = dest.offset(0, onGround, 0)
                        } else {
                            index++;
                        }
                        break;
                    case "follow":
                        if (targetEntity && targetEntity.isValid) {
                            bot.lookAt(targetEntity.position.offset(0, eyeHeight, 0), false)
                            stopPath()
                            reFollow(targetEntity);
                        } else {
                            stopMoving()
                        }
                        break;
                    case "random":
                        stopPath()
                        reRandom()
                        break;
                    case "freeze":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            waitCount = elem.metadata;
                        } else if (indexCount >= waitCount) {
                            index++;
                            break;
                        }
                        stopCount = 0;
                        break;
                    case "wait":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            glob.isWaiting = true;
                            glob.finishState("move")
                            waitCount = node.metadata;
                        } else if (indexCount >= waitCount) {
                            glob.queueOnceState("move", function () {
                                index++;
                                glob.isWaiting = false;
                            });
                            break;
                        }
                        stopCount = 0;
                        break;
                    case "bridge":
                    case "buildstair":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            var newBlockPos = elem.offset(0, -1, 0)
                            var oldBlock = bot.blockAt(newBlockPos)
                            var item = glob.findItem(CONFIG.pathblocks)
                            if (!item) bot.log("[move] No Movement Block")
                            glob.placeBlockAt(item, newBlockPos, (err) => {
                                if (err) {
                                    bot.log(err)
                                    exception = true
                                } else index++
                            })
                        }
                        break;
                    case "scafford":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            bot.entity.pitch = -Math.PI / 2
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                        } else if (indexCount == 3) {
                            var newBlockPos = elem.offset(0, -1, 0)
                            var oldBlock = bot.blockAt(newBlockPos)
                            var item = glob.findItem(CONFIG.pathblocks)
                            if (!item) bot.log("[move] No Movement Block")
                            glob.placeBlockAt(item, newBlockPos, (err) => {
                                if (err) {
                                    bot.log(err)
                                    exception = true
                                } else index++
                            })
                        }
                        break;
                    default:
                        bot.log("[move] unknown state");
                        stopMoving();
                }
                indexCount++
                preRad = rad
            }
        } else {
            stopMoving();
            if (msgable) bot.log("[move] path complete : " + myPosition().floor());
        }
    }
}

const walks = [
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1)
];
const crosses = [
    new Vec3(1, 0, 1), new Vec3(0, 0, 1), new Vec3(1, 0, 0),
    new Vec3(-1, 0, 1), new Vec3(0, 0, 1), new Vec3(-1, 0, 0),
    new Vec3(1, 0, -1), new Vec3(0, 0, -1), new Vec3(1, 0, 0),
    new Vec3(-1, 0, -1), new Vec3(0, 0, -1), new Vec3(-1, 0, 0)
];
const upstairs = [
    new Vec3(1, 1, 0),
    new Vec3(-1, 1, 0),
    new Vec3(0, 1, 1),
    new Vec3(0, 1, -1)
];
const downstairs = [
    new Vec3(1, -1, 0),
    new Vec3(-1, -1, 0),
    new Vec3(0, -1, 1),
    new Vec3(0, -1, -1)
];
const jumpovers = [
    new Vec3(2, 0, 0), new Vec3(1, -1, 0),
    new Vec3(-2, 0, 0), new Vec3(-1, -1, 0),
    new Vec3(0, 0, 2), new Vec3(0, -1, 1),
    new Vec3(0, 0, -2), new Vec3(0, -1, -1)
];
const longjumpovers = [
    new Vec3(3, 0, 0), new Vec3(1, -1, 0), new Vec3(2, -1, 0),
    new Vec3(-3, 0, 0), new Vec3(-1, -1, 0), new Vec3(-2, -1, 0),
    new Vec3(0, 0, 3), new Vec3(0, -1, 1), new Vec3(0, -1, 2),
    new Vec3(0, 0, -3), new Vec3(0, -1, -1), new Vec3(0, -1, -2)
];
const lands = [
    new Vec3(1, -2, 0),
    new Vec3(-1, -2, 0),
    new Vec3(0, -2, 1),
    new Vec3(0, -2, -1),
    new Vec3(1, -3, 0),
    new Vec3(-1, -3, 0),
    new Vec3(0, -3, 1),
    new Vec3(0, -3, -1)
];
const bridges = [
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1)
];
const buildstairs = [
    new Vec3(1, 1, 0),
    new Vec3(-1, 1, 0),
    new Vec3(0, 1, 1),
    new Vec3(0, 1, -1)
];
const scafford = new Vec3(0, 1, 0)
const Cost = {
    "walk": 1,
    "upstair": 5,
    "downstair": 4,
    "jumpover": 5,
    "longjumpover": 7,
    "land": 8,
    "bridge": 20,
    "buildstair": 21,
    "scafford": 22,
}

function moveCost(move) {
    return Cost[move]
}

const DefalutOptions = {
    allowGoal: CONFIG.allowGoal,
    rejectGoal: -1,
    searchLimit: CONFIG.searchLimit,
    strictfin: false,
    standadjust: -1,

    landable: true,
    bridgeable: false,
    buildstairable: false,
    scaffordable: false,

    ignore: false,
    continue: true
}
function setDefaultOptions(options = {}) {
    Object.keys(DefalutOptions).forEach((key) => {
        if (options[key] == undefined) options[key] = DefalutOptions[key]
    })
    return options
}
/**
 * @param {*} start start pos
 * @param {*} goal goal pos
 * @param {*} options 
 * allowGoal : rejectGoal : searchLimit : strictfin : standadjust
 * landable : bridgeable : buildstairable : scaffordable
 * ignore : continue
 */
function bestFirstSearch(start, goal, reqOptions) {
    const path = []
    const options = setDefaultOptions(reqOptions)

    setStandable(start)
    if (options.standadjust >= 0) setStandable(goal, options.standadjust);
    else setStandable(goal);

    path.start = start
    path.goal = goal

    if (options.allowGoal <= options.rejectGoal) {
        bot.log("[move] invalid options")
        return null
    }

    path.options = options;
    var closed = [];
    var open = new bucketsJs.PriorityQueue(compare);
    var count = 0;
    closed.push(start);
    open.enqueue(new NodeElement(start, start.manhattanDistanceTo(goal), undefined));
    while (!open.isEmpty()) {
        let node = open.dequeue();
        if (isGoal(node.p, goal, options.allowGoal, options.rejectGoal)) { // find path
            let cost = convertNode(path, node);
            optimize(path);
            if (glob.logMove) bot.log("[move] cost: " + cost);
            return path;
        } else if (count++ > options.searchLimit) { // limit over
            let nearDistances = [];
            for (let i = 0; i < closed.length; i++) {
                nearDistances.push(closed[i].manhattanDistanceTo(goal));
            }
            let nearest = getMinInd(nearDistances);
            if (nearest == -1) {
                bot.log("[move] Something Error Nearest ");
            }
            bot.log("[move] nearest: " + closed[nearest]);
            options.allowGoal = 0
            options.rejectGoal = -1
            return bestFirstSearch(start, closed[nearest], options);
        }
        let expanded = expandNode(node, options);
        for (let i = 0; i < expanded.length; i++) { // expand
            let pos = expanded[i];
            if (!containPos(closed, pos)) {
                closed.push(pos);
                let newNode = new NodeElement(pos, pos.manhattanDistanceTo(goal) + moveCost(pos.action), node);
                open.enqueue(newNode);
            }
        }
    }
    bot.log("[move] impossible to go there");
    return null;
}

function expandNode(node, options) {
    const ret = [];
    const prepos = node.p
    var pos;
    for (let i = 0; i < walks.length; i++) {
        pos = prepos.plus(walks[i]);
        if (isStandable(pos)) {
            pos.action = "walk";
            ret.push(pos);
        }
    }
    for (let i = 0; i < crosses.length; i += 3) {
        pos = prepos.plus(crosses[i]);
        if (isStandable(pos) &&
            isThroughable(prepos.plus(crosses[i + 1])) && isThroughable(prepos.plus(crosses[i + 2]))
        ) {
            pos.action = "walk";
            ret.push(pos);
        }
    }

    if (isThroughable(prepos.offset(0, 1, 0))) {
        for (let i = 0; i < upstairs.length; i++) {
            pos = prepos.plus(upstairs[i]);
            if (isStandable(pos)) {
                pos.action = "upstair";
                ret.push(pos);
            }
        }
    }

    for (let i = 0; i < downstairs.length; i++) {
        pos = prepos.plus(downstairs[i]);
        if (isStandable(pos) && isThroughable(prepos.offset(0, 1, 0))) {
            pos.action = "downstair";
            ret.push(pos);
        }
    }

    if (isThroughable(prepos.offset(0, 1, 0))) {
        for (let i = 0; i < jumpovers.length; i += 2) {
            pos = prepos.plus(jumpovers[i]);
            let midpos = prepos.plus(jumpovers[i + 1]);
            if (isStandable(pos) && isThroughable(midpos) && isThroughable(midpos.offset(0, 2, 0))
                && isThroughable(pos.offset(0, 1, 0))) {
                pos.action = "jumpover";
                ret.push(pos);
            }
        }
    }

    if (isThroughable(prepos.offset(0, 1, 0))) {
        for (let i = 0; i < longjumpovers.length; i += 3) {
            pos = prepos.plus(longjumpovers[i]);
            let midpos1 = prepos.plus(longjumpovers[i + 1]);
            let midpos2 = prepos.plus(longjumpovers[i + 2]);
            if (isStandable(pos)
                && isThroughable(midpos1) && isThroughable(midpos1.offset(0, 2, 0))
                && isThroughable(midpos2) && isThroughable(midpos2.offset(0, 2, 0))
                && isThroughable(pos.offset(0, 1, 0))) {
                pos.action = "longjumpover";
                ret.push(pos);
            }
        }
    }

    if (options.landable)
        for (let i = 0; i < lands.length; i++) {
            pos = prepos.plus(lands[i]);
            if (isStandable(pos) && isThroughable(pos.offset(0, 2, 0)) && isThroughable(pos.offset(0, 4, 0))) {
                pos.action = "land";
                ret.push(pos);
            }
        }

    if (options.bridgeable)
        for (let i = 0; i < bridges.length; i++) {
            pos = prepos.plus(bridges[i]);
            if (isThroughable(pos) && isPlaceable(pos.offset(0, -1, 0))) {
                pos.action = "bridge";
                ret.push(pos);
            }
        }

    if (options.buildstairable)
        if (isThroughable(prepos.offset(0, 1, 0)))
            for (let i = 0; i < buildstairs.length; i++) {
                pos = prepos.plus(buildstairs[i]);
                if (isThroughable(pos) && isPlaceable(pos.offset(0, -1, 0)) && referenceAt(pos.offset(0, -1, 0))) {
                    pos.action = "buildstair";
                    ret.push(pos);
                }
            }

    if (options.scaffordable) {
        pos = prepos.plus(scafford);
        if (isThroughable(pos)) {
            pos.action = "scafford";
            ret.push(pos);
        }
    }

    return ret;
}

function convertNode(path, node) {
    var sum = 0;
    var tmp = node;

    finalDestination = tmp.p.clone();
    while (tmp.parent != null) {
        path.push(tmp.p);
        sum += moveCost(tmp.p.action);
        tmp = tmp.parent;
    }
    path.reverse();
    return sum;
}

function optimize(path) {
    if (path.length == 0) return;
    const options = path.options;
    var start = myPosition().floor();
    if (bot.blockAt(start).boundingBox == "door") {
        let strict = start.clone(); strict.action = "strict";
        let door = start.clone(); door.action = "door";
        path.splice(0, 0, strict);
        path.splice(1, 0, door);
    }
    var s = 0;
    if (bot.blockAt(path[0]).boundingBox == "door") {
        let strict = myPosition().floor(); strict.action = "strict";
        let pathDoor = path[0].clone(); pathDoor.action = "door";
        path.splice(0, 0, strict);
        path.splice(1, 0, pathDoor);
        s += 2;
    }
    for (let i = s; i < path.length; i++) {
        if (bot.blockAt(path[i]).boundingBox == "door") {
            const doorFront = path[i - 1].clone(); doorFront.action = "strict";
            const pathDoor = path[i].clone(); pathDoor.action = "door";
            path.splice(i, 0, doorFront);
            path.splice(i + 1, 0, pathDoor);
            i += 2;
        }
    }
    var startInd;
    var cnt = 0;
    var dir;
    var preDir;
    var fin = false;
    for (let i = 0; i < path.length; i++) {
        if (path[i].action == "walk") {
            if (cnt == 0) {
                startInd = i;
                cnt++;
                continue;
            }
            if (cnt == 1) {
                dir = getRad2(path[i - 1], path[i]);
                preDir = dir;
                cnt++;
            }
            if (cnt >= 2) {
                dir = getRad2(path[i - 1], path[i]);
                if (dir == preDir) {
                    cnt++;
                } else if (cnt >= 3) {
                    fin = true;
                } else {
                    i -= 2;
                    cnt = 0;
                    continue;
                }
                preDir = dir;
            }
        } else if (cnt >= 3) {
            fin = true;
        } else {
            cnt = 0;
        }
        if (i >= path.length - 1 && cnt >= 3) {
            fin = true;
        }
        if (fin) {
            fin = false;
            path[i - 1].action = "sprint";
            var goal = path[i - 1];
            path.splice(startInd + 1, i - startInd - 1, goal);
            cnt = 0;
            i = startInd + 1;
        }
    }
    var pathBlockCnt = 0
    for (let i = 0; i < path.length; i++) {
        const blockPos = path[i].clone();
        switch (path[i].action) {
            case "bridge":
                blockPos.action = "walk"
                path.splice(i + 1, 0, blockPos);
                pathBlockCnt++
                break
            case "buildstair":
                blockPos.action = "upstair"
                path.splice(i + 1, 0, blockPos);
                pathBlockCnt++
                break
            case "scafford":
                blockPos.action = "freeze"
                blockPos.metadata = 6
                path.splice(i + 1, 0, blockPos);
                pathBlockCnt++
                break
        }
    }
    path.pathBlockCnt = pathBlockCnt
    if (options.strictfin) {
        const fin = path[path.length - 1].clone();
        fin.action = "strict"
        path.push(fin)
    }
}

function isNotAvoidance(block) {
    if (block.name.match(/wall|fence|lava|water|magma/))
        return false;
    else
        return true;
}


function isStandable(pos) {
    const vec = pos
    const B1 = bot.blockAt(vec.offset(0, -1, 0))
    const B2 = bot.blockAt(vec)
    const B3 = bot.blockAt(vec.offset(0, 1, 0))
    if (B1.boundingBox == 'block' &&
        B2.boundingBox != 'block' &&
        B3.boundingBox != 'block' &&
        isNotAvoidance(B1) &&
        isNotAvoidance(B2)
    ) {
        return true;
    } else {
        return false;
    }
}

function isThroughable(pos) {
    const B1 = bot.blockAt(pos)
    const B2 = bot.blockAt(pos.offset(0, 1, 0))
    if (B1.boundingBox != 'block' &&
        B2.boundingBox != 'block' &&
        isNotAvoidance(B2)
    ) {
        return true;
    } else {
        return false;
    }
}

function isPlaceable(pos) {
    const B = bot.blockAt(pos)
    if (B.boundingBox == "empty" || B.boundingBox == "water")
        return true
    else
        return false
}

const roundPos = [
    new Vec3(0, -1, 0),
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
    new Vec3(0, 1, 0)
]
function referenceAt(pos) {
    const vec = pos
    for (let i = 0; i < roundPos.length; i++) {
        if (bot.blockAt(vec.plus(roundPos[i])).type != 0) {
            return bot.blockAt(vec.plus(roundPos[i]))
        }
    }
    return null
}

function setStandable(pos, limit = 15) {
    pos.floor()
    if (limit == 0) return isStandable(pos)
    if (!isStandable(pos)) {
        var direct = 1;
        var tmp = pos.offset(0, direct, 0);
        while (!isStandable(tmp)) {
            direct *= -1;
            if (direct > 0) direct++;
            if (direct > limit) return false;

            tmp = pos.offset(0, direct, 0);
        }
        pos.add(new Vec3(0, direct, 0));
    }
    return true;
}

function getRandomPos(root, distance, height = 2) {
    var limit = 100;
    var ret;
    for (var i = 0; i < limit; i++) {
        var rad = Math.random() * 2 * Math.PI;
        var pl = new Vec3(Math.random() * distance * Math.sin(rad), 0, Math.random() * distance * Math.cos(rad));
        ret = root.plus(pl);
        if (setStandable(ret, height)) return ret;
    }
    return root;
}

function isGoal(pos, goal, allowGoal, rejectGoal) {
    if (pos.manhattanDistanceTo(goal) <= allowGoal && xzManhattanDustance(pos, goal) > rejectGoal && xzManhattanDustance(pos.offset(0, 1, 0), goal) > rejectGoal) return true;
    else return false;
}

function xzManhattanDustance(pos, target) {
    return Math.abs(target.x - pos.x) + Math.abs(target.z - pos.z);
}

function getRad2(pos1, pos2) {
    return Math.atan2(pos1.x - pos2.x, pos1.z - pos2.z)
}

function getRadDiff(rad1, rad2) {
    return Math.min(Math.abs(rad1 - rad2), Math.abs(2 * Math.PI + Math.min(rad1, rad2) - Math.max(rad1, rad2)))
}

function getMinInd(arr) {
    if (arr.length > 0) {
        var ret = 0;
        var minn = arr[0];
        for (var i = 1; i < arr.length; i++) {
            if (minn > arr[i]) {
                minn = arr[i];
                ret = i;
            }
        }
        return ret;
    } else {
        return -1;
    }
}

function myPosition() {
    return bot.entity.position.clone()
}

function containPos(arr, p) {
    for (var i = 0; i < arr.length; i++) {
        if (p.manhattanDistanceTo(arr[i]) == 0) {
            return true;
        }
    }
    return false;
}

class NodeElement {
    constructor(p, cost, parent) {
        try {
            this.p = p;
            this.cost = cost;
            this.parent = parent;
        }
        catch (e) { console.log(e); }
    }
}

function compare(a, b) {
    if (a.cost < b.cost) {
        return 1;
    } else if (a.cost > b.cost) {
        return -1;
    }
    // a must be equal to b
    return 0;
}

/////////////////////////////////////////////////////////////////////////////////////////////

// 追いかけないが注目する対象 interest
var interest_entity = null;

function setInterestEntity(entity = null) {
    if (glob.doNothing() && entity && interest_entity !== entity) {
        interest_entity = entity;
        var name = interest_entity.name !== undefined ? interest_entity.name : interest_entity.username;
        var type = interest_entity.type;
        var kind = interest_entity.kind;
        if (glob.logInterest)
            bot.log('[interest] interested in ' + name + ' (' + type + (kind !== undefined ? ':' + kind : '') + ')');
    } else {
        interest_entity = null;
    }
}

bot.on('entityMoved', (entity) => {
    var distance = bot.entity.position.distanceTo(entity.position);

    var collideDistance = myPosition().xzDistanceTo(entity.position);
    var collideHeight = Math.abs(myPosition().y - entity.position.y)

    // 至近距離にプレイヤーがいる場合少し動く
    if (entity.type === 'player' && collideDistance < 0.8 && collideHeight < 1.5 && glob.doNothing() && glob.isCollisionalMode) {
        var botpos = bot.entity.position.clone();
        var entpos = entity.position.clone();
        botpos.y = entpos.y = 0;
        botpos.subtract(entpos);
        bot.entity.velocity.add(botpos.scaled(20));
    }

    if (distance < 5) {
        if (entity.type == "player" || entity.type == "mob") {
            if (!interest_entity) {
                // 注目している人がいないなら注目
                setInterestEntity(entity);
            } else {
                // 既に注目している人が居る場合、その人よりも近ければ注目を切り替える
                if (bot.entity.position.distanceTo(interest_entity.position) > distance)
                    setInterestEntity(entity);
                else
                    setInterestEntity(interest_entity);
            }
        }
    }
});

function interest_signal() {
    if (interest_entity && bot.entity.position.distanceTo(interest_entity.position) < 5) {
        if (glob.isInterestMode && glob.doNothing())
            bot.lookAt(interest_entity.position.offset(0, eyeHeight, 0));
    } else {
        setInterestEntity();
    }
}
