glob.queue = new bucketsJs.Queue();

glob.queueState = queueState;
glob.queueOnceState = queueOnceState;
glob.changeState = changeState;
glob.finishState = finishState;
glob.tryState = tryState;
glob.getState = getState;
glob.doNothing = doNothing;

var queue = glob.queue;
var state = "";

function queueOnceState(str, cb, ...args) {
    if (queue.contains({ state: state }, (a, b) => a.str == b.str ? true : false))
        return false
    return queueState(str, cb, ...args)
}

function queueState(str, cb, ...args) {
    if (state == "") {
        state = str
        cb(...args);
        return true
    } else {
        queue.add({
            state: state,
            cb: cb,
            args:args
        })
        return false
    }
}

function tryState(str, cb, ...args) {
    if (state == "") {
        state = str
        cb(...args);
        return true
    } else {
        return false
    }
}

function changeState(str) {
    var ret = state
    state = str;
    return ret;
}

function finishState(str = "") {
    if (str != "" && state != str)
        return;
    if (queue.isEmpty()) {
        state = ""
        return;
    }
    var ret = state
    var q = queue.dequeue()
    state = q.state
    q.cb(...q.args)
    return ret;
}

function getState() {
    return state;
}

function doNothing() {
    return state == "" ? true : false;
}

bot.on('death', () => {
    state = "";
    queue.clear();
});