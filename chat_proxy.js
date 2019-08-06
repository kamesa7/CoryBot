console.log("CHAT PROXY send:" + glob.CHATPROXY_SEND + " read:" + glob.CHATPROXY_READ)

const FileName = "chat_cache.json"
jsonfile.writeFile(FileName, {
    elements: [
        { pid: process.pid, time: getTime(), chat: "I joined the game" }
    ]
}, undefined, () => {

    bot.on('end', () => {
        sendMessage("I left the game")
    });

    bot.on("playerJoined", (player) => {
        sendMessage(player.username + ": joined the game")
    })
    bot.on("playerLeft", (player) => {
        sendMessage(player.username + ": left the game")
    })

    bot.on("chat", function (username, message) {
        if (username == "Super_AI") return
        if (bot.username === username) return

        sendMessage("{" + username + "} " + message)
    })

    setInterval(checkChat, 1500)
})

function sendMessage(message) {
    if (!glob.CHATPROXY_SEND) return
    jsonfile.readFile(FileName, {}, (err, data) => {
        if (err) {
            console.log(err)
            jsonfile.writeFile(FileName, { elements: [] })
            return
        }
        data.elements.push({ pid: process.pid, time: getTime(), chat: message })
        jsonfile.writeFileSync(FileName, data, {}, (err) => {
            console.log(err)
            jsonfile.writeFile(FileName, { elements: [] })
            return
        })
    })
}

var lastTime = getTime()
function checkChat() {
    if (!glob.CHATPROXY_READ) return
    jsonfile.readFile(FileName, {}, (err, data) => {
        if (err) {
            console.log(err)
            jsonfile.writeFile(FileName, { elements: [] })
            return
        }
        for (let i = 0; i < data.elements.length; i++) {
            const el = data.elements[i]
            if (process.pid != el.pid && lastTime < el.time) {
                bot.chat(el.chat)
            }
        }
        lastTime = getTime()
    })
}

function getTime() {
    return new Date().getTime()
}