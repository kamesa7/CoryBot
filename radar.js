var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const PORT = 7000;

app.use(express.static(__dirname + "/Radar"));

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/Radar/index.html");
});

io.on('connection', function (client) {
    client.on('message', function (msg) {
        bot.safechat(msg);
    });
    client.on('server', function () {
        client.json.emit('server', {
            host: bot._client.socket._host,
            username: bot.username,
        })
    });
    client.on('map', function (x, z) {
        client.json.emit('map', mapAt(x, z))
    });
});

glob.event.on("log", (msg) => {
    io.emit('message', msg);
})

bot.on("move", () => {
    io.json.emit("myentity", bot.entity)
})

bot.on("entitySpawn", (entity) => {
    io.json.emit('entityapper', entity)
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
    for (var y = bot.entity.position.y + 2; y >= 1; y--) {
        var block = bot.blockAt(new Vec3(x, y, z))
        if (block.id != 0 && block.boundingBox != 'empty')
            return block
    }
    return null;
}

http.listen(PORT, function () {
    console.log('server listening. Port:' + PORT);
});
