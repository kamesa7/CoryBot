

glob.isSelfDefenceMode = true;
glob.isSniperMode = false;
glob.isHighAngleMode = false;

glob.isShootingArrow = false;
glob.isGuarding = false;

glob.bowDamageLimit = 300;

glob.logCombat = false;

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
// var previousPosition = [];

// bot.on( "entitySwingArm", (entity)=> {console.log(new Date().getTime()+" arm"+entity.id)})
// bot.on( "entityHurt", (entity)=> {console.log(new Date().getTime()+" hur"+entity.id)})
// bot.on( "entityWake", (entity)=> {console.log(new Date().getTime()+" wak"+entity.id)})
// bot.on( "entityEat", (entity)=> {console.log(new Date().getTime()+" eat"+entity.id)})
// bot.on( "entityCrouch", (entity)=> {console.log(new Date().getTime()+" cro"+entity.id)})
// bot.on( "entityUncrouch", (entity)=> {console.log(new Date().getTime()+" ucr"+entity.id)})
// bot.on( "entityEquipmentChange", (entity)=> {console.log(new Date().getTime()+" equ"+entity.id)})
// bot.on( "entitySleep", (entity)=> {console.log(new Date().getTime()+" sle"+entity.id)})
// bot.on( "entitySpawn", (entity)=> {console.log(new Date().getTime()+" spa"+entity.id)})
// bot.on( "entityGone", (entity)=> {console.log(new Date().getTime()+" gon"+entity.id)})
// bot.on( "entityMoved", (entity)=> {console.log(new Date().getTime()+" mov"+entity.id)})
// bot.on( "entityUpdate", (entity)=> {console.log(new Date().getTime()+" up"+entity.id)})

bot.on('entityMoved', (entity) => {
    var distance = bot.entity.position.distanceTo(entity.position);
    if (!glob.isGuarding && ((entity.kind != undefined && entity.kind == "Hostile mobs") || (entity.username != undefined && contains(glob.hostiles, entity.username)))) {
        bot.updateHeldItem()
        if (glob.isSelfDefenceMode && distance < 4 && new Date().getTime() - preAttackTime > swordInterval) {
            if (entity.name != undefined) {
                bot.log("[combat] punch: " + entity.name);
            } else {
                bot.log("[combat] punch: " + entity.username);
            }
            var item = glob.findItem(swords);
            if (item != null) {
                bot.equip(item, "hand", function () {
                    bot.attack(entity);//, true);
                });
            } else {
                bot.attack(entity);
            }
            preAttackTime = new Date().getTime();
        } else if (!glob.isShootingArrow && !glob.isEating && glob.isSniperMode && distance < 96 && !(entity.name && entity.name == "enderman")) {
            if (canSeeDirectly(entity.position.offset(0, eyeHeight, 0))) {
                shootArrow(entity, false);
            } else if (glob.isHighAngleMode && bot.blockAt(bot.entity.position).skyLight == 15 && bot.blockAt(entity.position).skyLight == 15) {
                shootArrow(entity, true);
            }
        }
    }
    // previousPosition[entity.id] = [entity.position.clone(), new Date().getTime()]
});

bot.on("entitySpawn", (entity) => {
    // previousPosition[entity.id] = [entity.position.clone(), new Date().getTime()]
    var distance = bot.entity.position.distanceTo(entity.position);
    if (!glob.isGuarding && entity.name != undefined && entity.name == "arrow" && distance > 4) {
        var target = entity.position;
        var x = bot.entity.position.x - target.x;
        var z = bot.entity.position.z - target.z;
        var rad = -Math.atan2(x,z);
        if (glob.logCombat) bot.log("[combat] rad:"+(rad / Math.PI * 180) + " yaw:" + (entity.yaw / Math.PI * 180 -180 ) + " pitch:" + entity.pitch / Math.PI * 180)
        if (Math.abs(rad - (entity.yaw - Math.PI)) > Math.PI / 18) return;
        bot.log("[combat] detecting an approaching arrow")
        var shield = glob.findItem(442); //shield id
        if (shield != null) {
            glob.isGuarding = true;
            bot.lookAt(entity.position.plus(new Vec3(0, 1, 0)), true);
            bot.activateItem();
            bot.equip(shield, "hand", function () {
                bot.activateItem();
                bot.lookAt(entity.position, true);
                setTimeout(function () {
                    bot.deactivateItem();
                    glob.isGuarding = false;
                }, Math.max(distance / maxArrowSpeed * 3000, 1000));
            });
        } else {
            bot.log("[combat] no shield");
        }
    }
});

function shootArrow(entity, isHigh) {
    if (glob.isShootingArrow) return;
    glob.isShootingArrow = true;
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
        glob.isShootingArrow = false;
        //glob.isSniperMode = false;
    }

    function release() {
        if (entity.isValid) {
            var target = entity.position;
            var velocity = target.minus(previousPosition).scaled(1000 / (drawingTime * 0.2) * 0.8);
            var x = target.x - bot.entity.position.x;
            var z = target.z - bot.entity.position.z;
            var dist = getXZL2(x, z);
            if (isHigh && canSeeDirectly(target.offset(0, eyeHeight, 0))) { isHigh = false }

            var t = timeToShoot(target, isHigh);
            target = target.plus(velocity.scaled(t))
            t = timeToShoot(target, isHigh);

            //var heightAdjust = entity.height * 0.8 + (distance * 0.15) + angle * 3.0 + Math.random() * 3 - 1.0;
            //var heightAdjust = entity.height * 0.8 + (distance * distance) * 0.003 //+ angle * 3.0 //+ Math.random() * 3 - 1.0;
            var heightAdjust = 0.5 * Gravity * t * t;
            heightAdjust += t * airResistance;
            heightAdjust += dist * 0.005
            if (isHigh) heightAdjust *= highAngleAdjust;
            if (isNaN(heightAdjust)) {
                bot.unequip("hand");
                glob.isShootingArrow = false;
                bot.log("[combat] can't shoot there")
                return
            }

            bot.lookAt(target.offset(0, heightAdjust + eyeHeight, 0), true, function () {
                bot.deactivateItem();
                glob.isShootingArrow = false;
            });
        } else {
            //bot.deactivateItem();
            bot.unequip("hand");
            glob.isShootingArrow = false;
        }
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
    Math.ata
    if (!isHigh) {
        if (t1 < 0) t = t2;
        else if (t2 < 0) t = t1;
        else if (t1 < t2) t = t1;
        else t = t2;
    } else {
        if (t1 < 0) t = t1;
        else if (t2 < 0) t = t2;
        else if (t1 < t2) t = t2;
        else t = t1;
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

// function canShoot(name){
//     if(
//         name.match("enderman") ||
//         name.match("zombie_pigman")
//     ) return false;
//     return true
// }