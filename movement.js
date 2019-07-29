
glob.isFollowing = false;
glob.isRandomWalking = false;

glob.isWaiting = false;

glob.isCollisionalMode = true;
glob.isInterestMode = true;

const onGround = 0.001;
const eyeHeight = 1.42;

glob.moveConfig = {
    stepTime: 60,
    stepError: 20,
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
    var start = getMyPos()
    var goal;
    if (Array.isArray(point)) {
        goal = point;
    } else {
        goal = point.toArray();
    }
    floor(start);
    floor(goal);
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
    var start = floor(getMyPos());
    var goal = entity.position.floored().toArray();
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
            path[CONFIG.followInterval][3] = "follow"
        } else {
            path.push([start[0], start[1], start[2], "follow"]);
        }
        glob.queueOnceState("move", followPath, path)
    }
}

function randomWalk(range = Infinity) {
    stopMoving();
    bot.log("[move] random walk ");
    glob.isRandomWalking = true;
    CONFIG.randomCollar = range
    randomOrigin = getMyPos()
    reRandom();
}

function reRandom() {
    if (!glob.isRandomWalking) return;
    var start = floor(getMyPos())
    setStandable(start);
    var goal = getRandomPos(start, Math.min(CONFIG.randomDistance, CONFIG.randomCollar), CONFIG.randomHeight);
    if (getL2(goal, randomOrigin) > CONFIG.randomCollar) {
        if (glob.logMove) bot.log("[move] too far: reRandom " + getL2(goal, randomOrigin))
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
        path[CONFIG.randomInterval][3] = "random";
    } else {
        path.push([goal[0], goal[1], goal[2], "random"]);
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
    if (!path) {
        bot.log("[move] null path")
        return
    }
    var index = 0;
    var exception = false;
    var preRad;
    var prePos = getMyPos();
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
            if (getL1(floor(getMyPos()), prePos) == 0) {
                stopCount++;
            } else {
                stopCount = 0;
            }
            prePos = floor(getMyPos())
            if (exception || (!glob.isWaiting && stopCount > CONFIG.stepError)) { // exception = true or stopping long time
                bot.clearControlStates();
                bot.log("[move] path error end : " + path[index] + " stops: " + stopCount);
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
                const node = path[index]
                const dest = [node[0] + 0.5, node[1], node[2] + 0.5]
                const look = new Vec3(dest).offset(0, eyeHeight, 0)
                const rad = getRad2(getMyPos(), dest);
                const distance = getXZL2(getMyPos(), dest)
                if (indexCount == 0) preRad = rad;
                const height = getMyPos()[1];
                if (logable) bot.log("[move] " + node + "  cnt: " + indexCount + " stop: " + stopCount + " dist: " + Math.floor(1000 * distance) / 1000 + " rad: " + Math.floor(1000 * getRadDiff(preRad, rad) / Math.PI * 180) / 1000);
                switch (node[3]) {
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
                        if (dest[1] != height - onGround && indexCount > 1) {
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
                            bot.entity.position = new Vec3(dest).offset(0, onGround, 0)
                        } else if (indexCount > CONFIG.stepError) {
                            exception = true;
                            break;
                        }
                        if (getRadDiff(preRad, rad) > CONFIG.stopRad || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                        }
                        if ((dest[1] == height - onGround) && ((height - onGround) % 1 == 0)) {//onGround
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
                        if (dest[1] != height - onGround) {
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
                        var door = bot.blockAt(new Vec3(node));
                        if (door.metadata < 4 || 7 < door.metadata) {
                            if (indexCount % 3 == 0)
                                bot.lookAt(new Vec3(dest), true, function () {
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
                            bot.entity.position = new Vec3(dest).offset(0, onGround, 0)
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
                            waitCount = node[4];
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
                            waitCount = node[4];
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
                            var newBlockPos = new Vec3(node).offset(0, -1, 0)
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
                            var newBlockPos = new Vec3(node).offset(0, -1, 0)
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
            if (msgable) bot.log("[move] path complete : " + floor(getMyPos()));
        }
    }
}

const walks = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1]
];
const crosses = [
    [1, 0, 1], [0, 0, 1], [1, 0, 0],
    [-1, 0, 1], [0, 0, 1], [-1, 0, 0],
    [1, 0, -1], [0, 0, -1], [1, 0, 0],
    [-1, 0, -1], [0, 0, -1], [-1, 0, 0]
];
const upstairs = [
    [1, 1, 0],
    [-1, 1, 0],
    [0, 1, 1],
    [0, 1, -1]
];
const downstairs = [
    [1, -1, 0],
    [-1, -1, 0],
    [0, -1, 1],
    [0, -1, -1]
];
const jumpovers = [
    [2, 0, 0], [1, -1, 0],
    [-2, 0, 0], [-1, -1, 0],
    [0, 0, 2], [0, -1, 1],
    [0, 0, -2], [0, -1, -1]
];
const longjumpovers = [
    [3, 0, 0], [1, -1, 0], [2, -1, 0],
    [-3, 0, 0], [-1, -1, 0], [-2, -1, 0],
    [0, 0, 3], [0, -1, 1], [0, -1, 2],
    [0, 0, -3], [0, -1, -1], [0, -1, -2]
];
const lands = [
    [1, -2, 0],
    [-1, -2, 0],
    [0, -2, 1],
    [0, -2, -1],
    [1, -3, 0],
    [-1, -3, 0],
    [0, -3, 1],
    [0, -3, -1]
];
const bridges = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1]
];
const buildstairs = [
    [1, 1, 0],
    [-1, 1, 0],
    [0, 1, 1],
    [0, 1, -1]
];
const scafford = [0, 1, 0]
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
 * returns the cost of finalpath
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
    var node;
    var expanded;
    var count = 0;
    closed.push(start);
    open.enqueue(new NodeElement(start, getL1(start, goal), node));
    while (!open.isEmpty()) {
        node = open.dequeue();
        if (isGoal(node.p, goal, options.allowGoal, options.rejectGoal)) { // find path
            let cost = convertNode(path, node);
            optimize(path);
            if (glob.logMove) bot.log("[move] cost: " + cost);
            return path;
        } else if (count++ > options.searchLimit) { // limit over
            let nearDistances = [];
            for (let i = 0; i < closed.length; i++) {
                nearDistances.push(getL1(closed[i], goal));
            }
            let nearest = getMinInd(nearDistances);
            bot.log("[move] nearest: " + closed[nearest]);
            options.allowGoal = 0
            options.rejectGoal = -1
            return bestFirstSearch(start, closed[nearest], options);
        }
        expanded = expandNode(node, options);
        for (let i = 0; i < expanded.length; i++) { // expand
            let pos = expanded[i];
            if (!contains(closed, pos)) {
                closed.push(pos);
                let newNode = new NodeElement(pos, getL1(pos, goal) + moveCost(pos[3]), node);
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
        pos = plus(prepos, walks[i]);
        if (isStandable(pos)) {
            pos.push("walk");
            ret.push(pos);
        }
    }
    for (let i = 0; i < crosses.length; i += 3) {
        pos = plus(prepos, crosses[i]);
        if (isStandable(pos) &&
            isThroughable(plus(prepos, crosses[i + 1])) && isThroughable(plus(prepos, crosses[i + 2]))
        ) {
            pos.push("walk");
            ret.push(pos);
        }
    }

    if (isThroughable(plus(prepos, [0, 1, 0]))) {
        for (let i = 0; i < upstairs.length; i++) {
            pos = plus(prepos, upstairs[i]);
            if (isStandable(pos)) {
                pos.push("upstair");
                ret.push(pos);
            }
        }
    }

    for (let i = 0; i < downstairs.length; i++) {
        pos = plus(prepos, downstairs[i]);
        if (isStandable(pos) && isThroughable(plus(pos, [0, 1, 0]))) {
            pos.push("downstair");
            ret.push(pos);
        }
    }

    if (isThroughable(plus(prepos, [0, 1, 0]))) {
        for (let i = 0; i < jumpovers.length; i += 2) {
            pos = plus(prepos, jumpovers[i]);
            let midpos = plus(prepos, jumpovers[i + 1]);
            if (isStandable(pos) && isThroughable(midpos) && isThroughable(plus(midpos, [0, 2, 0]))
                && isThroughable(plus(pos, [0, 1, 0]))) {
                pos.push("jumpover");
                ret.push(pos);
            }
        }
    }

    if (isThroughable(plus(prepos, [0, 1, 0]))) {
        for (let i = 0; i < longjumpovers.length; i += 3) {
            pos = plus(prepos, longjumpovers[i]);
            let midpos1 = plus(prepos, longjumpovers[i + 1]);
            let midpos2 = plus(prepos, longjumpovers[i + 2]);
            if (isStandable(pos)
                && isThroughable(midpos1) && isThroughable(plus(midpos1, [0, 2, 0]))
                && isThroughable(midpos2) && isThroughable(plus(midpos2, [0, 2, 0]))
                && isThroughable(plus(pos, [0, 1, 0]))) {
                pos.push("longjumpover");
                ret.push(pos);
            }
        }
    }

    if (options.landable)
        for (let i = 0; i < lands.length; i++) {
            pos = plus(prepos, lands[i]);
            if (isStandable(pos) && isThroughable(plus(pos, [0, 2, 0])) && isThroughable(plus(pos, [0, 4, 0]))) {
                pos.push("land");
                ret.push(pos);
            }
        }

    if (options.bridgeable)
        for (let i = 0; i < bridges.length; i++) {
            pos = plus(prepos, bridges[i]);
            if (isThroughable(pos) && isPlaceable(plus(pos, [0, -1, 0]))) {
                pos.push("bridge");
                ret.push(pos);
            }
        }

    if (options.buildstairable)
        if (isThroughable(plus(prepos, [0, 1, 0])))
            for (let i = 0; i < buildstairs.length; i++) {
                pos = plus(prepos, buildstairs[i]);
                if (isThroughable(pos) && isPlaceable(plus(pos, [0, -1, 0])) && referenceAt(plus(pos, [0, -1, 0]))) {
                    pos.push("buildstair");
                    ret.push(pos);
                }
            }

    if (options.scaffordable) {
        pos = plus(prepos, scafford);
        if (isThroughable(pos)) {
            pos.push("scafford");
            ret.push(pos);
        }
    }

    return ret;
}

function convertNode(path, node) {
    var sum = 0;
    var tmp = node;

    finalDestination = [tmp.p[0], tmp.p[1], tmp.p[2]];
    while (tmp.parent != null) {
        path.push([tmp.p[0], tmp.p[1], tmp.p[2], tmp.p[3]]);
        sum += moveCost(tmp.p[3]);
        tmp = tmp.parent;
    }
    path.reverse();
    return sum;
}

function optimize(path) {
    if (path.length == 0) return;
    const options = path.options;
    var start = floor(getMyPos());
    if (bot.blockAt(new Vec3(start)).boundingBox == "door") {
        path.splice(0, 0, [start[0], start[1], start[2], "strict"]);
        path.splice(1, 0, [start[0], start[1], start[2], "door"]);
    }
    var s = 0;
    if (bot.blockAt(new Vec3(path[0])).boundingBox == "door") {
        const pathDoor = path[0];
        path.splice(0, 0, [start[0], start[1], start[2], "strict"]);
        path.splice(1, 0, [pathDoor[0], pathDoor[1], pathDoor[2], "door"]);
        s += 2;
    }
    for (let i = s; i < path.length; i++) {
        if (bot.blockAt(new Vec3(path[i])).boundingBox == "door") {
            const pathDoor = path[i];
            const doorFront = path[i - 1];
            path.splice(i, 0, [doorFront[0], doorFront[1], doorFront[2], "strict"]);
            path.splice(i + 1, 0, [pathDoor[0], pathDoor[1], pathDoor[2], "door"]);
            i += 2;
        }
    }
    var startInd;
    var cnt = 0;
    var dir;
    var preDir;
    var fin = false;
    for (let i = 0; i < path.length; i++) {
        if (path[i][3] == "walk") {
            if (cnt == 0) {
                startInd = i;
                cnt++;
                continue;
            }
            if (cnt == 1) {
                dir = getdirection(path[i - 1], path[i]);
                preDir = dir;
                cnt++;
            }
            if (cnt >= 2) {
                dir = getdirection(path[i - 1], path[i]);
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
            path[i - 1][3] = "sprint";
            var goal = path[i - 1];
            path.splice(startInd + 1, i - startInd - 1, goal);
            cnt = 0;
            i = startInd + 1;
        }
    }
    var pathBlockCnt = 0
    for (let i = 0; i < path.length; i++) {
        const blockPos = path[i];
        switch (blockPos[3]) {
            case "bridge":
                path.splice(i + 1, 0, [blockPos[0], blockPos[1], blockPos[2], "walk"]);
                pathBlockCnt++
                break
            case "buildstair":
                path.splice(i + 1, 0, [blockPos[0], blockPos[1], blockPos[2], "upstair"]);
                pathBlockCnt++
                break
            case "scafford":
                path.splice(i + 1, 0, [blockPos[0], blockPos[1], blockPos[2], "freeze", 6]);
                pathBlockCnt++
                break
        }
    }
    path.pathBlockCnt = pathBlockCnt
    if (options.strictfin) {
        const fin = path[path.length - 1];
        path.push([fin[0], fin[1], fin[2], "strict"])
    }
}

function isNotAvoidance(block) {
    if (block.name.match(/wall|fence|lava|water|magma/))
        return false;
    else
        return true;
}


function isStandable(pos) {
    const vec = new Vec3(pos)
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
    const B1 = bot.blockAt(new Vec3(pos))
    const B2 = bot.blockAt(new Vec3(pos).offset(0, 1, 0))
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
    const B = bot.blockAt(new Vec3(pos))
    if (B.boundingBox == "empty" || B.boundingBox == "water")
        return true
    else
        return false
}

function referenceAt(pos) {
    const vec = new Vec3(pos)
    const roundPos = [
        new Vec3(0, -1, 0),
        new Vec3(1, 0, 0),
        new Vec3(-1, 0, 0),
        new Vec3(0, 0, 1),
        new Vec3(0, 0, -1),
        new Vec3(0, 1, 0)
    ]
    for (let i = 0; i < roundPos.length; i++) {
        if (bot.blockAt(vec.plus(roundPos[i])).type != 0) {
            return bot.blockAt(vec.plus(roundPos[i]))
        }
    }
    return null
}

function setStandable(pos, limit = 15) {
    floor(pos)
    if (limit == 0) return isStandable(pos)
    if (!isStandable(pos)) {
        var direct = 1;
        var tmp = plus(pos, [0, direct, 0]);
        while (!isStandable(tmp)) {
            direct *= -1;
            if (direct > 0) direct++;
            if (direct > limit) return false;

            tmp = plus(pos, [0, direct, 0]);
        }
        add(pos, [0, direct, 0]);
    }
    return true;
}

function getRandomPos(root, distance, height = 2) {
    var limit = 100;
    var ret;
    for (var i = 0; i < limit; i++) {
        var rad = Math.random() * 2 * Math.PI;
        var pl = [Math.random() * distance * Math.sin(rad), 0, Math.random() * distance * Math.cos(rad)];
        ret = plus(root, pl);
        if (setStandable(ret, height)) return ret;
    }
    return root;
}

function isGoal(pos, goal, allowGoal, rejectGoal) {
    if (getL1(pos, goal) <= allowGoal && getXZL1(pos, goal) > rejectGoal && getXZL1(plus(pos, [0, 1, 0]), goal) > rejectGoal) return true;
    else return false;
}

function getL1(pos, target) {
    return Math.abs(target[0] - pos[0]) + Math.abs(target[1] - pos[1]) + Math.abs(target[2] - pos[2]);
}

function getXZL1(pos, target) {
    return Math.abs(target[0] - pos[0]) + Math.abs(target[2] - pos[2]);
}

function getL2(pos, target) {
    return Math.sqrt(Math.pow(target[0] - pos[0], 2) + Math.pow(target[1] - pos[1], 2) + Math.pow(target[2] - pos[2], 2));
}

function getXZL2(pos, target) {
    return Math.sqrt((target[0] - pos[0]) * (target[0] - pos[0]) + (target[2] - pos[2]) * (target[2] - pos[2]));
}

function plus(pos, vel) {
    return ([
        pos[0] + vel[0],
        pos[1] + vel[1],
        pos[2] + vel[2]
    ]);
}

function add(pos, vel) {
    pos[0] += vel[0];
    pos[1] += vel[1];
    pos[2] += vel[2];
    return pos;
}

function floor(pos) {
    pos[0] = Math.floor(pos[0]);
    pos[1] = Math.floor(pos[1]);
    pos[2] = Math.floor(pos[2]);
    return pos;
}


function scale(pos, scale) {
    pos[0] *= scale;
    pos[1] *= scale;
    pos[2] *= scale;
    return pos;
}

function getdirection(pos1, pos2) {
    return Math.atan2(pos1[0] - pos2[0], pos1[2] - pos2[2])
}

function vectorFromTo(pos1, pos2) {
    return new Vec3(pos1).minus(new Vec3(pos2))
}

function getRad2(pos1, pos2) {
    return Math.atan2(pos1[0] - pos2[0], pos1[2] - pos2[2])
}

function getRadDiff(rad1, rad2) {
    return Math.min(Math.abs(rad1 - rad2), Math.abs(2 * Math.PI + Math.min(rad1, rad2) - Math.max(rad1, rad2)))
}

function getPosFromVec3(abvec) {
    return abvec.toArray()
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

function getMyPos() {
    return bot.entity.position.toArray()
}

function contains(arr, p) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i][0] == p[0] &&
            arr[i][1] == p[1] &&
            arr[i][2] == p[2] &&
            arr[i][3] == p[3]
        ) {
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

    var collideDistance = getXZL2(getMyPos(), getPosFromVec3(entity.position));
    var collideHeight = Math.abs(getMyPos()[1] - getPosFromVec3(entity.position)[1])

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
