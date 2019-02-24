
bucketsJs = require('buckets-js');

botFunc.isMoving = false;
botFunc.isFollowing = false;
botFunc.followInterval = 10;
botFunc.followingPlayer = null;
botFunc.stepTime = 60;
botFunc.searchLimit = 5000;
botFunc.stepError = 100;
botFunc.allowDistance = 0.1;
botFunc.allowGoal = 3;
botFunc.destination;
botFunc.logMove = false;
const onGround = 0.001;

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
function moveCost(move) {
    switch (move) {
        case "walk": return 1;
        case "upstair": return 5;
        case "downstair": return 5;
        case "jumpover": return 5;
        case "land": return 3;
    }
}

botFunc.goto = (point) => {
    if (botFunc.isMoving) {
        botFunc.stopMoving();
        bot.log("[move] aborted");
        return;
    }
    var goal;
    if (Array.isArray(point)) {
        goal = point;
    } else {
        goal = getPosFromVec3(point);
    }
    var start = getPosFromVec3(bot.entity.position);
    floor(goal);
    floor(start);
    setStandable(start);
    setStandable(goal);

    bot.log("[move] try to goto " + goal + " from " + start);

    var path = [];
    //var cost = createSimplePath(path, start, goal);
    var cost = bestFirstSearch(path, start, goal);
    bot.log("[move] cost: " + cost);
    if (cost < Infinity) {
        followPath(path);
    } else {
        bot.log("[move] cannot find path");
    }
}

botFunc.follow = (player) => {
    if (botFunc.isMoving) {
        botFunc.stopMoving();
        bot.log("[move] aborted");
        return;
    }
    if (player.entity == undefined) {
        bot.log("[move] cannot find entity");
        return;
    }
    bot.log("[move] follow player " + player.entity.position.floored());
    var path = [];
    botFunc.followingPlayer = player;
    reviceTarget(path);
}

function reviceTarget(path) {
    var player = botFunc.followingPlayer;
    var start = getPosFromVec3(bot.entity.position);
    var goal = getPosFromVec3(player.entity.position);
    floor(start);
    floor(goal);
    setStandable(start);
    setStandable(goal);

    path.splice(0,path.length);
    if(botFunc.logMove){
        bot.log("[move] follow revice " + goal);
    }
    var cost = bestFirstSearch(path, start, goal);
    if(botFunc.followInterval < path.length) { 
        path[botFunc.followInterval][3]="follow";
    } else {
        path.push([start[0],start[1],start[2],"follow"]);
    }
    if( ! botFunc.isFollowing) {
        botFunc.isFollowing = true;
        followPath(path);
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

function bestFirstSearch(finalPath, start, goal) {
    var closed = [];
    var open = new bucketsJs.PriorityQueue(compare);
    var node;
    var expanded;
    var count = 0;
    closed.push(start);
    open.enqueue(new NodeElement(start, getL1(start, goal), node));
    while (!open.isEmpty()) {
        node = open.dequeue();
        if (isGoal(node.p, goal)) {
            return convertNode(finalPath, node);;
        } else if (count++ > botFunc.searchLimit) {
            bot.log("[move] limit exceeded");
            var nearDistances = [];
            for (var i = 0; i < closed.length; i++) {
                nearDistances.push(getL1(closed[i],goal));
            }
            var nearest = getMinInd(nearDistances);
            bot.log("[move] nearest: "+closed[nearest]);
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
    
    botFunc.destination = [tmp.p[0], tmp.p[1], tmp.p[2]];
    while (tmp.parent != null) {
        path.push([tmp.p[0], tmp.p[1], tmp.p[2], tmp.p[3]]);
        sum += moveCost(tmp.p[3]);
        tmp = tmp.parent;
    }
    path.reverse();
    return sum;
    // console.log(path);
}

botFunc.stopMoving = () => {
    botFunc.isMoving = false;
    botFunc.isFollowing = false;
    botFunc.followingPlayer= null;
    bot.clearControlStates();
    bot.log("[move] stop ");
}

function followPath(path) {
    if (botFunc.isMoving) {
        botFunc.stopMoving();
        bot.log("[move] aborted");
        return;
    }
    botFunc.isMoving = true;
    var index = 0;
    var state = "";
    var distance;
    var height;
    var preDistance = Infinity;
    var preHeight = Infinity;
    var target;
    var indexCount = 0;
    var waitCount = 0;
    var mover = setInterval(function () {
        if (botFunc.isMoving && index < path.length) {
            if (state != "") {
                indexCount++;
                if (indexCount > botFunc.stepError) {
                    bot.clearControlStates();
                    bot.log("[move] path error end : " + state);
                    if(botFunc.isFollowing && botFunc.followingPlayer != null && botFunc.followingPlayer.entity != undefined){
                        reviceTarget(path);
                        state = "revice";
                        index = -10;
                        indexCount = 0;
                    } else {
                        clearInterval(mover);
                        botFunc.stopMoving();
                        botFunc.goto(botFunc.destination);
                    }
                    return;
                }
                switch (state) {
                    case "walk":
                        bot.setControlState('forward', true);
                        distance = getL2(getMyPos(), target);
                        if (preDistance <= distance || distance <= botFunc.allowDistance) {
                            state = "";
                            // bot.clearControlStates();
                            preDistance = Infinity;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "upstair":
                        bot.setControlState('forward', true);
                        bot.lookAt(lookToVec(target), true);
                        distance = getXZL2(getMyPos(), target);
                        height = getMyPos()[1];
                        if ((height - onGround) % 1 != 0) break;
                        if (preDistance <= distance - botFunc.allowDistance
                            || distance <= botFunc.allowDistance) {
                            state = "";
                            bot.clearControlStates();
                            preDistance = Infinity;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "downstair":
                        bot.setControlState('forward', true);
                        bot.lookAt(lookToVec(target), true);
                        distance = getXZL2(getMyPos(), target);
                        height = getMyPos()[1];
                        if ((height - onGround) % 1 != 0) break;
                        if (preDistance <= distance || distance <= botFunc.allowDistance) {
                            state = "";
                            bot.clearControlStates();
                            preDistance = Infinity;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "jumpover":
                        bot.setControlState('forward', true);
                        bot.lookAt(lookToVec(target), true);
                        distance = getXZL2(getMyPos(), target);
                        height = getMyPos()[1];
                        if ((height - onGround) % 1 != 0) break;
                        if (preDistance <= distance - botFunc.allowDistance
                            || distance <= botFunc.allowDistance) {
                            state = "";
                            bot.clearControlStates();
                            preDistance = Infinity;
                            break;
                        }
                        preDistance = distance;
                        break;
                    case "revice":
                        if(path.length > 0){
                            index = 0;
                        }
                        state = "";
                        break;
                    case "wait":
                        --indexCount;
                        if(--waitCount<=0){
                            state="";
                        }
                        break;
                }
            } else {
                indexCount = 0;
                switch (path[index][3]) {
                    case "walk":
                        target = getTarget(path[index]);
                        if (botFunc.logMove) bot.log("[move] " + target);
                        bot.lookAt(lookToVec(target), true);
                        state = "walk";
                        break;
                    case "upstair":
                        target = getTarget(path[index]);
                        if (botFunc.logMove) bot.log("[move] " + target);
                        bot.lookAt(lookToVec(target), true);
                        bot.setControlState('jump', true);
                        bot.setControlState('jump', false);
                        bot.setControlState('forward', true);
                        state = "upstair";
                        break;
                    case "downstair":
                        target = getTarget(path[index]);
                        if (botFunc.logMove) bot.log("[move] " + target);
                        bot.lookAt(lookToVec(target), true);
                        state = "downstair";
                        break;
                    case "jumpover":
                        target = getTarget(path[index]);
                        if (botFunc.logMove) bot.log("[move] " + target);
                        bot.lookAt(lookToVec(target), true);
                        bot.setControlState('jump', true);
                        bot.setControlState('jump', false);
                        bot.setControlState('forward', true);
                        state = "jumpover";
                        break;
                    case "land":
                        target = getTarget(path[index]);
                        if (botFunc.logMove) bot.log("[move] " + target);
                        bot.lookAt(lookToVec(target), true);
                        state = "downstair";
                        break;
                    case "follow":
                        bot.clearControlStates();
                        if (botFunc.followingPlayer != undefined && botFunc.followingPlayer.entity != undefined) {
                            reviceTarget(path);
                            state = "revice";
                            index = -10;
                        } else {
                            botFunc.isFollowing = false;
                        }
                        break;
                    case "wait":
                        bot.clearControlStates();
                        state = "wait";
                        waitCount = path[index][4];
                        break;
                    default:
                        bot.log("[move] unknown state");
                        botFunc.stopMoving();
                }
                index++;
            }
        } else {
            clearInterval(mover);
            botFunc.stopMoving();
            state = "";
            bot.log("[move] path end")
        }
    }, botFunc.stepTime);
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
        B2.boundingBox == 'empty' &&
        B3.boundingBox == 'empty' &&
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
    if (B1.boundingBox == 'empty' &&
        B2.boundingBox == 'empty' &&
        isNotAvoidance(B1)
    ) {
        return true;
    } else {
        return false;
    }
}

function setStandable(pos){
    if(!isStandable(pos)) {
        var direct = 1;
        var tmp = plus(pos,[0,0,0]);
        while(!isStandable(tmp)){
            direct *= -1;
            if(direct>0)direct++;
            if(direct>20)return;
            
            tmp = plus(pos,[0,direct,0]);
        }
        add(pos,[0,direct,0]);
    }
}

function isGoal(pos, goal) {
    if (getL1(pos,goal) <= botFunc.allowGoal) return true;
    else return false;
}

function getL1(pos, target) {
    return Math.abs(target[0] - pos[0]) + Math.abs(target[1] - pos[1]) + Math.abs(target[2] - pos[2]);
}

function getL2(pos, target) {
    return Math.sqrt(Math.pow(target[0] - pos[0], 2) + Math.pow(target[1] - pos[1], 2) + Math.pow(target[2] - pos[2], 2));
}

function getXZL2(pos, target) {
    return Math.sqrt(Math.pow(target[0] - pos[0], 2) + Math.pow(target[2] - pos[2], 2));
}

function plus(pos, vel) {
    var ret = [
        pos[0] + vel[0],
        pos[1] + vel[1],
        pos[2] + vel[2]
    ];
    return ret;
}

function add(pos, vel) {
    pos[0] += vel[0];
    pos[1] += vel[1];
    pos[2] += vel[2];
}

function floor(pos) {
    pos[0] = Math.floor(pos[0]);
    pos[1] = Math.floor(pos[1]);
    pos[2] = Math.floor(pos[2]);
}

function mid(pos) {
    pos[0] = Math.floor(pos[0]) + 0.5;
    //pos[1] = Math.floor(pos[1]) + 0.5;
    pos[2] = Math.floor(pos[2]) + 0.5;
}

function getTarget(arr) {
    var ret = [arr[0], arr[1], arr[2], arr[3]];
    mid(ret);
    return ret;
}

function getPosFromVec3(abvec) {
    // var tmp = a
    var ret = [
        Number(abvec.x),
        Number(abvec.y),
        Number(abvec.z)
    ];
    return ret;
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
    return new Vec3(arr[0], arr[1] + 1.42, arr[2]);
}

function arrToVec(arr) {
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
    for (var count = 0; count < botFunc.searchLimit; count++) {
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
    if (count >= botFunc.searchLimit) {
        return Infinity;
    }
    return sum;
}
