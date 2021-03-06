glob.queue = new bucketsJs.Queue();

glob.queueState = queueState;
glob.queueOnceState = queueOnceState;
glob.changeState = changeState;
glob.finishState = finishState;
glob.tryState = tryState;
glob.letState = letState;
glob.getState = getState;
glob.doNothing = doNothing;

var queue = glob.queue;
var state = "";

class State {
    constructor(str, cb, ...args) {
        this.state = str;
        this.cb = cb;
        this.args = args;
    }
}

/**
 * if the state is not in queue, call queueState
 * @param {*} str 
 * @param {*} cb 
 * @param  {...any} args 
 */
function queueOnceState(str, cb, ...args) {
    if (queue.contains(new State(str, cb, ...args), (a, b) => a.state == b.state ? true : false))
        return false
    return queueState(str, cb, ...args)
}

/**
 * if do nothing, do it. or queue it
 * @param {*} str 
 * @param {*} cb 
 * @param  {...any} args 
 */
function queueState(str, cb, ...args) {
    if (state == "") {
        state = str
        cb(...args);
        return true
    } else {
        queue.add(new State(str, cb, ...args))
        return false
    }
}

/**
 * if do nothing
 * @param {*} str 
 * @param {*} cb 
 * @param  {...any} args 
 */
function tryState(str, cb, ...args) {
    if (state == "") {
        state = str
        cb(...args);
        return true
    } else {
        return false
    }
}

/**
 * if do nothing or doing the state
 * @param {*} str 
 * @param {*} cb 
 * @param  {...any} args 
 */
function letState(str, cb, ...args) {
    if (state == "" || state == str) {
        state = str
        cb(...args);
        return true
    } else {
        return false
    }
}

/**
 * force change state
 * @param {*} str 
 */
function changeState(str) {
    var ret = state
    state = str;
    return ret;
}

/**
 * finish state or finish specific state
 * @param {*} str 
 */
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