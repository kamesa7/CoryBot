

glob.isCloseDefenceMode = true;
glob.isSniperMode = false;
glob.isHighAngleMode = true;
glob.isArrowDefenceMode = true;

glob.bowDamageLimit = 350;
glob.snipeDistance = 96;

glob.logCombat = false;

// glob.punch = punch;
// glob.shoot = shoot;

const airResistance = 0;
const highAngleAdjust = 0.58;
const eyeHeight = 1.10;
const Gravity = 18.3;
const maxArrowSpeed = 55;
const drawingTime = 1100;

var swordInterval = 625;
var preAttackTime = new Date().getTime();
var swords = [276, 267, 272, 283, 268]; //強い順
var arrows = [262, 439, 440];

glob.hostiles = [];

bot.on('entityMoved', (entity) => {
    var distance = bot.entity.position.distanceTo(entity.position);
    if ((entity.kind && entity.kind == "Hostile mobs" && !(entity.metadata[2] && entity.metadata[2] != ""))//hostile mob //name recognize is not working
        || (entity.username && contains(glob.hostiles, entity.username))) {//hostile player
        if (glob.isCloseDefenceMode && distance < 4 && new Date().getTime() - preAttackTime > swordInterval) {//punch
            glob.queueOnceState("punching", function (entity) {
                if (entity.name) bot.log("[combat] punch: " + entity.name);
                else bot.log("[combat] punch: " + entity.username);
                var item = glob.findItem(swords);
                if (item != null) {
                    bot.equip(item, "hand", function () {
                        bot.attack(entity);
                    });
                } else {
                    bot.attack(entity, true);
                }
                preAttackTime = new Date().getTime();
                glob.finishState("punching")
            }, entity);
        } else if (glob.isSniperMode && distance < glob.snipeDistance && !(entity.name && entity.name == "enderman")) {//shoot
            if (canSeeDirectly(entity.position.offset(0, eyeHeight, 0))) {
                glob.queueOnceState("shooting", function (entity, isHigh) {
                    shoot(entity, isHigh);
                }, entity, false);
            } else if (glob.isHighAngleMode && bot.blockAt(bot.entity.position).skyLight == 15 && bot.blockAt(entity.position).skyLight == 15) {
                glob.queueOnceState("shooting", function (entity, isHigh) {
                    shoot(entity, isHigh);
                }, entity, true);
            }
        }
    }
});

bot.on("entitySpawn", (entity) => {
    var distance = bot.entity.position.distanceTo(entity.position);

    if (glob.isArrowDefenceMode && entity.name && entity.name == "arrow" && distance > 4) {
        var target = entity.position;
        var x = bot.entity.position.x - target.x;
        var z = bot.entity.position.z - target.z;
        var rad = -Math.atan2(x, z);

        if (glob.logCombat) bot.log("[combat] rad:" + (rad / Math.PI * 180) + " yaw:" + (entity.yaw / Math.PI * 180 - 180) + " pitch:" + entity.pitch / Math.PI * 180)
        if (Math.abs(rad - (entity.yaw - Math.PI)) > Math.PI / 18) return;

        bot.log("[combat] detecting an approaching arrow")
        var shield = glob.findItem(442); //shield id
        if (shield != null) {
            glob.changeState("guarding")

            bot.lookAt(entity.position.plus(new Vec3(0, 1, 0)), true);
            bot.activateItem();
            bot.equip(shield, "hand", function () {
                bot.activateItem();
                bot.lookAt(entity.position, true);
                setTimeout(function () {
                    bot.deactivateItem();
                    glob.finishState("guarding");
                }, Math.max(distance / maxArrowSpeed * 3000, 1000));
            });
        } else {
            bot.log("[combat] no shield");
        }
    }
});

function shoot(entity, isHigh) {
    var bow = glob.findItem(261); // bow id
    var arrow = glob.findItem(arrows);
    var previousPosition;
    if (bow != null && arrow != null && bow.metadata < glob.bowDamageLimit) {
        if (entity.name != undefined) bot.log("[combat] shoot: " + entity.name + " " + entity.position.floored());
        else bot.log("[combat] shoot: " + entity.username + " " + entity.position.floored());
        bot.equip(bow, "hand", function (err) {
            if (err) console.log(err);
            bot.activateItem();
            bot.lookAt(entity.position);
            setTimeout(function () {
                previousPosition = entity.position.clone();
            }, drawingTime * 0.8)
            setTimeout(release, drawingTime)
        });;
    } else {
        bot.log("[combat] no bow or arrow");
        glob.finishState("shooting");
    }

    function release() {
        if (entity.isValid) {
            var target = entity.position;
            var velocity = target.minus(previousPosition).scaled(1000 / (drawingTime * 0.2) * 0.8);
            var x = target.x - bot.entity.position.x;
            var z = target.z - bot.entity.position.z;
            var dist = getXZL2(x, z);
            if (isHigh && canSeeDirectly(target.offset(0, eyeHeight, 0))) isHigh = false

            var t = timeToShoot(target, isHigh);
            target = target.plus(velocity.scaled(t))
            t = timeToShoot(target, isHigh);

            var heightAdjust = 0.5 * Gravity * t * t;
            heightAdjust += t * airResistance;
            heightAdjust += dist * 0.005
            if (isHigh) heightAdjust *= highAngleAdjust;

            if (isNaN(heightAdjust)) {
                bot.unequip("hand");
                bot.log("[combat] can't shoot there")
            } else {
                bot.lookAt(target.offset(0, heightAdjust + eyeHeight, 0), true, function () {
                    bot.deactivateItem();
                });
            }
        } else {
            bot.unequip("hand");

        }
        glob.finishState("shooting");
    }
}

function timeToShoot(target, isHigh) {
    var x = target.x - bot.entity.position.x;
    var y = target.y - bot.entity.position.y;
    var z = target.z - bot.entity.position.z;
    var dist = getXZL2(x, z);
    var angle = Math.atan(y / dist)
    var ayg = maxArrowSpeed * maxArrowSpeed - y * Gravity;
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
    var zero = new Vec3(0, 0, 0);
    var myPos = bot.entity.position.offset(0, eyeHeight, 0);
    var vector = target.minus(myPos);
    var norm = vector.scaled(1.0 / vector.distanceTo(zero));
    var limit = vector.distanceTo(zero);
    var scale = 1;
    var search = norm.scaled(scale);
    while (search.distanceTo(zero) < limit) {
        var block = bot.blockAt(myPos.plus(search))
        if (block && block.boundingBox == "block") {
            return false;
        }
        scale++;
        search = norm.scaled(scale);
    }
    return true;
}

function contains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == val) return true;
    }
    return false;
}

function getXZL2(x, z) {
    return Math.sqrt((x * x) + (z * z));
}