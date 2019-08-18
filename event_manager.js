flag.logBlockUpdate = false;
flag.logEffect = false;

const defaultPhysics = {
    maxGroundSpeed: 4.27, // according to the internet
    terminalVelocity: 20.0, // guess
    walkingAcceleration: 100.0, // seems good
    gravity: 27.0, // seems good
    groundFriction: 0.9, // seems good
    playerApothem: 0.32, // notch's client F3 says 0.30, but that caused spankings
    playerHeight: 1.74, // tested with a binary search
    jumpSpeed: 9.0, // seems good
    yawSpeed: 3.0, // seems good
    sprintSpeed: 1.3 // correct
}

bot.on("entityEffect", function (entity, effect) {
    if (entity == bot.entity) {
        if (flag.logEffect) bot.log("[myEffect] " + effect.id + " : " + effect.amplifier + " : " + effect.duration);
        switch (effect.id) {
            case 1:
                bot.physics.maxGroundSpeed = defaultPhysics.maxGroundSpeed * ((effect.amplifier + 1) * 0.2 + 1);
                bot.physics.terminalVelocity = defaultPhysics.terminalVelocity * ((effect.amplifier + 1) * 0.2 + 1);
                // bot.physics.walkingAcceleration = defaultPhysics.walkingAcceleration * ((effect.amplifier + 1) * 0.2 + 1);
                break;
        }
    }
});

bot.on("entityEffectEnd", function (entity, effect) {
    if (entity == bot.entity) {
        if (flag.logEffect) bot.log("[myEffectEnd] " + effect.id + " : " + effect.amplifier + " : " + effect.duration);
        switch (effect.id) {
            case 1:
                bot.physics.maxGroundSpeed = defaultPhysics.maxGroundSpeed;
                bot.physics.terminalVelocity = defaultPhysics.terminalVelocity;
                // bot.physics.walkingAcceleration = defaultPhysics.walkingAcceleration;
                break;
        }
    }
});

bot.on("blockUpdate", function (oldBlock, newBlock) {
    if (flag.logBlockUpdate) bot.log("[new block] " + newBlock.name);
    if (newBlock.light < mcData.blocks[newBlock.type].emitLight) {
        if (flag.logBlockUpdate) bot.log("[light] new " + newBlock.name);
        newLightCnt = 0;
        expand(newBlock.position.clone(), mcData.blocks[newBlock.type].emitLight, newBlock.position.clone());
        if (flag.logBlockUpdate) bot.log("[light] updated: " + newLightCnt);
    }
});

var round = [
    new Vec3(1, 0, 0),
    new Vec3(0, 1, 0),
    new Vec3(0, 0, 1),
    new Vec3(-1, 0, 0),
    new Vec3(0, -1, 0),
    new Vec3(0, 0, -1)
];

var newLightCnt;
function expand(root, rootLight, pos) {

    var posDist = getL1(pos, root);
    var block = bot.blockAt(pos);
    if (!block) return;
    if (!mcData.blocks[block.type].transparent) return;
    if (block.light >= rootLight - posDist) return;

    applyLight(pos, rootLight - posDist);
    for (var i = 0; i < round.length; i++) {
        var next = pos.plus(round[i])
        var nextDist = getL1(next, root);
        if (nextDist > posDist && nextDist <= rootLight) {
            expand(root, rootLight, next);
        }
    }
}

function applyLight(pos, light) {
    var chunkPos = chunkCorner(pos);
    //var key = columnKeyXZ(chunkCorner.x, chunkCorner.z)
    var column = bot._chunkColumn(chunkPos.x, chunkPos.z);

    if (!column) {
        bot.log("[light] err no chunk")
    } else {
        //bot.log("[light] update " + pos + "  " + light)
        column.setBlockLight(posInChunk(pos), light)
        newLightCnt++;
    }
}

function getL1(pos, target) {
    return Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) + Math.abs(target.z - pos.z);
}

function posInChunk(pos) {
    return pos.floored().modulus(new Vec3(16, 256, 16))
}

const CHUNK_SIZE = new Vec3(16, 16, 16)

function chunkCorner(pos) {
    var floored = pos.floored();
    var blockPoint = floored.modulus(CHUNK_SIZE);
    return floored.minus(blockPoint);
}
