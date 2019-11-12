const server = {
  host: "localhost",
  port: "50001"
}


bot.on('chat', (username, message) => {
  sendBouyomi(server, username + " " + message.replace(/\(.*\).$/, ""))
})

bot.on("playerJoined", (player) => {
  sendBouyomi(server, player.username + "が入りました");
})

bot.on("playerLeft", (player) => {
  sendBouyomi(server, player.username + "が出ました");
})

bot.on('end', () => {
  sendBouyomi(server, "bot 終了");
})

function sendBouyomi(options, message) {
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