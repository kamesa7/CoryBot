
glob.isBerserkerMode = false
glob.isEggBomberMode = false
glob.isCloseDefenceMode = true;
glob.isSniperMode = false;
glob.isHighAngleMode = true;
glob.isArrowDefenceMode = true;

glob.bowDamageLimit = 350;
glob.snipeDistance = 96;

glob.logCombat = false;

glob.punch = punch;
glob.shoot = shoot;
glob.throwEgg = throwEgg;
glob.throwPearl = throwPearl;
glob.throwIt = throwIt;
glob.lookAt = lookAt

const airResistance = 0;
const highAngleAdjust = 0.58;
const eyeHeight = 1.10;
const Gravity = 18.3;
const maxArrowSpeed = 55;
const drawingTime = 1100;
const maxEggSpeed = 35;

var swordInterval = 625;
var preAttackTime = new Date().getTime();
var swords = [276, 267, 272, 283, 268]; //強い順
var arrows = [262, 439, 440];

glob.hostiles = [];
glob.neutrals = [];

bot.on('entityMoved', (entity) => {
    combatCheck(entity)
});

setInterval(() => {
    Object.keys(bot.players).forEach((key) => {
        if (bot.players[key].entity)
            combatCheck(bot.players[key].entity)
    })
}, 200)

function combatCheck(entity) {
    var distance = bot.entity.position.distanceTo(entity.position);
    if (isEnemy(entity)) {//hostile player
        if (glob.isCloseDefenceMode && distance < 4 && new Date().getTime() - preAttackTime > swordInterval) {//punch
            punch(entity)
        } else if (glob.isSniperMode && distance < glob.snipeDistance && !(entity.name && entity.name == "enderman")) {//shoot
            if (canSeeDirectly(entity.position.offset(0, eyeHeight, 0))) {
                shoot(entity, false);
            } else if (glob.isHighAngleMode && bot.blockAt(bot.entity.position).skyLight == 15 && bot.blockAt(entity.position).skyLight == 15) {
                shoot(entity, true);
            }
        } else if (glob.isEggBomberMode && distance < glob.snipeDistance) {//egg
            if (canSeeDirectly(entity.position.offset(0, eyeHeight, 0))) {
                throwEgg(entity.position.offset(0, eyeHeight, 0));
            }
        }
    }
}

bot.on('entityMoved', (entity) => {
    if (glob.isArrowDefenceMode && isAliveArrow(entity)) {
        arrowDefence(entity)
    } else if (entity.username && entity.metadata[6] == 1) {
        targetedDefence(entity)
    }
})

bot.on("entitySpawn", (entity) => {
    if (glob.isArrowDefenceMode && isAliveArrow(entity)) {
        arrowDefence(entity)
    }
});

var guardTimeout;
function arrowDefence(arrow) {
    var dist = arrow.position.distanceTo(bot.entity.position.offset(0, 1, 0))
    var forme = arrow.position.minus(bot.entity.position).unit()
    var forto = new Vec3(-Math.sin(arrow.yaw), Math.sin(arrow.pitch - Math.PI), Math.cos(arrow.yaw)).unit()
    var inpro = forme.innerProduct(forto)

    if (Math.acos(inpro) > Math.PI / Math.max(0, (18 - 32 / dist))) return;

    bot.log("[combat] detecting an approaching arrow")
    guard(arrow.position)
}

function targetedDefence(player) {
    var forme = player.position.minus(bot.entity.position.offset(0, 1, 0)).unit()
    var forto = new Vec3(Math.sin(player.yaw), Math.sin(player.pitch - Math.PI), Math.cos(player.yaw)).unit()
    var inpro = forme.innerProduct(forto)
    if (Math.acos(inpro) > Math.PI / 27) return;

    bot.log("[combat] detecting a player targeting me")
    guard(player.position.offset(0, 1, 0))
}

function guard(look) {
    glob.changeState("guarding")

    bot.lookAt(look, true);
    if (bot.heldItem && bot.heldItem.type == 422) {
        bot.activateItem();
    } else {
        var shield = glob.findItem(442); //shield id
        if (shield) {
            bot.equip(shield, "hand", function (err) {
                if (err) {
                    bot.log(err)
                    glob.finishState("guarding");
                    return;
                }
                bot.activateItem();
            })
        } else {
            bot.log("[combat] No Shield")
            glob.finishState("guarding");
            return
        }
    }

    clearTimeout(guardTimeout)
    guardTimeout = setTimeout(function () {
        bot.deactivateItem();
        glob.finishState("guarding");
    }, 1000);
}

function punch(entity) {
    glob.queueOnceState("punching", function (entity) {
        if (entity.name) bot.log("[combat] punch: " + entity.name);
        else bot.log("[combat] punch: " + entity.username);
        var item = glob.findItem(swords);
        if (item != null) {
            bot.equip(item, "hand", function (err) {
                if (err) {
                    bot.log(err);
                }
                bot.attack(entity);
                glob.finishState("punching")
            });
        } else {
            bot.attack(entity, true);
            glob.finishState("punching")
        }
        preAttackTime = new Date().getTime();
    }, entity);
}

function shoot(entity, isHigh) {
    glob.queueOnceState("shooting", function () {
        var bow = glob.findItem(261, undefined, (item) => { return item.metadata < glob.bowDamageLimit ? true : false }); // bow id
        var arrow = glob.findItem(arrows);
        var previousPosition;
        if (bow != null && arrow != null) {
            if (entity.name != undefined) bot.log("[combat] shoot: " + entity.name + " " + entity.position.floored());
            else bot.log("[combat] shoot: " + entity.username + " " + entity.position.floored());
            bot.equip(bow, "hand", function (err) {
                if (err) {
                    bot.log(err)
                    glob.finishState("shooting");
                    return;
                };
                bot.activateItem();
                bot.lookAt(entity.position);
                setTimeout(function () {
                    previousPosition = entity.position.clone();
                }, drawingTime * 0.8)
                setTimeout(function () {
                    if (entity.isValid) {
                        var target = entity.position;
                        var velocity = target.minus(previousPosition).scaled(1000 / (drawingTime * 0.2) * 0.8);
                        var dist = target.xzDistanceTo(bot.entity.position)
                        if (isHigh && canSeeDirectly(target.offset(0, eyeHeight, 0))) isHigh = false

                        var t = timeToShoot(bot.entity.position, target, isHigh);
                        target = target.plus(velocity.scaled(t))
                        t = timeToShoot(bot.entity.position, target, isHigh);

                        var heightAdjust = 0.5 * Gravity * t * t;
                        heightAdjust += t * airResistance;
                        heightAdjust += dist * 0.005
                        if (isHigh) heightAdjust *= highAngleAdjust;

                        if (isNaN(heightAdjust)) {
                            bot.unequip("hand");
                            bot.log("[combat] can't shoot there")
                            glob.finishState("shooting");
                        } else {
                            bot.lookAt(target.offset(0, heightAdjust + eyeHeight, 0), true, function () {
                                bot.deactivateItem();
                                glob.finishState("shooting");
                            });
                        }
                    } else {
                        bot.unequip("hand");
                        glob.finishState("shooting");
                    }
                }, drawingTime)
            });;
        } else {
            bot.log("[combat] No Bow or Arrow");
            glob.finishState("shooting");
        }
    });
}

function timeToShoot(from, target, isHigh) {
    var y = target.y - from.y;
    var dist = target.xzDistanceTo(from)
    var angle = Math.atan(y / dist)
    var ayg = maxArrowSpeed * maxArrowSpeed - y * Gravity;
    var discriminant = (ayg * ayg - Gravity * Gravity * ((dist * dist) + (y * y)));
    var t1 = 2 * (ayg + Math.sqrt(discriminant)) / (Gravity * Gravity);
    var t2 = 2 * (ayg - Math.sqrt(discriminant)) / (Gravity * Gravity);
    if (t1 < 0) t1 = t2;
    else if (t2 < 0) t2 = t1;
    if (isHigh) {
        t = Math.max(t1, t2);
    } else {
        t = Math.min(t1, t2)
    }
    t = Math.sqrt(t);
    if (glob.logCombat) bot.log("[combat] details " + " L2:" + target.distanceTo(from) + " dist:" + dist + " y:" + y + " angle:" + angle / (Math.PI / 180) + " D:" + discriminant + " time:" + t + " target:" + target)
    return t;
}

function throwEgg(target) {
    glob.tryState("throwit", function () {
        var item;
        if (bot.heldItem && bot.heldItem.type == 344) item = bot.heldItem
        else item = glob.findItem(344);
        if (item) {
            bot.equip(item, "hand", function (err) {
                if (err) {
                    bot.log(err)
                    glob.finishState("throwit")
                } else {
                    throwIt(target);
                }
            });
        } else {
            bot.log("[combat] No Egg")
            // bot.chat("/give @p minecraft:egg 64")
            glob.finishState("throwit")
        }
    })
}

function throwPearl(target) {
    glob.queueOnceState("throwit", function () {
        var item = glob.findItem(368);
        if (item) {
            bot.equip(item, "hand", function (err) {
                if (err) {
                    bot.log(err)
                    glob.finishState("throwit")
                } else {
                    throwIt(target);
                }
            });
        } else {
            bot.log("[combat] No Pearl")
        }
        glob.finishState("throwit")
    })
}

function throwIt(target) { // position
    if (bot.heldItem) bot.log("[combat] throw: " + bot.heldItem.displayName + " " + target.floored());
    else bot.log("[combat] throw: " + target.floored());
    var dist = target.xzDistanceTo(bot.entity.position)

    var isHigh = true;
    if (canSeeDirectly(target)) isHigh = false

    var t = timeToThrow(target, isHigh);

    var heightAdjust = 0.5 * Gravity * t * t;
    heightAdjust += t * airResistance;
    heightAdjust += dist * 0.005
    if (isHigh) heightAdjust *= highAngleAdjust;

    if (isNaN(heightAdjust)) {
        bot.log("[combat] can't throw there")
        glob.finishState("throwit")
    } else {
        bot.lookAt(target.offset(0, heightAdjust, 0), true, function () {
            bot.activateItem();
            glob.finishState("throwit")
        });
    }
}

function timeToThrow(target, isHigh) {
    var y = target.y - bot.entity.position.y;
    var dist = target.xzDistanceTo(bot.entity.position)
    var angle = Math.atan(y / dist)
    var ayg = maxEggSpeed * maxEggSpeed - y * Gravity;
    var discriminant = (ayg * ayg - Gravity * Gravity * ((dist * dist) + (y * y)));
    var t1 = 2 * (ayg + Math.sqrt(discriminant)) / (Gravity * Gravity);
    var t2 = 2 * (ayg - Math.sqrt(discriminant)) / (Gravity * Gravity);
    if (t1 < 0) t1 = t2;
    else if (t2 < 0) t2 = t1;
    if (!isHigh) {
        t = Math.min(t1, t2);
    } else {
        t = Math.max(t1, t2)
    }
    t = Math.sqrt(t);
    if (glob.logCombat) bot.log("[combat] details " + " L2:" + target.distanceTo(bot.entity.position) + " dist:" + dist + " y:" + y + " angle:" + angle / (Math.PI / 180) + " D:" + discriminant + " time:" + t + " target:" + target)
    return t;
}

function canSeeDirectly(target) {
    var myPos = bot.entity.position.offset(0, eyeHeight, 0);
    var vector = target.minus(myPos);
    var unit = vector.unit()
    var limit = vector.norm();
    var scale = 1;
    var search = unit.scaled(scale);
    while (search.norm() < limit) {
        var block = bot.blockAt(myPos.plus(search))
        if (block && block.boundingBox == "block") {
            return false;
        }
        scale++;
        search = unit.scaled(scale);
    }
    return true;
}

var lookingEntity;
function lookAt(entity) {
    lookingEntity = entity;
    glob.tryState("lookAt", function () {
        setInterval(function () {
            if (lookingEntity && lookingEntity.isValid && glob.getState() == "lookAt")
                bot.lookAt(lookingEntity.position.offset(0, eyeHeight, 0), true);
            else
                glob.finishState("lookAt")
        }, 100)
    })
}

function isEnemy(entity) {
    if (entity.id == bot.entity.id) return false
    if (glob.neutrals.includes(entity.id)) return false
    if (glob.hostiles.includes(entity.id)) return true
    if (entity.kind && entity.kind == "Hostile mobs" && !(entity.metadata[2] != "")) return true//hostile mob //name recognize is fixed by replace
    if (glob.isBerserkerMode && entity.username) return true
    return false
}

function isAliveArrow(entity) {
    if (entity.name && entity.name.match(/arrow/)) {
        if (entity.metadata && entity.metadata[6] == 1) {
            return true
        } else if (Array.isArray(entity.metadata)) {
            return true
        } else {
            return false
        }
    } else {
        return false
    }
}