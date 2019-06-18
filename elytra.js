glob.elytraFlyTo = elytraFlyTo
glob.jumpUpOpenElytra = jumpUpOpenElytra
glob.openElytra = openElytra

const jumpUpOpenElytraTime = 400
const defaultMaxSpeed = 4.27 // according to the internet
const maxSpeed = 75
const fireworkSpeed = 50
const touchDownSpeed = 10
glob.reBoostTime = 3000
glob.elytraUpVec = new Vec3(0, -27 / 19, 0);
glob.allowElytra = 40


var fireBooster
var finalDestination = null;
var preVelocity = null;
var elytra = null;
var elytraFirework = null

function elytraFlyTo(pos, altitude) {
    finalDestination = pos.clone();
    if (altitude)
        finalDestination.y = altitude;
    jumpUpOpenElytra();
}

function jumpUpOpenElytra() {
    elytra = bot.inventory.slots[6];
    if (!elytra || elytra.type != 443) return;
    bot.entity.velocity.add(new Vec3(0, 13, 0))
    setTimeout(function () {
        openElytra();
    }, jumpUpOpenElytraTime)
}

function openElytra() {
    bot._client.write("entity_action", {
        entityId: bot.entity.id,
        actionId: 8,
        jumpBoost: 0
    })
}

bot.on("move", function () {
    elytra = bot.inventory.slots[6];
    if (!elytra || elytra.type != 443) return;
    if (bot.entity.metadata[0] && bot.entity.metadata[0] == -128) {
        if (glob.getState() != "elytra") {
            glob.changeState("elytra");
            bot.log("[elytra] FallFlying Start  " + (432 - elytra.metadata))
            fireBoost();
            fireBooster = setInterval(fireBoost, glob.reBoostTime)
            preVelocity = bot.entity.velocity.clone()
        }
        bot.physics.maxGroundSpeed = maxSpeed

        if (elytraFirework) {
            bot.entity.velocity = getLookVec(bot.entity).scaled(fireworkSpeed)
        } else {
            var look = getLookVec(bot.entity)
            var prev = preVelocity;
            var speed = prev.distanceTo(new Vec3(0, 0, 0))
            var XZspeed = Math.sqrt(prev.x * prev.x + prev.z * prev.z)
            var cos = (look.x * prev.x + look.y * prev.y + look.z * prev.z) / speed
            if (cos <= 0) cos = 0
            var gravity = glob.elytraUpVec.scaled(1 / Math.max(speed, 1))
            gravity.add(gravity.scaled((XZspeed + touchDownSpeed) / fireworkSpeed).abs())
            bot.entity.velocity = prev.scaled(cos).plus(look).plus(gravity)
            // console.log(gravity)
            // console.log(bot.entity.velocity)
            // console.log(speed + "  " + rad)
        }

        if (finalDestination) {
            bot.lookAt(finalDestination)
            if (XZdistance(bot.entity.position, finalDestination) < glob.allowElytra) {
                bot.look(bot.entity.yaw, -Math.PI / 16)
            } else if (elytraFirework) {
                if (finalDestination.y > bot.entity.position.y + glob.allowElytra) {
                    bot.look(bot.entity.yaw, Math.PI / 3)
                } else if (finalDestination.y > bot.entity.position.y) {
                    bot.look(bot.entity.yaw, Math.PI / 6)
                }
            } else {
                bot.look(bot.entity.yaw, -Math.PI / 32)
            }
        }

        preVelocity = bot.entity.velocity.clone()
    } else if (glob.getState() == "elytra") {
        glob.finishState("elytra")
        finalDestination = null;
        preVelocity = null;
        bot.physics.maxGroundSpeed = defaultMaxSpeed
        bot.log("[elytra] FallFlying End  " + (432 - elytra.metadata))
    }
})

function fireBoost() {
    if (elytraFirework) return
    if (finalDestination) {
        if (XZdistance(bot.entity.position, finalDestination) < glob.allowElytra)
            return
        if (bot.entity.position.y > finalDestination.y - glob.allowElytra / 2)
            return
    }
    if (glob.getState() == "elytra" && bot.heldItem && bot.heldItem.type == 401)
        bot.activateItem();
    else if (fireBooster)
        clearInterval(fireBooster)
}

function getLookVec(entity) {
    const yaw = entity.yaw;
    const pitch = entity.pitch;
    // yaw 0: North : -z
    // -> reverse clock
    // yaw PI/2: West : -x
    // yaw PI: South
    const dxz = Math.cos(pitch)
    const x = -Math.sin(yaw) * dxz
    const z = -Math.cos(yaw) * dxz

    const y = Math.sin(pitch)

    return new Vec3(x, y, z);
}

bot.on("entityUpdate", function (entity) {
    if (entity.entityType && entity.entityType == 76) {//firework
        if (entity.metadata[7] == bot.entity.id) {
            elytraFirework = entity;
            bot.log("[elytra] Firework Boost Start  " + (432 - elytra.metadata))
        }
    }
})
bot.on("entityGone", function (entity) {
    if (entity.entityType && entity.entityType == 76) {//firework
        if (entity.metadata[7] == bot.entity.id) {
            elytraFirework = null
            bot.log("[elytra] Firework Boost End  " + (432 - elytra.metadata))
        }
    }
})

function XZdistance(pos1, pos2) {
    return Math.sqrt((pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.z - pos2.z) * (pos1.z - pos2.z))
}