const http = require("http")

const httpserver = "http://localhost:" + process.env.MC_BOUYOMI_HTTP_PORT

const sendBouyomi = sendBouyomiHttp;
const server = httpserver;

setTimeout(() => {
  sendBouyomi(server, "棒読みちゃんスタンバイ")

  var prevBouyomiPlayer = ""
  var prevDate = Date.now();
  bot.on('chat', (username, message) => {
    if (username == "Super_AI") return
    if (prevBouyomiPlayer == username && Date.now() - prevDate < 5000) {
      sendBouyomi(server, message.trim().replace(/ \(.*\)$/, ""))
    } else {
      sendBouyomi(server, username + " " + message.trim().replace(/ \(.*\)$/, ""))
    }
    prevBouyomiPlayer = username
    prevDate = Date.now();
  })

  bot.on("playerJoined", (player) => {
    sendBouyomi(server, player.username + " ジョインドザゲーム");
  })

  bot.on("playerLeft", (player) => {
    sendBouyomi(server, player.username + " レフトザゲーム");
  })

  bot.on('end', () => {
    sendBouyomi(server, "bot 終了");
  })
}, 5000)

/**
 * UnUsedMethod
 * @param {*} options 
 * @param {*} message 
 */
function sendBouyomiSocket(options, message) {
  var messageBuffer = new Buffer(message);

  var buffer = new Buffer(15 + messageBuffer.length);
  buffer.writeUInt16LE(0x0001, 0);
  buffer.writeUInt16LE(0xFFFF, 2);
  buffer.writeUInt16LE(0xFFFF, 4);
  buffer.writeUInt16LE(0xFFFF, 6);
  buffer.writeUInt16LE(0000, 8);
  buffer.writeUInt8(00, 10);
  buffer.writeUInt32LE(messageBuffer.length, 11);
  messageBuffer.copy(buffer, 15, 0, messageBuffer.length);

  require('net').connect(options).end(buffer);

}

function sendBouyomiHttp(url, message) {
  var req = http.get(encodeURI(url + "/talk?text=" + message))
  req.on("error", (err) => {
    // console.log(err);
    req.abort()
    req.destroy()
    req.end()
  })
}