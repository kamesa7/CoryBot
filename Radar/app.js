io = io();
entities = [];
me = null;
prop = null;
map = [];
prevmappos = null;
$(function () {
    var top = $(".radar").offset().top;
    var left = $(".radar").offset().left;
    var innerWidth = $(".radar").width()
    var innerHeight = $(".radar").height()

    const point = 8;
    var rate = innerWidth * 0.01;

    function update() {
        top = $(".radar").offset().top;
        left = $(".radar").offset().left;
        innerWidth = $(".radar").width()
        innerHeight = $(".radar").height()
        var nextrate = innerWidth * 0.01;
        if (rate != nextrate) {
            $(".block").css("width", rate + 'px')
            $(".block").css("height", rate + 'px')
            drawAllEntity()
            drawAllBlock()
        }
        rate = nextrate;
    }

    update();
    setInterval(update, 1000);

    $('#message_form').submit(function () {
        io.emit('message', $('#input_msg').val());
        $('#input_msg').val('');
        return false;
    });

    io.on('server', function (msg) {
        prop = msg;
        $('#host').text(msg.host + "   " + msg.username)
    })
    io.emit('server');

    io.on('message', function (msg) {
        msg = msg.replace(/</g, '[')
        msg = msg.replace(/>/g, ']')
        const codes = [
            '§0', '§1', '§2',
            '§3', '§4', '§5',
            '§6', '§7', '§8',
            '§9', '§a', '§b',
            '§c', '§d', '§e',
            '§f', '§l', '§o',
            '§n', '§m', '§k'
        ]
        for (let i in codes) {
            var k = codes[i];
            msg = msg.replace(new RegExp(k, 'g'), '<span class="' + k + '">')
        }
        var cnt = 0;
        for (var i = 0; i < msg.length; i++) {
            if (msg[i] == '§') {
                if (msg[i + 1] == 'r') {
                    var endiv = "";
                    for (var j = 0; j < cnt; j++)
                        endiv += "</span>"
                    msg = msg.replace(/§r/, endiv)
                    cnt = 0;
                } else {
                    cnt++;
                }
            }
        }
        $('#messages').append('<LI></LI>');
        $('#messages > LI:last').append(msg);
        $('.chat').scrollTop($('#messages').height());
    });

    io.on('vital', function (msg) {
        // $('#vital').text("[health] " + msg.health + " [food] " + msg.food)
        $('#vital').html('<img src="misc/Health_' + Math.min(msg.health, 20) + '.png"> <img src="misc/Hunger_' + Math.min(msg.food, 20) + '.png">')
    })

    io.on('myentity', function (player) {
        if (me) {
            if (me.position.x != player.position.x || me.position.z != player.position.z) {
                if (Math.abs(player.position.x - me.position.x) + Math.abs(player.position.z - me.position.z) >= 16) {
                    removeAll();
                }
                drawAllEntity();
                $('#position').text("[pos] " + Math.round(me.position.x) + ", " + Math.round(me.position.y) + ", " + Math.round(me.position.z))
                if (Math.abs(prevmappos.x - me.position.x) + Math.abs(prevmappos.z - me.position.z) > 0.6) {
                    io.emit("mapedge");
                    prevmappos = me.position;
                }
            }
            if (me.heldItem != player.heldItem) {
                if (me.heldItem)
                    $('#hand').text("[hand] " + me.heldItem.displayName)
                else
                    $('#hand').text("[hand] null")
            }
            me = player;
        } else {//init            
            me = player;
            $('#position').text("[pos] " + Math.round(me.position.x) + ", " + Math.round(me.position.y) + ", " + Math.round(me.position.z))
            if (me.heldItem)
                $('#hand').text("[hand] " + me.heldItem.displayName)
            else
                $('#hand').text("[hand] null")
            drawAllEntity();
            prevmappos = me.position;
            io.emit("mapall");
        }
    });

    io.on('entityapper', function (entity) {
        entities.push(entity);
        drawEntity(entity);
    });

    io.on('entity', function (entity) {
        entities = entities.filter(element => element.id !== entity.id);
        entities.push(entity);
        drawEntity(entity)
    });

    io.on('entitydisapper', function (entity) {
        entities = entities.filter(element => element.id !== entity.id);
        $('#entity' + entity.id).remove();
    });

    io.on('map', function (chunk) {
        for (var i = 0; i < chunk.data.length; i++) {
            var block = chunk.data[i];
            if (!block) continue;
            if (!map[block.position.x])
                map[block.position.x] = []
            map[block.position.x][block.position.z] = block;
        }
        drawAllBlock()
    })

    function drawEntity(entity) {
        if (me == null) return;
        if (prop == null) return;
        var px = (entity.position.x - me.position.x) * rate + innerWidth / 2 - point / 2 + left;
        var pz = (entity.position.z - me.position.z) * rate + innerHeight / 2 - point / 2 + top;
        var target = '#entity' + entity.id;
        if ($(target).length) {
            $(target).css("left", px + 'px')
            $(target).css("top", pz + 'px')
        } else {
            $('.radar').append('<div class="entity" id="entity' + entity.id + '" style="left: ' + px + 'px; top: ' + pz + 'px;"></div>')
            if (entity.type == "player")
                $(target).html('<img class="playerimg" src="http://' + prop.host + ':8123/tiles/faces/16x16/' + entity.username + '.png"></div>')
            else if (entity.type == "mob" && entity.name) {
                var name = entity.name;
                $(target).html('<img class="entityimg" src="mobs/16x16_' + name + '.png"></div>')
            }
        }
    }

    function drawAllEntity() {
        if (me == null) return;
        // $('.entity').remove();
        for (var i = 0; i < entities.length; i++) {
            drawEntity(entities[i]);
        }
        drawEntity(me)
    }

    function drawAllBlock() {
        if (me == null) return;
        // $('.entity').remove();
        const range = 48;
        for (var x = Math.floor(me.position.x - range); x < me.position.x + range; x++) {
            for (var z = Math.floor(me.position.z - range); z < me.position.z + range; z++) {
                if (map[x] && map[x][z])
                    drawBlock(map[x][z]);
            }
        }
    }

    function drawBlock(block) {
        if (me == null) return;
        var px = (block.position.x - me.position.x) * rate + innerWidth / 2 - point / 2 + left;
        var pz = (block.position.z - me.position.z) * rate + innerHeight / 2 - point / 2 + top;
        var target = '#block' + block.position.x + 'x' + block.position.z + 'z';
        if ($(target).length) {
            $(target).css("left", px + 'px')
            $(target).css("top", pz + 'px')
        } else {
            var name = block.name;
            const img = [
                "beacon", "shulker", "door", "farm", "cactus",
                "glowstone", "lamp", "lantern",
                "concrete", "terracotta", "brick", "glass", "hardened_clay", "wool",
                "ice", "snow", "nether", "end",
                "ore", "diamond", "gold", "iron", "emerald", "lapis", "redstone", "quartz",
                "sandstone", "sand",
                "log", "planks",
                "stone", "grass", "dirt", "gravel", "leaves", "clay",
                "lava", "water"
            ]
            var src = ""
            for (var i = 0; i < img.length; i++) {
                if (name.match(new RegExp(img[i]))) {
                    src = img[i];
                    break;
                }
            }
            if (src != "") {
                $('.radar').prepend('<img class="block" id="block' + block.position.x + 'x' + block.position.z + 'z"'
                    + ' src="blocks/' + src + '.png"'
                    + ' style="left: ' + px + 'px; top: ' + pz + 'px; width:' + rate + 'px; height:' + rate + 'px"></div>')
            }
        }
    }

    function removeAll() {
        $('.entity').remove()
        $('.block').remove()
    }
});
