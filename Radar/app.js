io = io();
entities = [];
players = [];
me = null;
prop = null;
map = [];
$(function () {
    const pointVW = 0.5;//view width
    const radarSize = 20;//view width / 2
    const radarRange = 48;//blocks
    const blockRange = 32;//blocks
    const canvasSize = 400;//pixel

    $('#message_form').submit(function () {
        io.emit('message', $('#input_msg').val());
        $('#input_msg').val('');
    });

    $('#refresh').click(function () {
        io.emit('server');
        drawAllEntity();
    })

    $('#stopmove').click(function () {
        io.emit('stopmove');
    })

    $('#dismount').click(function () {
        io.emit('dismount');
    })

    $('#isclosedefencemode').click(function () {
        emitFlags();
    })

    $('#issnipermode').click(function () {
        emitFlags();
    })

    $('#isarrowdefencemode').click(function () {
        emitFlags();
    })

    $('#goto').click(function () {
        io.emit('goto', $('#target_entity').val());
    })

    $('#follow').click(function () {
        io.emit('follow', $('#target_entity').val());
    })

    $('#chase').click(function () {
        io.emit('chase', $('#target_entity').val());
    })

    $('#mount').click(function () {
        io.emit('mount', $('#target_entity').val());
    })

    $('#punch').click(function () {
        io.emit('punch', $('#target_entity').val());
    })

    $('#shoot').click(function () {
        io.emit('shoot', $('#target_entity').val());
    })


    io.on('server', function (msg) {
        prop = msg;
        $('#host').text(msg.host + "   " + msg.username)
    })

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
        $('#vital').html('<img src="misc/Health_' + Math.min(msg.health, 20) + '.png"> <img src="misc/Hunger_' + Math.min(msg.food, 20) + '.png">')
    })

    io.on('myentity', function (player, state) {
        if (me) {
            if (me.position.x != player.position.x || me.position.z != player.position.z) {
                drawAllEntity();
            }
            if (me.heldItem != player.heldItem) {
                if (me.heldItem)
                    $('#hand').text("[hand] " + me.heldItem.displayName)
                else
                    $('#hand').text("[hand] null")
            }
            $('#position').text("[pos] " + Math.round(me.position.x) + ", " + Math.round(me.position.y) + ", " + Math.round(me.position.z))
            $('#state').text("[state] " + state)
            me = player;
        } else {//init            
            me = player;
            io.emit('server');
            drawAllEntity();
        }
    });

    function emitFlags() {
        var flags = {
            isCloseDefenceMode: $('#isclosedefencemode').prop("checked"),
            isSniperMode: $('#issnipermode').prop("checked"),
            isArrowDefenceMode: $('#isarrowdefencemode').prop("checked")
        }
        io.json.emit('flags', flags)
    }

    io.on('flags', function (flags) {
        $('#isclosedefencemode').prop("checked", flags.isCloseDefenceMode)
        $('#issnipermode').prop("checked", flags.isSniperMode)
        $('#isarrowdefencemode').prop("checked", flags.isArrowDefenceMode)
    });

    io.on('players', function (newplayers) {
        players = newplayers;
        if (prop == null) return;
        $("#playerlist").empty();
        Object.keys(players).forEach(function (key) {
            var name = players[key].username;
            $("#playerlist").append('<span id="player' + name + '"><img class="playerlistimg" src="http://' + prop.host + ':8123/tiles/faces/16x16/' + name + '.png"> ' + name + '</span> ')
            $('#player' + players[key].username).click(function () {
                if (players[key].entity)
                    $('#target_entity').val(players[key].entity.id);
                else
                    $('#target_entity').val("");
            })
        });
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

    function drawAllEntity() {
        if (me == null) return;
        for (var i = 0; i < entities.length; i++) {
            drawEntity(entities[i]);
        }
        drawEntity(me)
    }

    function drawEntity(entity) {
        if (me == null) return;
        if (prop == null) return;
        var px = (entity.position.x - me.position.x) / radarRange * radarSize + radarSize - pointVW;
        var pz = (entity.position.z - me.position.z) / radarRange * radarSize + radarSize - pointVW;
        var target = '#entity' + entity.id;
        if ($(target).length) {
            $(target).css("left", px + 'vw')
            $(target).css("top", pz + 'vw')
        } else {
            var style = 'style="left: ' + px + 'vw; top: ' + pz + 'vw;"'
            if (entity.type == "player") {
                $('.radar').append('<div class="entity player" id="entity' + entity.id + '" ' + style + '>')
                $(target).html('<img class="playerimg" src="http://' + prop.host + ':8123/tiles/faces/16x16/' + entity.username + '.png"></div>')

            } else if (entity.type == "mob" || (entity.type == "object" && entity.kind == "Vehicles")) {
                $('.radar').append('<div class="entity mob" id="entity' + entity.id + '" ' + style + '></div>')

                if (entity.type == "mob")
                    $(target).html('<img class="entityimg" src="mobs/16x16_' + entity.name + '.png"></div>')
                else if (entity.name.match(/minecart/))
                    $(target).html('<img class="entityimg" src="mobs/minecart.png"></div>')
                else if (entity.name.match(/boat/))
                    $(target).html('<img class="entityimg" src="mobs/boat.png"></div>')

            } else {
                $('.radar').append('<div class="entity other" id="entity' + entity.id + '" ' + style + '></div>')

            }

            $(target).click(function () {
                $('#target_entity').val(entity.id);
            })
        }
    }

    const colorimg = [
        "concrete", "terracotta", "stained_hardened_clay", "wool"
    ]

    const img = [
        "beacon", "shulker", "door", "farm", "cactus",
        "glowstone", "lamp", "lantern",
        "brick", "glass",
        "ice", "snow", "nether", "end",
        "ore", "diamond", "gold", "iron", "emerald", "lapis", "redstone", "quartz",
        "sandstone", "sand",
        "log", "planks", "slab",
        "stone", "grass", "dirt", "gravel", "leaves", "hardened_clay", "clay", "bedrock",
        "lava", "water"
    ]
    blockimg = { img: {}, colorimg: {} };
    for (var i = 0; i < img.length; i++) {
        blockimg.img[img[i]] = new Image();
        blockimg.img[img[i]].src = "blocks/" + img[i] + ".png";
    }
    for (var i = 0; i < colorimg.length; i++) {
        blockimg.colorimg[colorimg[i]] = [];
        for (var j = 0; j < 16; j++) {
            blockimg.colorimg[colorimg[i]][j] = new Image();
            blockimg.colorimg[colorimg[i]][j].src = "blocks/color/" + colorimg[i] + " (" + (j + 1) + ").png";
        }
    }

    function drawAllBlock() {
        if (me == null) return;
        $("#canvas")[0].getContext('2d').clearRect(0, 0, canvasSize, canvasSize)
        for (var x = Math.floor(me.position.x - blockRange); x < me.position.x + blockRange; x++) {
            for (var z = Math.floor(me.position.z - blockRange); z < me.position.z + blockRange; z++) {
                if (map[x] && map[x][z])
                    drawBlock(map[x][z]);
            }
        }
    }

    function drawBlock(block) {
        if (me == null) return;
        var canvas = $("#canvas")[0]

        /* 2Dコンテキスト */
        var ctx = canvas.getContext('2d');

        var grid = canvasSize / radarRange / 2;
        var px = (block.position.x - me.position.x) * grid + canvasSize / 2
        var pz = (block.position.z - me.position.z) * grid + canvasSize / 2
        var name = block.name;

        for (var i = 0; i < img.length; i++) {
            if (name.match(new RegExp(img[i]))) {
                ctx.drawImage(blockimg.img[img[i]], px, pz, grid, grid)
                return;
            }
        }
        for (var i = 0; i < colorimg.length; i++) {
            if (name.match(new RegExp(colorimg[i]))) {
                ctx.drawImage(blockimg.colorimg[colorimg[i]][block.metadata], px, pz, grid, grid)
                return;
            }
        }
    }
});
