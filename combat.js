

glob.isSelfDefenceMode = true;
glob.isShootingArrow = false;
glob.isSniperMode = false;
glob.isHighAngleMode = false;


glob.logCombat = false;

const airResistance = 0;
const highAngleAdjust = 0.58;
const eyeHeight = 1.10;
const Gravity = 18.3;
const maxArrowSpeed = 55;

var swordInterval = 625;
var preAttackTime = new Date().getTime();
var swords = [276, 267, 272, 283, 268]; //強い順
var arrows = [262, 439, 440];

glob.hostiles = [];


bot.on('entityMoved', (entity) => {
    var distance = bot.entity.position.distanceTo(entity.position);
    if ((entity.kind != undefined && entity.kind == "Hostile mobs") || (entity.username != undefined && contains(glob.hostiles, entity.username))) {
        bot.updateHeldItem()
        if (glob.isSelfDefenceMode && distance < 5 && new Date().getTime() - preAttackTime > swordInterval) {
            if (entity.name != undefined) bot.log("[combat] punch: " + entity.name);
            else bot.log("[combat] punch: " + entity.username);
            var item = glob.findItem(swords);
            if (item != null) {
                bot.equip(item, "hand", function () {
                    bot.attack(entity);//, true);
                });
            } else {
                bot.attack(entity);
            }
            preAttackTime = new Date().getTime();
        } else if (glob.isSniperMode && distance < 96) {
            if (!glob.isShootingArrow && !glob.isEating) {
                if (canSeeDirectly(entity.position.offset(0, eyeHeight, 0))) {
                    shootArrow(entity, false);
                } else if (glob.isHighAngleMode && bot.blockAt(bot.entity.position).skyLight == 15 && bot.blockAt(entity.position).skyLight == 15) {
                    shootArrow(entity, true);
                }
            }
        }
    }
});

function shootArrow(entity, isHigh) {
    if (glob.isShootingArrow) return;
    glob.isShootingArrow = true;
    var bow = glob.findItem([261]); // bow id
    var arrow = glob.findItem(arrows);
    if (bow != null && arrow != null) {
        if (entity.name != undefined) bot.log("[combat] shoot: " + entity.name + " " + entity.position);
        else bot.log("[combat] shoot: " + entity.username + " " + entity.position);
        bot.equip(bow, "hand", function (err) {
            if (err) console.log(err);
            bot.activateItem();
            bot.lookAt(entity.position);
            setTimeout(release, 1100)//1100)//1500)
        });;
    } else {
        bot.log("[combat] no bow or arrow");
        glob.isShootingArrow = false;
        glob.isSniperMode = false;
    }

    function release() {
        if (entity.isValid) {
            //var distance = bot.entity.position.distanceTo(entity.position);
            var target = entity.position;
            var tgEye = entity.height * 0.8;
            if (isHigh && canSeeDirectly(target.offset(0, eyeHeight, 0))) { isHigh = false }
            var x = target.x - bot.entity.position.x;
            var y = target.y - bot.entity.position.y;
            var z = target.z - bot.entity.position.z;
            var dist = Math.sqrt((x * x) + (z * z));
            var angle = Math.atan(y/dist)
            //var heightAdjust = entity.height * 0.8 + (distance * 0.15) + angle * 3.0 + Math.random() * 3 - 1.0;
            //var heightAdjust = entity.height * 0.8 + (distance * distance) * 0.003 //+ angle * 3.0 //+ Math.random() * 3 - 1.0;
            var ayg = maxArrowSpeed * maxArrowSpeed - y * Gravity;
            var discriminant = (ayg * ayg - Gravity * Gravity * ((dist * dist) + (y * y)));
            var t1 = 2 * (ayg + Math.sqrt(discriminant)) / (Gravity * Gravity);
            var t2 = 2 * (ayg - Math.sqrt(discriminant)) / (Gravity * Gravity);
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
            var heightAdjust = 0.5 * Gravity * t * t;
            heightAdjust += t * airResistance;
            heightAdjust += dist * 0.005

            if (isHigh) heightAdjust *= highAngleAdjust;

            if (isNaN(heightAdjust)) {
                bot.log("[combat] can't shoot there")
                heightAdjust = (dist * dist) * 0.003;
            }
            //if (glob.logCombat) bot.log("[combat] shoot " + " d:" + distance + " y:" + y + " t:" + t + " angle:" + angle + " D:" + discriminant + " adjust:" + heightAdjust + " t1:" + t1 + " t2:" + t2 + " eye:" + tgEye)
            if (glob.logCombat) bot.log("[combat] details " + " L2:" + target.distanceTo(bot.entity.position) + " dist:" + dist + " y:" + y + " angle:" + angle/(Math.PI/180) + " D:" + discriminant + " adjust:" + heightAdjust + " time:"+t)
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

function canSeeDirectly(target) {
    var zero = new Vec3(0, 0, 0);
    var myPos = bot.entity.position.offset(0, eyeHeight, 0);
    var vector = target.minus(myPos);
    var norm = vector.scaled(1.0 / vector.distanceTo(zero));
    var limit = vector.distanceTo(zero);
    var scale = 1;
    var search = norm.scaled(scale);
    // console.log(norm);
    while (search.distanceTo(zero) < limit) {
        if (bot.blockAt(myPos.plus(search)).boundingBox == "block") {
            return false;
        }
        scale++;
        search = norm.scaled(scale);
    }
    // console.log(target);
    // console.log(myPos.plus(search));
    return true;
}

function contains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == val) return true;
    }
    return false;
}

// function canShoot(name){
//     if(
//         name.match("enderman") ||
//         name.match("zombie_pigman")
//     ) return false;
//     return true
// }