io = io();
entities = [];
me = null;
prop = null;
$(function () {
    var top = $(".radar").offset().top;
    var left = $(".radar").offset().left;
    var innerWidth = $(".radar").width()
    var innerHeight = $(".radar").height()

    function update() {
        top = $(".radar").offset().top;
        left = $(".radar").offset().left;
        innerWidth = $(".radar").width()
        innerHeight = $(".radar").height()
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
        $('.info').prepend($('<p>').text(msg.host + "   " + msg.username))
    })
    io.emit('server');

    io.on('message', function (msg) {
        $('#messages').append($('<LI>').text(msg));
        $('.chat').scrollTop($('#messages').height());
    });

    io.on('vital', function (msg) {
        $('#vital').remove();
        $('.myinfo').append("<p id='vital'>[health] " + msg.health + " [food] " + msg.food + "</p>")
    })

    io.on('player', function (player) {
        if (me && (me.position.x != player.position.x || me.position.z != player.position.z)) {
            drawAll();
        }
        me = player;
        $('#hand').remove()
        if(me.heldItem)
            $('.myinfo').append("<p id='hand'>[hand] " + me.heldItem.displayName + "</p>")
        else
            $('.myinfo').append("<p id='hand'>[hand] " + null + "</p>")

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

    const point = 8;
    const rate = 3;
    function draw(entity) {
        if (me == null) return;
        $('#entity' + entity.id).remove();
        var px = (entity.position.x - me.position.x) * rate + innerWidth / 2 - point / 2 + left;
        var pz = (entity.position.z - me.position.z) * rate + innerHeight / 2 - point / 2 + top;
        $('.radar').append('<div class="entity" id="entity' + entity.id + '" style="left: ' + px + 'px; top: ' + pz + 'px;"></div>')
    }

    function drawAll() {
        if (me == null) return;
        $('.entity').remove();
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var px = (entity.position.x - me.position.x) * rate + innerWidth / 2 - point / 2 + left;
            var pz = (entity.position.z - me.position.z) * rate + innerHeight / 2 - point / 2 + top;
            $('.radar').append('<div class="entity" id="entity' + entity.id + '" style="left: ' + px + 'px; top: ' + pz + 'px;"></div>')
        }
    }
});
