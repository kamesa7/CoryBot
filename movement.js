
glob.isMoving = false;
glob.isFollowing = false;
glob.isWaiting = false;
glob.isLightingMode = false;
glob.isRandomWalk = false;
glob.isPlacingLight = false;
glob.isChasing = false;

const onGround = 0.001;
const eyeHeight = 1.42;


glob.stepTime = 60;
glob.searchLimit = 5000;
glob.stepError = 20;
glob.onPos = 0.2;

glob.allowGoal = 1;
glob.allowFollow = 4;

glob.followInterval = 25;
glob.targetEntity = null;
glob.followWait = 50;

glob.randomDistance = 16;
glob.randomHeight = 4;
glob.randomWait = 50;
glob.randomCostLimit = 100;


glob.logMove = false;
glob.logInterest = true;

var finalDestination;

glob.goToPos = goToPos;
glob.stopMoving = stopMoving;
glob.random = random;
glob.follow = follow;
glob.chase = chase;

setInterval(interest_signal, 1000);

/*
    forward: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    sprint: boolean;
    sneak: boolean;
    swing: boolean
*/

/*
moves:
    upstair
    downstair
    walk
    jumpover
    runover
    land
*/


function stopMoving() {
    glob.isMoving = false;
    glob.isFollowing = false;
    glob.isWaiting = false;
    glob.isRandomWalk = false;
    glob.isChasing = false;
    glob.targetEntity = null;
    bot.clearControlStates();
    //bot.log("[move] stop ");
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

function goToPos(point) {
    if (glob.isMoving) {
        stopMoving();
        bot.log("[move] aborted");
        return;
    }
    var goal;
    if (Array.isArray(point)) {
        goal = point;
    } else {
        goal = getPosFromVec3(point);
    }
    var start = getMyPos()
    floor(goal);
    floor(start);
    setStandable(start);
    setStandable(goal);

    bot.log("[move] try to goto " + goal + " from " + start);

    var path = [];
    var cost = bestFirstSearch(path, start, goal);
    bot.log("[move] cost: " + cost);
    if (cost < Infinity) {
        followPath(path);
    } else {
        bot.log("[move] cannot find path");
    }
}

function follow(entity) {
    if (glob.isMoving) {
        stopMoving();
        bot.log("[move] aborted");
        return;
    }
    if (entity == undefined || !entity.isValid) {
        bot.log("[move] cannot find entity");
        stopMoving();
        return;
    }
    bot.log("[move] follow entity " + entity.position.floored());
    var path = [];
    glob.targetEntity = entity;
    reviceTarget(path);
}

function reviceTarget(path) {
    var entity = glob.targetEntity;
    var start = getMyPos();
    var goal = getPosFromVec3(entity.position);
    floor(start);
    floor(goal);
    setStandable(start);
    setStandable(goal);

    path.splice(0, path.length);
    if (glob.logMove) {
        bot.log("[move] follow revice " + goal);
    }
    var cost = bestFirstSearch(path, start, goal, glob.allowFollow);

    if (entity.position.distanceTo(bot.entity.position) < glob.allowFollow) {
        path.push([start[0], start[1], start[2], "wait", Math.floor(Math.random() * glob.followWait)]);
    }

    if (glob.followInterval < path.length) {
        path[glob.followInterval][3] = "follow";
    } else {
        path.push([start[0], start[1], start[2], "follow"]);
    }
    if (!glob.isFollowing) {
        glob.isFollowing = true;
        followPath(path);
    }
}

function random() {
    if (glob.isMoving) {
        stopMoving();
        bot.log("[move] aborted");
        return;
    }
    bot.log("[move] random walk ");
    var path = [];
    reRandom(path);
}

function reRandom(path) {
    var start = getMyPos();
    setStandable(start);
    var goal = getRandomPos(start, glob.randomDistance, glob.randomHeight);
    floor(start);
    floor(goal);

    path.splice(0, path.length);
    if (glob.logMove) {
        bot.log("[move] random revice " + goal);
    }
    var cost = bestFirstSearch(path, start, goal);
    if (glob.randomCostLimit < cost) {
        reRandom(path);
        return;
    }
    if (glob.randomInterval < path.length) {
        path[glob.randomInterval - 1][3] = "wait";
        path[glob.randomInterval - 1][4] = Math.floor(Math.random() * glob.randomWait * 2);
        path[glob.randomInterval][3] = "random";
    } else {
        path.push([goal[0], goal[1], goal[2], "wait", Math.floor(Math.random() * glob.randomWait)]);
        path.push([goal[0], goal[1], goal[2], "random"]);
    }
    if (!glob.isRandomWalk) {
        glob.isRandomWalk = true;
        followPath(path);
    }
}


function chase(entity) {
    if (glob.isMoving || glob.isChasing) {
        stopMoving();
        bot.log("[move] aborted");
        return;
    }
    if (entity == undefined || !entity.isValid) {
        bot.log("[move] cannot find entity");
        return;
    }
    bot.log("[move] chase entity " + entity.position.floored());
    bot.setControlState("sprint", true);
    glob.targetEntity = entity;
    glob.isChasing = true;
    glob.isMoving = true;
    var chaser = setInterval(reChase, glob.stepTime);
    function reChase() {
        if (!glob.isChasing || !glob.isMoving) {
            clearInterval(chaser);
            stopMoving()
            return
        }
        if (entity == undefined || !entity.isValid) {
            bot.log("[move] cannot find entity");
            return;
        }
        bot.lookAt(entity.position.offset(0, eyeHeight, 0), true);
        if (entity.position.distanceTo(bot.entity.position) < glob.allowGoal) {
            bot.setControlState("forward", false);
            return;
        }
        bot.setControlState("forward", true);
        var direct = entity.position.minus(bot.entity.position);
        direct.scaled(1 / entity.position.distanceTo(bot.entity.position))
        if (bot.blockAt(bot.entity.position.offset(direct.x, 0, direct.z)).boundingBox == "block") {
            bot.setControlState("jump", true)
            bot.setControlState("jump", false)
        }
    }
}


var walks = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1]
];
var crosses = [
    [1, 0, 1], [0, 0, 1], [1, 0, 0],
    [-1, 0, 1], [0, 0, 1], [-1, 0, 0],
    [1, 0, -1], [0, 0, -1], [1, 0, 0],
    [-1, 0, -1], [0, 0, -1], [-1, 0, 0]
];
var upstairs = [
    [1, 1, 0],
    [-1, 1, 0],
    [0, 1, 1],
    [0, 1, -1]
];
var downstairs = [
    [1, -1, 0],
    [-1, -1, 0],
    [0, -1, 1],
    [0, -1, -1]
];
var jumpovers = [
    [2, 0, 0], [1, -1, 0],
    [-2, 0, 0], [-1, -1, 0],
    [0, 0, 2], [0, -1, 1],
    [0, 0, -2], [0, -1, -1]
];
var lands = [
    [1, -2, 0],
    [-1, -2, 0],
    [0, -2, 1],
    [0, -2, -1],
    [1, -3, 0],
    [-1, -3, 0],
    [0, -3, 1],
    [0, -3, -1]
];


function moveCost(move) {
    switch (move) {
        case "walk": return 1;
        case "upstair": return 5;
        case "downstair": return 5;
        case "jumpover": return 5;
        case "land": return 3;
    }
}

function bestFirstSearch(finalPath, start, goal, allow = glob.allowGoal) {
    var closed = [];
    var open = new bucketsJs.PriorityQueue(compare);
    var node;
    var expanded;
    var count = 0;
    closed.push(start);
    open.enqueue(new NodeElement(start, getL1(start, goal), node));
    while (!open.isEmpty()) {
        node = open.dequeue();
        if (isGoal(node.p, goal, allow)) {
            var cost = convertNode(finalPath, node);
            optimize(finalPath);
            return cost;
        } else if (count++ > glob.searchLimit) {
            bot.log("[move] limit exceeded");
            var nearDistances = [];
            for (var i = 0; i < closed.length; i++) {
                nearDistances.push(getL1(closed[i], goal));
            }
            var nearest = getMinInd(nearDistances);
            bot.log("[move] nearest: " + closed[nearest]);
            return bestFirstSearch(finalPath, start, closed[nearest]);
            //return Infinity;
        }
        expanded = expandNode(node);
        for (var i = 0; i < expanded.length; i++) {
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

function expandNode(node) {
    var ret = [];
    var pos;
    for (var i = 0; i < walks.length; i++) {
        pos = plus(node.p, walks[i]);
        if (isStandable(pos)) {
            pos.push("walk");
            ret.push(pos);
        }
    }
    for (var i = 0; i < crosses.length; i += 3) {
        pos = plus(node.p, crosses[i]);
        if (isStandable(pos) &&
            isThroughable(plus(node.p, crosses[i + 1])) && isThroughable(plus(node.p, crosses[i + 2]))
        ) {
            pos.push("walk");
            ret.push(pos);
        }
    }

    if (isThroughable(plus(node.p, [0, 1, 0]))) {
        for (var i = 0; i < upstairs.length; i++) {
            pos = plus(node.p, upstairs[i]);
            if (isStandable(pos)) {
                pos.push("upstair");
                ret.push(pos);
            }
        }
    }

    for (var i = 0; i < downstairs.length; i++) {
        pos = plus(node.p, downstairs[i]);
        if (isStandable(pos) && isThroughable(plus(pos, [0, 1, 0]))) {
            pos.push("downstair");
            ret.push(pos);
        }
    }

    if (isThroughable(plus(node.p, [0, 1, 0]))) {
        for (var i = 0; i < jumpovers.length; i += 2) {
            pos = plus(node.p, jumpovers[i]);
            var midpos = plus(node.p, jumpovers[i + 1]);
            if (isStandable(pos) && isThroughable(midpos) && isThroughable(plus(midpos, [0, 2, 0]))
                && isThroughable(plus(pos, [0, 1, 0]))) {
                pos.push("jumpover");
                ret.push(pos);
            }
        }
    }

    for (var i = 0; i < lands.length; i++) {
        pos = plus(node.p, lands[i]);
        if (isStandable(pos) && isThroughable(plus(pos, [0, 2, 0]))) {
            pos.push("land");
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
    // console.log(path);
}

function optimize(path) {
    var start = floor(getMyPos());
    path.splice(0, 0, [start[0], start[1], start[2], "strict"]);
    for (var i = 0; i < path.length; i++) {
        if (bot.blockAt(posToVec(path[i])).boundingBox == "door") {
            var doorFront = path[i - 1];
            if (doorFront) {
                path.splice(i - 1, 0, [doorFront[0], doorFront[1], doorFront[2], "strict"]);
                i++;
            }
            var pathDoor = path[i];
            path.splice(i, 0, [pathDoor[0], pathDoor[1], pathDoor[2], "door"]);
            i++;
            for (var k = 0; k < walks.length; k++) {
                var nextDoor = plus(pathDoor, walks[k]);
                if (bot.blockAt(posToVec(nextDoor)).boundingBox == "door") {
                    path.splice(i, 0, [nextDoor[0], nextDoor[1], nextDoor[2], "door"]);
                    i++
                }
            }
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
}


function followPath(path) {
    if (glob.isMoving) {
        stopMoving();
        bot.log("[move] aborted");
        return;
    }
    glob.isMoving = true;
    var index = 0;
    var err = false;
    var preDistance = Infinity;
    var prePos = getMyPos();
    var preIndex = 0;
    var indexCount = 0;
    var waitCount = 0;
    var stopCount = 0;
    glob.isPlacingLight = false;
    var mover = setInterval(function () {
        if (glob.isMoving && index < path.length) {

            if (glob.isLightingMode && !glob.isPlacingLight) {
                lightingMode();
            }

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

            if (err || ((path[index][3] != "revice" && path[index][3] != "wait") && stopCount > glob.stepError)) {
                bot.clearControlStates();
                bot.log("[move] path error end : " + path[index] + " stops: " + stopCount);
                if (glob.isFollowing) {
                    if (glob.targetEntity != null && glob.targetEntity.isValid) {
                        path[0][3] = "revice";
                        reviceTarget(path);
                    } else {
                        glob.isFollowing = false;
                    }
                } else if (glob.isRandomWalk) {
                    path[0][3] = "revice";
                    reRandom(path);
                } else {
                    clearInterval(mover);
                    stopMoving();
                    goToPos(finalDestination);
                }
                index = 0;
                indexCount = 0;
                stopCount = 0;
                err = false;
            } else {
                var target = mid([path[index][0], path[index][1], path[index][2], path[index][3]]);
                var distance = getXZL2(getMyPos(), target);
                var height = getMyPos()[1];
                if (glob.logMove) bot.log("[move] " + path[index] + "  cnt: " + indexCount);
                switch (path[index][3]) {
                    case "walk":
                        if (indexCount == 0) {
                            bot.lookAt(lookToVec(target), true);
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        indexCount++;
                        if (indexCount > glob.stepError) {
                            err = true;
                            break;
                        } else if (distance > 2) {
                            err = true;
                            break;
                        } else if (preDistance <= distance || distance <= glob.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "sprint":
                        bot.lookAt(lookToVec(target), true);
                        if (indexCount == 0) {
                            bot.setControlState('forward', true);
                            bot.setControlState('sprint', true);
                            preDistance = Infinity;
                        }
                        indexCount++;
                        if (preDistance <= distance || distance <= glob.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "upstair":
                        bot.lookAt(lookToVec(target), true);
                        if (indexCount == 0) {
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        indexCount++;
                        if ((height - onGround) % 1 != 0) break;
                        if (target[1] != height - onGround && indexCount > 1) {
                            err = true;
                            break;
                        } else if (preDistance <= distance - glob.onPos || distance <= glob.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "land":
                    case "downstair":
                        bot.lookAt(lookToVec(target), true);
                        if (indexCount == 0) {
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        indexCount++;
                        if ((height - onGround) % 1 != 0) break;
                        if (target[1] != height - onGround) {
                            //まだ降りてない
                        } else if (preDistance <= distance || distance <= glob.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "jumpover":
                        bot.lookAt(lookToVec(target), true);
                        if (indexCount == 0) {
                            bot.setControlState('jump', true);
                            bot.setControlState('jump', false);
                            bot.setControlState('forward', true);
                            preDistance = Infinity;
                        }
                        indexCount++;
                        if ((height - onGround) % 1 != 0) break;
                        if (target[1] != height - onGround) {
                            err = true;
                            break;
                        }
                        if (preDistance <= distance - glob.onPos || distance <= glob.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "door":
                        bot.clearControlStates();
                        bot.lookAt(lookToVec(target), true);
                        bot.setControlState('forward', true);
                        var targetVec = posToVec(target);
                        var door = bot.blockAt(targetVec);
                        if (door.metadata < 4 || 7 < door.metadata) {
                            bot.lookAt(targetVec, true, function () {
                                bot.activateBlock(door);
                            });
                        }
                        index++;
                        break;
                    case "strict":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            bot.lookAt(lookToVec(target), true, function () {
                                bot.setControlState('sneak', true);
                                bot.setControlState('forward', true);
                            });
                        }
                        bot.lookAt(lookToVec(target), true);
                        indexCount++;
                        if (indexCount > glob.stepError) {
                            err = true;
                            break;
                        } else if (distance <= glob.onPos) {
                            bot.clearControlStates();
                            index++;
                            break;
                        }
                        break;
                    case "follow":
                        bot.clearControlStates();
                        if (glob.targetEntity != undefined && glob.targetEntity.isValid) {
                            bot.lookAt(glob.targetEntity.position.offset(0, eyeHeight, 0), false);
                            path[0][3] = "revice";
                            reviceTarget(path);
                            index = 0;
                            indexCount = 0;
                            stopCount = 0;
                        } else {
                            glob.isFollowing = false;
                            stopMoving()
                        }
                        break;
                    case "random":
                        bot.clearControlStates();
                        path[0][3] = "revice";
                        reRandom(path);
                        index = 0;
                        indexCount = 0;
                        stopCount = 0;
                        break;
                    case "revice":
                        index = 0;
                        indexCount = 0;
                        stopCount = 0;
                        break;
                    case "wait":
                        if (indexCount == 0) {
                            bot.clearControlStates();
                            glob.isWaiting = true;
                            waitCount = path[index][4];
                        } else if (indexCount >= waitCount) {
                            index++;
                            glob.isWaiting = false;
                            break;
                        }
                        indexCount++;
                        stopCount = 0;
                        break;
                    default:
                        bot.log("[move] unknown state");
                        stopMoving();
                }
            }
        } else {
            clearInterval(mover);
            stopMoving();
            bot.log("[move] path end")
        }
    }, glob.stepTime);
}

function lightingMode() {
    glob.isPlacingLight = true;
    var brightPos = getRandomPos(getMyPos(), 3);
    if (isNeedLight(brightPos)) {
        var torch = glob.findItem(50);
        if (torch != null) {
            floor(brightPos);
            bot.log("[brighten] " + brightPos + ": " + bot.blockAt(posToVec(brightPos)).light);

            bot.equip(torch, "hand", function () {
                bot.placeBlock(bot.blockAt(posToVec(add(brightPos, [0, -1, 0]))), new Vec3(0, 1, 0));
            });
            setTimeout(function () {
                glob.isPlacingLight = false;
            }, glob.stepTime * 50);
        } else {
            glob.isLightingMode = false;
            bot.log("[brighten] no torch end");
        }
    } else {
        glob.isPlacingLight = false;
    }
}


function isNeedLight(pos) {
    if (isStandable(pos) && !mcData.blocks[bot.blockAt(posToVec(pos).add(new Vec3(0, -1, 0))).type].transparent) {
        var block = bot.blockAt(posToVec(pos));
        var next;
        if (block.name != "air") return false;
        if (block.light <= 1) return true;
        if (block.light == 2) {
            for (var i = 0; i < walks.length; i++) {
                next = bot.blockAt(posToVec(plus(pos, walks[i])));
                if (next.name != "air") continue;
                if (next.light <= 1) {
                    add(pos, walks[i]);
                    return true;
                }
            }
        }
        if (block.light <= 7) {
            for (var i = 0; i < walks.length; i++) {
                next = bot.blockAt(posToVec(plus(pos, walks[i])));
                if (next.name != "air") continue;
                if (next.light < block.light) return false;
            }
            return true;
        }
    }
    return false;
}

function isNotAvoidance(block) {
    if (block.name.match(/wall/)
        || block.name.match(/fence/)
        || block.name.match(/web/)
        //|| block.name.match(/carpet/) // -> empty
        //|| block.name.match(/slab/)
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
    if (!isStandable(pos)) {
        var direct = 1;
        var tmp = plus(pos, [0, 0, 0]);
        while (!isStandable(tmp)) {
            direct *= -1;
            if (direct > 0) direct++;
            if (direct >= limit) return false;

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
        pl = [Math.random() * distance * Math.sin(rad), 0, Math.random() * distance * Math.cos(rad)];
        ret = plus(root, pl);
        if (setStandable(ret, height)) return ret;
    }
    return root;
}

function isGoal(pos, goal, allow) {
    if (getL1(pos, goal) <= allow) return true;
    else return false;
}

function getL1(pos, target) {
    return Math.abs(target[0] - pos[0]) + Math.abs(target[1] - pos[1]) + Math.abs(target[2] - pos[2]);
}

function getL2(pos, target) {
    return Math.sqrt(Math.pow(target[0] - pos[0], 2) + Math.pow(target[1] - pos[1], 2) + Math.pow(target[2] - pos[2], 2));
}

function getXZL2(pos, target) {
    return Math.sqrt((target[0] - pos[0]) * (target[0] - pos[0]) + (target[2] - pos[2]) * (target[2] - pos[2]));
}

function plus(pos, vel) {
    return [
        pos[0] + vel[0],
        pos[1] + vel[1],
        pos[2] + vel[2]
    ];
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

function mid(pos) {
    pos[0] = Math.floor(pos[0]) + 0.5;
    //pos[1] = Math.floor(pos[1]) + 0.5;
    pos[2] = Math.floor(pos[2]) + 0.5;
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
            // this.child = [];
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


function createSimplePath(finalPath, start, goal) {
    var L1results = [];
    var pos = start;
    var tmp;
    var sum = 0;
    for (var count = 0; count < glob.searchLimit; count++) {
        L1results = [];
        for (var i = 0; i < walks.length; i++) {
            tmp = plus(pos, walks[i]);
            if (isStandable(tmp)) {
                L1results.push(getL1(tmp, goal));
            } else {
                L1results.push(Infinity);
            }
        }

        i = getMinInd(L1results);
        add(pos, walks[i]);
        sum++;
        finalPath.push("walk");
        finalPath.push([pos[0], pos[1], pos[2]]);

        if (L1results[i] < 1) break;
    }
    if (count >= glob.searchLimit) {
        return Infinity;
    }
    return sum;
}
/////////////////////////////////////////////////////////////////////////////////////////////

// 追いかけないが注目する対象 interest
var interest_entity = undefined;

function setInterestEntity(entity = undefined) {
    if (!glob.isWaiting) {
        if (glob.isPlayingMusic || glob.isTuning || glob.isMoving || glob.isShootingArrow) {
            interest_entity = undefined;
            return;
        }
    }
    if (interest_entity !== entity) {
        interest_entity = entity;
        if (interest_entity) {
            var name = interest_entity.name !== undefined ? interest_entity.name : interest_entity.username;
            var type = interest_entity.type;
            var kind = interest_entity.kind;
            if (glob.logInterest)
                bot.log('[bot.setInterestEntity] ' + bot.username + ' is interested in ' + name + ' (' + type + (kind !== undefined ? ':' + kind : '') + ')');
        }
    }
}

bot.on('entityMoved', (entity) => {
    var distance = bot.entity.position.distanceTo(entity.position);

    // 至近距離にプレイヤーがいる場合少し動く
    if (entity.type === 'player' && distance < 0.8 && !glob.isMoving) {
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
        bot.lookAt(interest_entity.position.offset(0, eyeHeight, 0));
    } else {
        setInterestEntity();
    }
}