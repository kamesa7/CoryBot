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
glob.isEating = false;

glob.startEat = startEat;
glob.findItem = findItem;
glob.clearInventory = clearInventory;

var eatTime;

bot.on('health', function () {
    bodyManage();
});


bot.on('food', function () {
    bodyManage();
});

function bodyManage() {
    eatTime = new Date();
    bot.log("[body] health: " + bot.health + ", food: " + bot.food);
    if (bot.health < 20 && bot.food < 19) {
        startEat();
    } else if (bot.food <= 10) {
        startEat();
    } else if (bot.health < 10 && bot.food < 20) {
        startEat();
    } else {
        if (glob.isEating) {
            bot.deactivateItem();
            glob.isEating = false;
        }
    }
}

function startEat() {
    eatTime = new Date();
    var item = findItem(foods);
    if (item != null) {
        glob.isEating = true;
        bot.equip(item, "hand", function () {
            bot.activateItem()
        });
        bot.log("[eat] eat: " + item.name);
        setTimeout(eating, 500);
    } else {
        bot.log("[eat] no food")
    }

    function eating() {
        if (glob.isEating) {
            if (new Date().getTime() - 3000 > eatTime.getTime()) {
                bodyManage();
            } else {
                setTimeout(eating, 300);
            }
        }
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

function findItem(list) {
    var item;
    for (var index = 0; index < list.length; index++) {
        item = bot.inventory.findInventoryItem(list[index]);//, 0);
        if (item != null) return item;
    }
    return null;
}