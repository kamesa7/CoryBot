/*
const QUICK_BAR_COUNT = 9
const QUICK_BAR_START = 36

const armorSlots = {
  head: 5,
  torso: 6,
  legs: 7,
  feet: 8
}
*/

//functions
glob.startEat = startEat;
glob.findItem = findItem;
glob.checkItemCount = checkItemCount
glob.clearInventory = clearInventory;
glob.equipArmor = equipArmor;
glob.equipHead = equipHead;

bot.on('spawn', function () {
    setTimeout(function () {
        bot.unequip("hand", function (err) {
            bot.log(err)
        })
    }, 5000);
})

bot.on('health', function () {
    bodyManage();
});


bot.on('food', function () {
    bodyManage();
});

function bodyManage() {
    bot.log("[body] health: " + Math.round(bot.health) + ", food: " + Math.round(bot.food));
    if (bot.health < 20 && bot.food < 19) {
        startEat();
    } else if (bot.food <= 10) {
        startEat();
    } else if (bot.health < 10 && bot.food < 20) {
        startEat();
    }
}

function startEat() {
    var item = findItem(foods);
    if (item != null) {
        glob.queueOnceState("eating", function () {
            bot.equip(item, "hand", function (err) {
                if (err) {
                    glob.finishState("eating");
                    return;
                }                
                bot.log("[eat] eat: " + item.name);
                bot.consume(function () {
                    glob.finishState("eating");
                });
            });
        });
    } else {
        bot.log("[eat] no food")
    }
}

function clearInventory() {
    var stacks = 0;
    toss();
    function toss(err) {
        for (var index = 0; index < bot.inventory.slots.length; index++) {
            switch (index) {
                case 5: case 6: case 7: case 8: continue;
            }
            if (bot.inventory.slots[index] != null) {
                stacks++;
                bot.tossStack(bot.inventory.slots[index], toss);
                return;
            }
        }
        bot.log("[inventory] cleard  " + stacks + " stack");
    }
}

var foods = [
    260, 297, 320, 322, 350, 357, 360, 364, 366, 367, 391, 393, 400, 412, 424, 396
];

var helmets = [
    310, 306, 302, 314, 298
];

function findItem(target, meta = undefined) {
    if (Array.isArray(target)) {
        var item;
        for (var index = 0; index < target.length; index++) {
            item = bot.inventory.findInventoryItem(target[index], meta);
            if (item != null) {
                if (meta && item.metadata != meta) continue
                return item;
            }
        }
        return null;
    } else {
        return bot.inventory.findInventoryItem(target, meta);
    }
}

function checkItemCount(type, metadata = undefined) {
    const slots = bot.inventory.slots
    var count = 0
    for (var index = 0; index < slots.length; index++) {
        var item = slots[index]
        if (item && item.type == type && (metadata == undefined || item.metadata == metadata)) {
            count += item.count
        }
    }
    return count;
}

function equipArmor(dest = 0) {
    var item;
    for (var index = 0; index < helmets.length; index++) {
        item = findItem(helmets[index] + dest);
        if (item != null && (item.slot < 5 || 8 < item.slot)) {
            switch (dest) {
                case 0: bot.equip(item, "head", function (err) {
                    if (err) bot.log(err)
                }); break;
                case 1: bot.equip(item, "torso", function (err) {
                    if (err) bot.log(err)
                }); break;
                case 2: bot.equip(item, "legs", function (err) {
                    if (err) bot.log(err)
                }); break;
                case 3: bot.equip(item, "feet", function (err) {
                    if (err) bot.log(err)
                }); break;
            }
            return;
        }
    }
}

function equipHead() {
    var item = findItem(397);
    if (item != null) {
        bot.equip(item, "head", function (err) {
            if (err) bot.log(err)
        });
    }
}