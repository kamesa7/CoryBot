var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const PORT = glob.RADAR_PORT;

app.use(express.static(__dirname + "/Radar"));

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/Radar/index.html");
});

io.on('connection', function (client) {

    client.on('message', function (msg) {
        bot.safechat(msg);
    });
    client.on('server', function () {
        emitServer();
        emitMapAll();
        emitVital();
    });
    client.on('stopmove', function () {
        glob.stopMoving()
    });
    client.on('dismount', function () {
        bot.dismount();
    });
    client.on('stopstate', function () {
        glob.finishState();
        glob.stopMoving();
    });
    client.on('goto', function (ID) {
        if (bot.entities[ID])
            glob.goToPos(bot.entities[ID].position)
    });
    client.on('follow', function (ID) {
        if (bot.entities[ID])
            glob.follow(bot.entities[ID])
    });
    client.on('chase', function (ID) {
        if (bot.entities[ID])
            glob.chase(bot.entities[ID])
    });
    client.on('mount', function (ID) {
        if (bot.entities[ID])
            bot.mount(bot.entities[ID]);
    });
    client.on('punch', function (ID) {
        if (bot.entities[ID])
            glob.punch(bot.entities[ID])
        // bot.attack(bot.entities[ID])
    });
    client.on('shoot', function (ID) {
        if (bot.entities[ID])
            glob.shoot(bot.entities[ID])
    });
    client.on('flags', function (flags) {
        glob.isCloseDefenceMode = flags.isCloseDefenceMode
        glob.isSniperMode = flags.isSniperMode
        glob.isArrowDefenceMode = flags.isArrowDefenceMode
        glob.isCollisionalMode = flags.isCollisionalMode
    })
    client.on('equip', function (slot) {
        const START = 9;
        var item = bot.inventory.slots[slot];
        if (START <= slot) {
            if (item) {
                bot.equip(item, "hand", function (err) {
                    if (err) bot.log(err);
                });
            } else {
                bot.unequip("hand", function (err) {
                    if (err) bot.log(err);
                })
            }
        } else {
            if (item) {
                switch (slot) {
                    case 5:
                        bot.unequip("head", function (err) {
                            if (err) bot.log(err);
                        });
                        break;
                    case 6:
                        bot.unequip("torso", function (err) {
                            if (err) bot.log(err);
                        });
                        break;
                    case 7:
                        bot.unequip("legs", function (err) {
                            if (err) bot.log(err);
                        });
                        break;
                    case 8:
                        bot.unequip("feet", function (err) {
                            if (err) bot.log(err);
                        });
                        break;
                }
            } else {
                if (bot.heldItem)
                    switch (slot) {
                        case 5:
                            bot.equip(bot.heldItem, "head", function (err) {
                                if (err) bot.log(err);
                            });
                            break;
                        case 6:
                            bot.equip(bot.heldItem, "torso", function (err) {
                                if (err) bot.log(err);
                            });
                            break;
                        case 7:
                            bot.equip(bot.heldItem, "legs", function (err) {
                                if (err) bot.log(err);
                            });
                            break;
                        case 8:
                            bot.equip(bot.heldItem, "feet", function (err) {
                                if (err) bot.log(err);
                            });
                            break;
                    }

            }
        }
    })
    client.on('tossitem', function () {
        var item = bot.heldItem;
        if (item)
            bot.tossStack(item);
    })

    client.on('actitem', function () {
        var item = bot.heldItem;
        if (item)
            bot.activateItem();
    })

    client.on('deactitem', function () {
        var item = bot.heldItem;
        if (item)
            bot.deactivateItem();
    })

    var sentMap = [];
    function emitMapAll() {
        const range = 48;
        var me = bot.entity.position.floored();
        var data = [];
        sentMap = []
        for (var x = me.x - range; x < me.x + range; x++) {
            for (var z = me.z - range; z < me.z + range; z++) {
                container(data, x, z);
            }
        }
        client.json.emit('map', { data: data })
    }

    function container(data, x, z) {
        var block = mapAt(x, z);
        if (block) {
            data.push({
                position: block.position,
                name: block.name,
                metadata: block.metadata
            });
        }

        if (!sentMap[x]) sentMap[x] = []
        sentMap[x][z] = true;
    }

    var prevPos;
    bot.on("respawn", () => {
        emitMapAll()
        prevPos = bot.entity.position.clone();
    })
    bot.on("move", () => {
        if (prevPos)
            if (bot.entity.position.distanceTo(prevPos) > 16.0) {
                emitMapAll()
            } else if (bot.entity.position.distanceTo(prevPos) > 0.0) {
                emitMapEdge()
            }
        prevPos = bot.entity.position.clone();
    })

    function emitMapEdge() {
        const range = 32;
        var me = bot.entity.position.floored();
        var data = [];
        var s1 = me.x - range;
        var s2 = me.x + range;
        var s3 = me.z - range;
        var s4 = me.z + range;
        for (var x = s1; x < me.x; x++) {
            if (sentMap[x] && sentMap[x][me.z])
                break;
            else
                for (var z = s3; z < s4; z++)
                    container(data, x, z)
        }
        for (var x = s2; x >= me.x; --x) {
            if (sentMap[x] && sentMap[x][me.z])
                break;
            else
                for (var z = s3; z < s4; z++)
                    container(data, x, z)
        }
        for (var z = s3; z < me.z; z++) {
            if (sentMap[me.x] && sentMap[me.x][z])
                break;
            else
                for (var x = s1; x < s2; x++)
                    container(data, x, z)
        }
        for (var z = s4; z >= me.z; --z) {
            if (sentMap[me.x] && sentMap[me.x][z])
                break;
            else
                for (var x = s1; x < s2; x++)
                    container(data, x, z)
        }

        if (data.length > 0) {
            client.json.emit('map', { data: data })
        } else if (Math.random() > 0.8) {
            client.json.emit('map', { data: data })
        }
    }
});

glob.event.on("log", (msg) => {
    io.emit('message', msg);
})

bot.on("move", () => {
    io.json.emit("myentity", bot.entity, glob.getState())
    if (Math.random() > 0.8)
        emitInventory()
})

bot.on("playerJoined", (player) => {
    io.json.emit('players', bot.players)
})
bot.on("playerLeft", (player) => {
    io.json.emit('players', bot.players)
})

bot.on("entitySpawn", (entity) => {
    io.json.emit('entityapper', entity)
    if (entity.username)
        io.json.emit('players', bot.players)
})
bot.on("entityMoved", (entity) => {
    io.json.emit('entity', entity)
})
bot.on("entityUpdate", (entity) => {
    io.json.emit('entity', entity)
})
bot.on("entityGone", (entity) => {
    io.json.emit('entitydisapper', entity)
})

bot.on('health', function () {
    emitVital();
});

bot.on('food', function () {
    emitVital();
});

function emitServer() {
    io.json.emit('server', {
        host: bot._client.socket._host,
        username: bot.username,
    })
    io.json.emit('players', bot.players)
    io.json.emit('flags', {
        isCloseDefenceMode: glob.isCloseDefenceMode,
        isSniperMode: glob.isSniperMode,
        isArrowDefenceMode: glob.isArrowDefenceMode,
        isCollisionalMode: glob.isCollisionalMode
    })
}

function emitVital() {
    io.json.emit('vital', {
        health: Math.round(bot.health),
        food: Math.round(bot.food)
    })
}

function emitInventory() {
    io.json.emit('inventory', {
        slots: bot.inventory.slots,
        hand: bot.quickBarSlot
    })
}

function mapAt(x, z) {
    var initialY = Math.floor(bot.entity.position.y) + 1;
    var initialblock = bot.blockAt(new Vec3(x, initialY + 1, z))
    if (!initialblock) return null;
    if (initialblock.boundingBox == 'empty') {
        for (var y = initialY; y >= initialY - 16 && y >= 1; y--) {
            var block = bot.blockAt(new Vec3(x, y, z))
            if (block && block.boundingBox != 'empty') {
                return block;
            }
        }
    } else {
        for (var y = initialY; y < initialY + 8; y++) {
            var block = bot.blockAt(new Vec3(x, y, z))
            if (block && block.boundingBox == 'empty') {
                return bot.blockAt(new Vec3(x, y - 1, z));
            }
        }
    }
    return null;
}

http.listen(PORT, function () {
    console.log('server listening. Port:' + PORT);
});
