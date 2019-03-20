glob.logBlockUpdate = false;

bot.on("blockUpdate", function (oldBlock, newBlock) {
    if (glob.logBlockUpdate) bot.log("[new block] " + newBlock.name);
    if (newBlock.light < mcData.blocks[newBlock.type].emitLight) {
        if (glob.logBlockUpdate) bot.log("[light] new " + newBlock.name);
        newLightCnt = 0;
        expand(newBlock.position.clone(), mcData.blocks[newBlock.type].emitLight, newBlock.position.clone());
        if (glob.logBlockUpdate) bot.log("[light] updated: " + newLightCnt);
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
    if (!mcData.blocks[bot.blockAt(pos).type].transparent) return;
    if (bot.blockAt(pos).light >= rootLight - posDist) return;

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

/*
function Location(absoluteVector) {
    this.floored = absoluteVector.floored()
    this.blockPoint = this.floored.modulus(CHUNK_SIZE)
    this.chunkCorner = this.floored.minus(this.blockPoint)

    const loc = new Location(point)
    const key = columnKeyXZ(loc.chunkCorner.x, loc.chunkCorner.z)
    const column = columns[key]
    // sometimes minecraft server sends us block updates before it sends
    // us the column that the block is in. ignore this.
    if (!column) return
    column.setBlockType(posInChunk(point), type)
    column.setBlockData(posInChunk(point), metadata)
*/