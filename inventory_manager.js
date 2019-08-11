const QUICK_BAR_START = 36
/*
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
glob.checkArmor = checkArmor;
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
    bodyManage(true);
});


bot.on('food', function () {
    bodyManage(false);
});

function bodyManage(log) {
    if (log) bot.log("[body] health: " + Math.round(bot.health) + ", food: " + Math.round(bot.food));
    if (bot.health < 20 && bot.food < 19) {
        startEat();
    } else if (bot.food <= 10) {
        startEat();
    } else if (bot.health < 10 && bot.food < 20) {
        startEat();
    }
}

function startEat() {
    glob.queueOnceState("eating", function () {
        let item = findItem(foods);
        if (item != null) {
            bot.equip(item, "hand", function (err) {
                if (err) {
                    bot.log(err)
                    glob.finishState("eating");
                    return;
                }
                bot.log("[eat] eat: " + item.name);
                var stat = setTimeout(glob.finishState, 4500, "eating")
                bot.consume(function () {
                    glob.finishState("eating");
                    clearTimeout(stat)
                });
            });
        } else {
            bot.log("[eat] No Food")
            glob.finishState("eating");
        }
    })
}

function clearInventory() {
    bot.log("[inventory] clear inventory");
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

var armors = [
    [310, 306, 302, 314, 298],
    [311, 307, 303, 315, 299],
    [312, 308, 304, 316, 300],
    [313, 309, 305, 317, 301]
];

function findItem(target, metadata = undefined, isOK = (item) => { return true }) {
    const slots = bot.inventory.slots

    if (Array.isArray(target)) {
        for (let index = 0; index < target.length; index++) {
            let item = findInventoryItem(target[index]);
            if (item != null) return item;
        }
        return null;
    } else {
        return findInventoryItem(target);
    }

    function findInventoryItem(type) {
        for (let index = QUICK_BAR_START; index < slots.length; index++) {
            let item = slots[index]
            if (isCollect(item)) return item
        }
        for (let index = 9; index < QUICK_BAR_START; index++) {
            let item = slots[index]
            if (isCollect(item)) return item
        }
        for (let index = 0; index < 9; index++) {
            let item = slots[index]
            if (isCollect(item)) return item
        }
        return null

        function isCollect(item) {
            return (item && item.type == type && (metadata == undefined || item.metadata == metadata) && isOK(item))
        }
    }
}

function checkItemCount(type, metadata = undefined) {
    const slots = bot.inventory.slots
    var count = 0
    for (let index = 0; index < slots.length; index++) {
        let item = slots[index]
        if (item && item.type == type && (metadata == undefined || item.metadata == metadata)) {
            count += item.count
        }
    }
    return count;
}

bot.inventory.on("windowUpdate", () => {

})
bot.on("playerCollect", (collector, collected) => {
    if (collector.id != bot.entity.id) return
    setTimeout(function () {
        bodyManage(false)
        checkArmor()
    }, 300);
})

function inventoryItemCount() {
    const slots = bot.inventory.slots
    var count = 0
    for (let index = 0; index < slots.length; index++) {
        let item = slots[index]
        if (item) count += item.count
    }
    return count
}

function checkArmor() {
    const slots = bot.inventory.slots
    for (let i = 5; i <= 8; i++) {
        if (slots[i] == null) {
            equipArmor(i - 5)
        }
    }
}

function equipArmor(dest) {
    if (dest == undefined) return
    glob.queueState("armor", function () {
        let item = findItem(armors[dest]);
        if (item != null && (item.slot < 5 || 8 < item.slot)) {
            setTimeout(() => {
                switch (dest) {
                    case 0: bot.equip(item, "head", function (err) {
                        if (err) bot.log(err)
                        glob.finishState("armor")
                    }); break;
                    case 1: bot.equip(item, "torso", function (err) {
                        if (err) bot.log(err)
                        glob.finishState("armor")
                    }); break;
                    case 2: bot.equip(item, "legs", function (err) {
                        if (err) bot.log(err)
                        glob.finishState("armor")
                    }); break;
                    case 3: bot.equip(item, "feet", function (err) {
                        if (err) bot.log(err)
                        glob.finishState("armor")
                    }); break;
                }
            }, 300);
        } else {
            glob.finishState("armor")
        }
    })
}

function equipHead() {
    let item = findItem(397);
    if (item != null) {
        bot.equip(item, "head", function (err) {
            if (err) bot.log(err)
        });
    }
}