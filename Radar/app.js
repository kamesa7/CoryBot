io = io();
entities = [];
players = [];
me = null;
prop = null;
map = [];
logmode = false;
$(function () {
    const pointVW = 0.5;//%
    const radarRange = 48;//blocks
    const blockRange = 32;//blocks
    const canvasSize = 400;//pixel
    const grid = canvasSize / radarRange / 2;

    $('#message_form').submit(function (e) {
        e.preventDefault()
        emitMessage()
    })
    $('#button_msg').click(emitMessage)
    function emitMessage() {
        let msg = $('#input_msg').val()
        io.emit('message', msg);
        if (logmode) console.log("emit " + msg)
        $('#input_msg').val('');
    }

    $('#refresh').click(function () {
        console.log("refresh")
        $('.entity').remove();
        entities = [];
        players = [];
        map = [];
        io.emit('server');
        drawAllEntity();
    })

    $('#stopmove').click(function () {
        io.emit('stopmove');
    })

    $('#dismount').click(function () {
        io.emit('dismount');
    })

    $('#stopstate').click(function () {
        io.emit('stopstate');
    })

    $('#tossitem').click(function () {
        io.emit('tossitem');
    })

    $('#actitem').click(function () {
        io.emit('actitem');
    })

    $('#deactitem').click(function () {
        io.emit('deactitem');
    })

    $('.checkbox-input').click(function () {
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

    $('#lookat').click(function () {
        io.emit('lookat', $('#target_entity').val());
    })

    function emitFlags() {
        var flags = {
            isCloseDefenceMode: $('#is-close-defence-mode').prop("checked"),
            isSniperMode: $('#is-sniper-mode').prop("checked"),
            isArrowDefenceMode: $('#is-arrow-defence-mode').prop("checked"),
            isCollisionalMode: $('#is-collisional-mode').prop("checked"),
            isInterestMode: $('#is-interest-mode').prop("checked"),
            isIgnoreMode: $('#is-ignore-mode').prop("checked"),
        }
        io.json.emit('flags', flags)
    }

    io.on('flags', function (flags) {
        console.log("on flags")
        $('#is-close-defence-mode').prop("checked", flags.isCloseDefenceMode)
        $('#is-sniper-mode').prop("checked", flags.isSniperMode)
        $('#is-arrow-defence-mode').prop("checked", flags.isArrowDefenceMode)
        $('#is-collisional-mode').prop("checked", flags.isCollisionalMode)
        $('#is-interest-mode').prop("checked", flags.isInterestMode)
        $('#is-ignore-mode').prop("checked", flags.isIgnoreMode)
    });

    io.on('server', function (msg) {
        console.log("on server")
        prop = msg;
        $('#host').text(msg.host + "   " + msg.username)
    })

    io.on('message', function (msg) {
        if (logmode) console.log("on message")
        drawMessage(msg)
    });

    io.on('vital', function (msg) {
        if (logmode) console.log("on vital")
        $('#vital').html('<img src="misc/Health_' + Math.min(msg.health, 20) + '.png"> <img src="misc/Hunger_' + Math.min(msg.food, 20) + '.png">')
    })

    io.on('myentity', function (player, state) {
        // if(logmode) console.log("on me")
        if (me) {
            if (me.position.x != player.position.x || me.position.z != player.position.z) {
                drawAllEntity();
            }
            var hand;
            if (me.heldItem)
                hand = "[hand] " + me.heldItem.displayName
            else
                hand = "[hand] null"
            if (hand != $('#hand').text())
                $('#hand').text(hand)
            var pos = "[pos] " + Math.round(me.position.x) + ", " + Math.round(me.position.y) + ", " + Math.round(me.position.z);
            if (pos != $('#position').text())
                $('#position').text(pos)
            if (("[state] " + state) != $('#state').text())
                $('#state').text("[state] " + state)
            me = player;
        } else {//init
            if (logmode) console.log("on init myentity")
            me = player;
            io.emit('server');
            drawAllEntity();
        }
    });

    io.on('inventory', function (inventory) {
        if (logmode) console.log("on inventory")
        drawInventory(inventory)
    });

    io.on('players', function (newplayers) {
        if (logmode) console.log("on players")
        players = newplayers;
        if (prop == null) return;
        $("#playerlist").empty();
        Object.keys(players).forEach(function (key) {
            const player = players[key]
            $("#playerlist").append('<span id="player' + player.username + '" class="playerlist-element"><img class="playerlistimg" ' + getPlayerImageSrc(player.uuid) + '> ' + player.username + '</span> ')
            $('#player' + player.username).click(function () {
                if (player.entity)
                    $('#target_entity').val(player.entity.id);
                else
                    $('#target_entity').val("");
                $('#target_entity_name').text(player.username)
            })
        });
    });

    io.on('entityapper', function (entity) {
        if (logmode) console.log("on appear")
        entities.push(entity);
        drawEntity(entity);
    });

    io.on('entity', function (entity) {
        // if(logmode) console.log("on entity")
        entities = entities.filter(element => element.id !== entity.id);
        entities.push(entity);
        drawEntity(entity)
    });

    io.on('entitydisapper', function (entity) {
        if (logmode) console.log("on disapper")
        entities = entities.filter(element => element.id !== entity.id);
        $('#entity' + entity.id).remove();
    });

    io.on('map', function (chunk) {
        if (logmode) console.log("on map")
        for (var i = 0; i < chunk.data.length; i++) {
            var block = chunk.data[i];
            if (!block) continue;
            if (!map[block.position.x])
                map[block.position.x] = []
            map[block.position.x][block.position.z] = block;
        }
        drawAllBlock()
    })

    io.on('newblock', function (chunk) {
        if (logmode) console.log("on newblock")
        for (var i = 0; i < chunk.data.length; i++) {
            var block = chunk.data[i];
            if (!block) continue;
            if (!map[block.position.x])
                map[block.position.x] = []
            map[block.position.x][block.position.z] = block;
        }
    })

    function drawMessage(msg) {
        $('#messages').append('<LI></LI>');
        $('#messages > LI:last').append(msg);
        if ($('.chat').scrollTop() + $('.chat').height() + 100 >= $('#messages').height())
            $('.chat').scrollTop($('#messages').height());
    }

    function drawInventory(inventory) {
        const START = 9;
        var QUICK = 36 + inventory.hand;
        var slots = inventory.slots;

        function table(start, end) {
            var table = '<tbody>';
            var row = '<tr>';
            for (var i = start; i < end; i++) {
                var name = "";
                if (slots[i]) {
                    let item = slots[i];
                    let dispname = item.displayName.substring(0, 13)
                    let metadata = (item.metadata == 0) ? ("") : ("::" + item.metadata)
                    let count = (item.count == 1) ? ("") : (" x" + item.count)
                    name += dispname + metadata + count
                }
                if (i == QUICK) {
                    row += '<td class="quickbar" id="slot' + i + '">' + name + '</td>'
                } else if (5 <= i && i < START) {
                    row += '<td class="armor" id="slot' + i + '">' + name + '</td>'
                } else {
                    row += '<td id="slot' + i + '">' + name + '</td>'
                }

                if ((i - START + 1) % 9 == 0) {
                    row += '</tr>'
                    table += row;
                    row = '<tr>'
                }
            }
            table += '</tbody>'
            return table;
        }

        var main_table = table(START, 46)
        if (main_table != $("#slot").html()) {
            $("#slot").html(main_table);
            for (var i = START; i < 46; i++) {
                const slot = i;
                $("#slot" + slot).click(function () {
                    io.emit("equip", slot);
                });
            }
        }

        var other_table = table(0, START)
        if (other_table != $("#other_slot").html()) {
            $("#other_slot").html(other_table);
            for (var i = 0; i < START; i++) {
                const slot = i;
                $("#slot" + slot).click(function () {
                    io.emit("equip", slot);
                });
            }
        }
    }

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
        if (Math.sqrt((entity.position.x - me.position.x) * (entity.position.x - me.position.x) + (entity.position.z - me.position.z) * (entity.position.z - me.position.z)) > blockRange * 2) return;
        var px = (entity.position.x - me.position.x) / radarRange * 50 + 50 - pointVW;
        var pz = (entity.position.z - me.position.z) / radarRange * 50 + 50 - pointVW;
        var target = '#entity' + entity.id;
        if ($(target).length) {
            $(target).css("left", px + '%')
            $(target).css("top", pz + '%')
        } else {
            var style = 'style="left: ' + px + '%; top: ' + pz + '%;"'
            if (entity.type == "player") {
                $('.radar').append('<div class="entity player" id="entity' + entity.id + '" ' + style + '>')
                $(target).html('<img class="playerimg" ' + getPlayerImageSrc((players[entity.username] ? players[entity.username].uuid : entity.uuid)) + '></div>')

            } else if ((entity.type == "mob" && entity.kind != "Projectiles" && entity.kind != "Immobile") || (entity.type == "object" && entity.kind == "Vehicles")) {
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
                if (entity.username)
                    $('#target_entity_name').text(entity.username)
                else if (entity.name)
                    $('#target_entity_name').text(entity.name)
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

    (function imginit() {
        for (let i = 0; i < img.length; i++) {
            blockimg.img[img[i]] = new Image();
            blockimg.img[img[i]].src = "blocks/" + img[i] + ".png";
        }
        for (let i = 0; i < colorimg.length; i++) {
            blockimg.colorimg[colorimg[i]] = [];
            for (let j = 0; j < 16; j++) {
                blockimg.colorimg[colorimg[i]][j] = new Image();
                blockimg.colorimg[colorimg[i]][j].src = "blocks/color/" + colorimg[i] + " (" + (j + 1) + ").png";
            }
        }
    }());

    function drawAllBlock() {
        if (me == null) return;
        var ctx = $("#canvas")[0].getContext('2d')
        ctx.strokeStyle = 'rgb(128, 100, 162)'

        ctx.clearRect(0, 0, canvasSize, canvasSize)
        ctx.strokeRect(canvasSize / 2 - blockRange * grid, canvasSize / 2 - blockRange * grid, blockRange * 2 * grid, blockRange * 2 * grid)

        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, 16 * grid, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, 32 * grid, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, 48 * grid, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, 64 * grid, 0, Math.PI * 2, false);
        ctx.stroke();

        for (var x = Math.floor(me.position.x - blockRange); x < me.position.x + blockRange; x++) {
            for (var z = Math.floor(me.position.z - blockRange); z < me.position.z + blockRange; z++) {
                if (map[x] && map[x][z])
                    drawBlock(map[x][z]);
            }
        }

        function drawBlock(block) {
            if (me == null) return;
            var canvas = $("#canvas")[0]

            /* 2Dコンテキスト */
            var ctx = canvas.getContext('2d');

            var px = (block.position.x - me.position.x) * grid + canvasSize / 2
            var pz = (block.position.z - me.position.z) * grid + canvasSize / 2
            var name = block.name;

            for (var i = 0; i < colorimg.length; i++) {
                if (name.match(new RegExp(colorimg[i]))) {
                    ctx.drawImage(blockimg.colorimg[colorimg[i]][block.metadata], px, pz, grid, grid)
                    return;
                }
            }
            for (var i = 0; i < img.length; i++) {
                if (name.match(new RegExp(img[i]))) {
                    ctx.drawImage(blockimg.img[img[i]], px, pz, grid, grid)
                    return;
                }
            }
        }
    }

    function getPlayerImageSrc(uuid) {
        return 'src="https://crafatar.com/avatars/' + uuid + '?size=16.png"'
    }

});
