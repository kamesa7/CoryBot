var swordInterval = 625;
var preAttackTime = new Date().getTime();
var swords = [276, 267, 272, 283, 268]; //強い順
var arrows = [262, 439, 440];

botFunc.isShootingArrow = false;
botFunc.isSniperMode = false;

bot.on('entityMoved', (entity) => {
    var distance = bot.entity.position.distanceTo(entity.position);
    if (entity.kind != undefined && entity.kind == "Hostile mobs") {
        bot.updateHeldItem()
        if (distance < 5 && new Date().getTime() - preAttackTime > swordInterval) {
            bot.log("[combat] near: " + entity.name);
            var item = botFunc.findItem(swords);
            if (item != null) {
                bot.equip(item, "hand", function () {
                    bot.attack(entity);
                });
            } else {
                bot.attack(entity);
            }
            preAttackTime = new Date().getTime();
        } else if (botFunc.isSniperMode && distance < 50) {
            if (!botFunc.isShootingArrow && !botFunc.isEating)
                shootArrow(entity);
        }
    }
});

function shootArrow(entity) {
    if (!canSeeDirectly(entity.position.offset(0, entity.height * 0.8, 0))) return;
    if (botFunc.isShootingArrow) return;
    botFunc.isShootingArrow = true;
    var bow = botFunc.findItem([261]); // bow id
    var arrow = botFunc.findItem(arrows);
    if (bow != null && arrow != null) {
        bot.log("[combat] shoot " + entity.name);
        bot.equip(bow, "hand", function (err) {
            if (err) console.log(err);
            bot.activateItem();
            bot.lookAt(entity.position);
            setTimeout(release, 1500)
        });;
    } else {
        bot.log("[combat] no bow or arrow");
        botFunc.isShootingArrow = false;
    }

    function release() {
        if (entity != undefined) {
            //var distance = bot.entity.position.distanceTo(entity.position);
            var x = bot.entity.position.x - entity.position.x;
            var z = bot.entity.position.z - entity.position.z;
            var distance = Math.sqrt((x * x) + (z * z));
            var angle = (entity.position.y - bot.entity.position.y) / distance;
            if (angle < 0) angle *= 0.05;
            //var heightAdjust = entity.height * 0.8 + (distance * 0.15) + angle * 3.0 + Math.random() * 3 - 1.0;
            var heightAdjust = entity.height * 0.8 + (distance * distance) * 0.003 //+ angle * 3.0 //+ Math.random() * 3 - 1.0;
            bot.lookAt(entity.position.offset(0, heightAdjust, 0), true, function () {
                bot.deactivateItem();
                botFunc.isShootingArrow = false;
            });
        } else {
            //bot.deactivateItem();
            bot.unequip("hand");
            botFunc.isShootingArrow = false;
        }
    }
}
function canSeeDirectly(target) {
    var zero = new Vec3(0, 0, 0);
    var myPos = bot.entity.position.offset(0, 1.5, 0);
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
