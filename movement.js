
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
    allowGoal: 1,
    allowFollow: 4,
    allowChase: 2,
    followInterval: 25,//step
    followWait: 50,//step
    randomDistance: 10,
    randomCollar: Infinity,
    randomHeight: 3,
    randomWait: 50,
    randomCostLimit: 100,
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

function goToPos(point, options = {}) {
    stopMoving();
    var goal;
    if (Array.isArray(point)) {
        goal = point;
    } else {
        goal = getPosFromVec3(point);
    }
    if (!options.ignore) options.ignore = false
    var start = getMyPos()
    var msgable = glob.logMove || !options.ignore
    var logable = glob.logMove
    floor(goal);
    floor(start);
    setStandable(start);
    if (options.standadjust >= 0) setStandable(goal, options.standadjust);
    else setStandable(goal);
    if (msgable) bot.log("[move] goto " + goal + " from " + start);
    if (logable) var pathfindtime = new Date().getTime();
    var path = [];
    var cost = bestFirstSearch(path, start, goal, options);
    if (logable) {
        bot.log("[move] pathfind took: " + (new Date().getTime() - pathfindtime) + "ms");
        bot.log("[move] cost: " + cost);
    }
    if (cost < Infinity) {
        glob.queueOnceState("move", followPath, path)
    } else {
        if (msgable) bot.log("[move] cannot find path");
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
    var start = getMyPos();
    var goal = getPosFromVec3(entity.position);
    floor(start);
    floor(goal);
    setStandable(start);
    setStandable(goal);

    if (glob.logMove) {
        bot.log("[move] follow revice " + goal);
    }

    if (entity.position.distanceTo(bot.entity.position) < CONFIG.allowFollow) {
        setTimeout(
            reFollow,
            Math.ceil(Math.random() * CONFIG.followWait * CONFIG.stepTime),
            entity
        )
    } else {
        var path = [];
        var cost = bestFirstSearch(path, start, goal, { allowGoal: CONFIG.allowFollow });
        if (glob.logMove)
            bot.log("[move] cost: " + cost);

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
    var start = getMyPos();
    setStandable(start);
    var goal = getRandomPos(start, Math.min(CONFIG.randomDistance, CONFIG.randomCollar), CONFIG.randomHeight);
    if (getL2(goal, randomOrigin) > CONFIG.randomCollar) {
        if (glob.logMove) bot.log("[move] too far: reRandom " + getL2(goal, randomOrigin))
        reRandom()
        return
    }
    floor(start);
    floor(goal);

    if (glob.logMove) {
        bot.log("[move] random revice " + goal);
    }
    var path = [];
    var cost = bestFirstSearch(path, start, goal, { landable: false });
    if (glob.logMove)
        bot.log("[move] cost: " + cost);
    if (CONFIG.randomCostLimit < cost) {
        reRandom(path);
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
    var index = 0;
    var exception = false;
    var preDistance = Infinity;
    var prePos = getMyPos();
    var preIndex = 0;
    var indexCount = 0;
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
            if (getDiff(floor(getMyPos()), prePos) == 0) {
                stopCount++;
            } else {
                stopCount = 0;
            }
            prePos = floor(getMyPos())
            if (exception || (path[index][3] != "wait" && stopCount > CONFIG.stepError)) { // exception = true or stopping long time
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
                var node = path[index]
                var dest = [node[0] + 0.5, node[1], node[2] + 0.5]
                var look = lookToVec(dest)
                var distance = getXZL2(getMyPos(), dest);
                var height = getMyPos()[1];
                if (logable) bot.log("[move] " + node + "  cnt: " + indexCount + " stop: " + stopCount);
                switch (node[3]) {
                    case "walk":
                        if (indexCount == 0) {
                            bot.lookAt(look, true);
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        if (indexCount > CONFIG.stepError) {
                            exception = true;
                            break;
                        } else if (distance > 2) {
                            exception = true;
                            break;
                        } else if (preDistance <= distance || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "sprint":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('forward', true);
                            bot.setControlState('sprint', true);
                            preDistance = Infinity;
                        }
                        if (preDistance <= distance || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "upstair":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        if ((height - onGround) % 1 != 0) break;
                        if (dest[1] != height - onGround && indexCount > 1) {
                            exception = true;
                            break;
                        } else if (preDistance <= distance - CONFIG.onPos || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "land":
                    case "downstair":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        if ((height - onGround) % 1 != 0) break;
                        if (dest[1] != height - onGround) {
                            //まだ降りてない
                        } else if (preDistance <= distance || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "longjumpover":
                        bot.setControlState('sprint', true)
                    case "jumpover":
                        bot.lookAt(look, true);
                        if (indexCount == 0) {
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        if ((height - onGround) % 1 != 0) break;
                        if (dest[1] != height - onGround) {
                            exception = true;
                            break;
                        }
                        if (preDistance <= distance - CONFIG.onPos || distance <= CONFIG.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "door":
                        bot.clearControlStates();
                        bot.lookAt(look, true);
                        bot.setControlState('forward', true);
                        var vec = posToVec(node);
                        var door = bot.blockAt(vec);
                        if (door.metadata < 4 || 7 < door.metadata) {
                            if (indexCount % 3 == 0)
                                bot.lookAt(posToVec(dest), true, function () {
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
                            bot.entity.position = posToVec(dest).offset(0, onGround, 0)
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
                            var newBlockPos = posToVec(plus(node, [0, -1, 0]))
                            var oldBlock = bot.blockAt(newBlockPos)
                            if (oldBlock && oldBlock.type == 0) { // assert
                                var item = glob.findItem(pathblocks)
                                if (!item) bot.log("[move] No Movement Block")
                                glob.placeBlockAt(item, newBlockPos, (!options.ignore || glob.logMove), (err) => {
                                    if (err) {
                                        bot.log(err)
                                        exception = true
                                    } else index++
                                })
                            }
                        }
                        break;
                    case "scafford":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                        } else if (indexCount == 4) {
                            var newBlockPos = posToVec(plus(node, [0, -1, 0]))
                            var oldBlock = bot.blockAt(newBlockPos)
                            if (oldBlock && oldBlock.type == 0) { // assert
                                var item = glob.findItem(pathblocks)
                                if (!item) bot.log("[move] No Movement Block")
                                glob.placeBlockAt(item, newBlockPos, (!options.ignore || glob.logMove), (err) => {
                                    if (err) {
                                        bot.log(err)
                                        exception = true
                                    } else index++
                                })
                            }
                        }
                        break;
                    default:
                        bot.log("[move] unknown state");
                        stopMoving();
                }
                indexCount++
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
var pathblocks = [3]//dirt

function moveCost(move) {
    switch (move) {
        case "walk": return 1;
        case "upstair": return 5;
        case "downstair": return 4;
        case "jumpover": return 5;
        case "longjumpover": return 7;
        case "land": return 4;
        case "bridge": return 20;
        case "buildstair": return 21;
        case "scafford": return 22;
        default:
            bot.log("[move] unknown move cost")
            return 0;
    }
}

/**
 * returns the cost of finalpath
 * @param {*} finalPath path destination
 * @param {*} start start pos
 * @param {*} goal goal pos
 * @param {*} options 
 * allowGoal : rejectGoal : searchLimit : strictfin : standadjust
 * landable : bridgeable : buildstairable : scaffordable
 * ignore : cotinue
 */
function bestFirstSearch(finalPath, start, goal, options) {
    if (options) {
        if (options.allowGoal == undefined)
            options.allowGoal = CONFIG.allowGoal
        if (options.rejectGoal == undefined)
            options.rejectGoal = -1
        if (options.searchLimit == undefined)
            options.searchLimit = CONFIG.searchLimit
        if (options.strictfin == undefined)
            options.strictfin = false
        if (options.standadjust == undefined)
            options.standadjust = -1

        if (options.landable == undefined)
            options.landable = true;
        if (options.bridgeable == undefined)
            options.bridgeable = false
        if (options.buildstairable == undefined)
            options.buildstairable = false
        if (options.scaffordable == undefined)
            options.scaffordable = false

        if (options.ignore == undefined)
            options.ignore = false
        if (options.continue == undefined)
            options.continue = true
    } else {
        options = {
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
    }
    if (options.allowGoal <= options.rejectGoal) {
        bot.log("[move] invalid options")
        return Infinity
    }
    finalPath.options = options;
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
            var cost = convertNode(finalPath, node);
            optimize(finalPath, options);
            return cost;
        } else if (count++ > options.searchLimit) { // limit over
            var nearDistances = [];
            for (var i = 0; i < closed.length; i++) {
                nearDistances.push(getL1(closed[i], goal));
            }
            var nearest = getMinInd(nearDistances);
            bot.log("[move] nearest: " + closed[nearest]);
            options.allowGoal = 0
            options.rejectGoal = -1
            return bestFirstSearch(finalPath, start, closed[nearest], options);
        }
        expanded = expandNode(node, options);
        for (var i = 0; i < expanded.length; i++) { // expand
            var pos = expanded[i];
            if (!contains(closed, pos)) {
                closed.push(pos);
                var newNode = new NodeElement(pos, getL1(pos, goal) + moveCost(pos[3]), node);
                open.enqueue(newNode);
            }
        }
    }
    bot.log("[move] impossible to go there");
    return Infinity;
}

function expandNode(node, options) {
    var ret = [];
    var prepos = node.p
    var pos;
    for (var i = 0; i < walks.length; i++) {
        pos = plus(prepos, walks[i]);
        if (isStandable(pos)) {
            pos.push("walk");
            ret.push(pos);
        }
    }
    for (var i = 0; i < crosses.length; i += 3) {
        pos = plus(prepos, crosses[i]);
        if (isStandable(pos) &&
            isThroughable(plus(prepos, crosses[i + 1])) && isThroughable(plus(prepos, crosses[i + 2]))
        ) {
            pos.push("walk");
            ret.push(pos);
        }
    }

    if (isThroughable(plus(prepos, [0, 1, 0]))) {
        for (var i = 0; i < upstairs.length; i++) {
            pos = plus(prepos, upstairs[i]);
            if (isStandable(pos)) {
                pos.push("upstair");
                ret.push(pos);
            }
        }
    }

    for (var i = 0; i < downstairs.length; i++) {
        pos = plus(prepos, downstairs[i]);
        if (isStandable(pos) && isThroughable(plus(pos, [0, 1, 0]))) {
            pos.push("downstair");
            ret.push(pos);
        }
    }

    if (isThroughable(plus(prepos, [0, 1, 0]))) {
        for (var i = 0; i < jumpovers.length; i += 2) {
            pos = plus(prepos, jumpovers[i]);
            var midpos = plus(prepos, jumpovers[i + 1]);
            if (isStandable(pos) && isThroughable(midpos) && isThroughable(plus(midpos, [0, 2, 0]))
                && isThroughable(plus(pos, [0, 1, 0]))) {
                pos.push("jumpover");
                ret.push(pos);
            }
        }
    }

    if (isThroughable(plus(prepos, [0, 1, 0]))) {
        for (var i = 0; i < longjumpovers.length; i += 3) {
            pos = plus(prepos, longjumpovers[i]);
            var midpos1 = plus(prepos, longjumpovers[i + 1]);
            var midpos2 = plus(prepos, longjumpovers[i + 2]);
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
        for (var i = 0; i < lands.length; i++) {
            pos = plus(prepos, lands[i]);
            if (isStandable(pos) && isThroughable(plus(pos, [0, 2, 0])) && isThroughable(plus(pos, [0, 4, 0]))) {
                pos.push("land");
                ret.push(pos);
            }
        }

    if (options.bridgeable)
        for (var i = 0; i < bridges.length; i++) {
            pos = plus(prepos, bridges[i]);
            if (isThroughable(pos) && bot.blockAt(posToVec(plus(pos, [0, -1, 0]))).type == 0) {
                pos.push("bridge");
                ret.push(pos);
            }
        }

    if (options.buildstairable)
        for (var i = 0; i < buildstairs.length; i++) {
            pos = plus(prepos, buildstairs[i]);
            if (isThroughable(pos) && bot.blockAt(posToVec(plus(pos, [0, -1, 0]))).type == 0 && isStandable(plus(pos, [0, -1, 0]))) {
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

function optimize(path, options) {
    if (path.length == 0) return;
    var start = floor(getMyPos());
    if (bot.blockAt(posToVec(start)).boundingBox == "door") {
        path.splice(0, 0, [start[0], start[1], start[2], "strict"]);
        path.splice(1, 0, [start[0], start[1], start[2], "door"]);
    }
    var s = 0;
    if (bot.blockAt(posToVec(path[0])).boundingBox == "door") {
        var pathDoor = path[0];
        path.splice(0, 0, [start[0], start[1], start[2], "strict"]);
        path.splice(1, 0, [pathDoor[0], pathDoor[1], pathDoor[2], "door"]);
        s += 2;
    }
    for (var i = s; i < path.length; i++) {
        if (bot.blockAt(posToVec(path[i])).boundingBox == "door") {
            var pathDoor = path[i];
            var doorFront = path[i - 1];
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
    for (var i = 0; i < path.length; i++) {
        if (path[i][3] == "walk") {
            if (cnt == 0) {
                startInd = i;
                cnt++;
                continue;
            }
            if (cnt == 1) {
                dir = getdir(path[i - 1], path[i]);
                preDir = dir;
                cnt++;
            }
            if (cnt >= 2) {
                dir = getdir(path[i - 1], path[i]);
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
    for (var i = 0; i < path.length; i++) {
        if (path[i][3] == "bridge") {
            var pathBridge = path[i];
            path.splice(i + 1, 0, [pathBridge[0], pathBridge[1], pathBridge[2], "walk"]);
        }
        if (path[i][3] == "buildstair") {
            var pathStair = path[i];
            path.splice(i + 1, 0, [pathStair[0], pathStair[1], pathStair[2], "upstair"]);
        }
        if (path[i][3] == "scafford") {
            var pathStair = path[i];
            path.splice(i + 1, 0, [pathStair[0], pathStair[1], pathStair[2], "wait", 10]);
        }
    }
    if (options.strictfin) {
        const fin = path[path.length - 1];
        path.push([fin[0], fin[1], fin[2], "strict"])
    }
}

function isNotAvoidance(block) {
    if (block.name.match(/wall/)
        || block.name.match(/fence/)
        // || block.name.match(/web/)
        //|| block.name.match(/carpet/) // -> empty
        || block.name.match(/wall/)
        //minecraft-date snow -> empty
        || block.name.match(/lava/)
        || block.name.match(/water/)
        || block.name.match(/magma/)
    ) {
        return false;
    }
    return true;
}


function isStandable(pos) {
    var B1 = bot.blockAt(new Vec3(pos[0], pos[1] - 1, pos[2]))
    var B2 = bot.blockAt(new Vec3(pos[0], pos[1], pos[2]))
    var B3 = bot.blockAt(new Vec3(pos[0], pos[1] + 1, pos[2]))
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
    var B1 = bot.blockAt(new Vec3(pos[0], pos[1], pos[2]))
    var B2 = bot.blockAt(new Vec3(pos[0], pos[1] + 1, pos[2]))
    if (B1.boundingBox != 'block' &&
        B2.boundingBox != 'block' &&
        isNotAvoidance(B2)
    ) {
        return true;
    } else {
        return false;
    }
}

function setStandable(pos, limit = 15) {
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
    if (getL1(pos, goal) <= allowGoal && getXZL1(pos, goal) > rejectGoal) return true;
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

function getdir(pos1, pos2) {
    return (pos1[0] - pos2[0]) * 10 + (pos1[2] - pos2[2]);
}

function getDiff(pos1, pos2) {
    return (pos1[0] - pos2[0]) * 100 + (pos1[1] - pos2[1]) * 10 + (pos1[2] - pos2[2]);
}

function getPosFromVec3(abvec) {
    return [
        Number(abvec.x),
        Number(abvec.y),
        Number(abvec.z)
    ];
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
    return getPosFromVec3(bot.entity.position);
}

function lookToVec(arr) {
    return new Vec3(arr[0], arr[1] + eyeHeight, arr[2]);
}

function posToVec(arr) {
    return new Vec3(arr[0], arr[1], arr[2]);
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
