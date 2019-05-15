io = io();
entities = [];
me = null;
prop = null;
map = [];
img = {};
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
        rate = innerWidth * 0.01;
    }

    update();
    setInterval(update, 100);

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
        $('#vital').html('<img src="misc/Health_' + Math.min(msg.health,20) + '.png"> <img src="misc/Hunger_' + Math.min(msg.food,20) + '.png">')
    })

    io.on('myentity', function (player) {
        if (me && (me.position.x != player.position.x || me.position.z != player.position.z)) {
            drawAll();
            $('#position').text("[pos] " + Math.round(me.position.x) + ", " + Math.round(me.position.y) + ", " + Math.round(me.position.z))
        } else if(!me){//init
            $('#position').text("[pos] " + Math.round(player.position.x) + ", " + Math.round(player.position.y) + ", " + Math.round(player.position.z))
        }
        me = player;
        draw(me)
        if (me.heldItem)
            $('#hand').text("[hand] " + me.heldItem.displayName)
        else
            $('#hand').text("[hand] null")
    });

    io.on('entityapper', function (entity) {
        entities.push(entity);
        draw(entity);
    });

    io.on('entity', function (entity) {
        entities = entities.filter(element => element.id !== entity.id);
        entities.push(entity);
        draw(entity)
    });

    io.on('entitydisapper', function (entity) {
        entities = entities.filter(element => element.id !== entity.id);
        $('#entity' + entity.id).remove();
    });

    function draw(entity) {
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

    function drawAll() {
        if (me == null) return;
        $('.entity').remove();
        for (var i = 0; i < entities.length; i++) {
            draw(entities[i]);
        }
    }
});
