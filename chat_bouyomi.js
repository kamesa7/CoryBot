const http = require("http")

const socketserver = {
  host: "localhost",
  port: "50001"
}
const httpserver = "http://localhost:50080"

const sendBouyomi = sendBouyomiHttp;
const server = httpserver;

setTimeout(() => {
  sendBouyomi(server, "棒読みちゃんスタンバイ")

  bot.on('chat', (username, message) => {
    sendBouyomi(server, username + " " + message.trim().replace(/ \(.*\)$/, ""))
  })

  bot.on("playerJoined", (player) => {
    sendBouyomi(server, player.username + "が入室");
  })

  bot.on("playerLeft", (player) => {
    sendBouyomi(server, player.username + "が退出");
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
  })
}