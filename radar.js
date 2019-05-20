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
    emitServer()

    client.on('message', function (msg) {
        bot.safechat(msg);
    });
    client.on('server', function () {
        emitServer();
    });
    client.on('mapall', function () {
        emitMapAll();
    });
    client.on('mapedge', function (x, z) {
        emitMapEdge(x, z);
    });
    client.on('stopmove', function () {
        glob.stopMoving()
    });
    client.on('dismount', function () {
        bot.dismount();
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
            bot.attack(bot.entities[ID])
    });


    function emitServer() {
        client.json.emit('server', {
            host: bot._client.socket._host,
            username: bot.username,
        })
        client.json.emit('players', bot.players)
        bodyManage();
    }

    function emitMapAll() {
        const range = 48;
        var me = bot.entity;
        var data = [];
        var i = 0;
        for (var x = me.position.x - range; x < me.position.x + range; x++) {
            for (var z = me.position.z - range; z < me.position.z + range; z++) {
                var block = mapAt(x, z);
                if (block) {
                    data[i++] = {
                        position: block.position,
                        name: block.name,
                        metadata: block.metadata
                    };
                }
            }
        }
        client.json.emit('map', { data: data })
    }

    function emitMapEdge(dx, dz) {
        const range = 48;
        var me = bot.entity;
        var data = [];
        var i = 0;
        var block;
        for (var x = me.position.x - range; x < me.position.x + range; x++) {
            block = mapAt(x, me.position.z + range);
            if (block) {
                data[i++] = {
                    position: block.position,
                    name: block.name,
                    metadata: block.metadata
                };
            }
            block = mapAt(x, me.position.z - range);
            if (block) {
                data[i++] = {
                    position: block.position,
                    name: block.name,
                    metadata: block.metadata
                };
            }
        }
        for (var z = me.position.z - range; z < me.position.z + range; z++) {
            block = mapAt(me.position.x + range, z);
            if (block) {
                data[i++] = {
                    position: block.position,
                    name: block.name,
                    metadata: block.metadata
                };
            }
            block = mapAt(me.position.x - range, z);
            if (block) {
                data[i++] = {
                    position: block.position,
                    name: block.name,
                    metadata: block.metadata
                };
            }
        }
        client.json.emit('map', { data: data })
    }
});

glob.event.on("log", (msg) => {
    io.emit('message', msg);
})

bot.on("move", () => {
    io.json.emit("myentity", bot.entity, glob.getState())
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
    bodyManage();
});

bot.on('food', function () {
    bodyManage();
});

function bodyManage() {
    io.json.emit('vital', {
        health: Math.round(bot.health),
        food: Math.round(bot.food)
    })
}

function mapAt(x, z) {
    var initialY = Math.floor(bot.entity.position.y) + 1;
    var initialblock = bot.blockAt(new Vec3(x, initialY, z))
    if (!initialblock) return null;
    if (initialblock.boundingBox != 'empty') return null;
    for (var y = initialY; y >= initialY - 16 && y >= 1; y--) {
        var block = bot.blockAt(new Vec3(x, y, z))
        if (block.boundingBox != 'empty') {
            return block;
        }
    }
    return null;
}

http.listen(PORT, function () {
    console.log('server listening. Port:' + PORT);
});
