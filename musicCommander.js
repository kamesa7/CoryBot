var fs = require('fs');
var readline = require("readline");
botFunc.isPlayingMusic = false;

botFunc.isTuning = false;
botFunc.notes = [[], [], [], [], [], [], [], [], [], []];
botFunc.logNote = true;//: false;

botFunc.initTempo = 150;
botFunc.tuneTempo = 60;

botFunc.isEndlessing = false;
botFunc.endlessPlaylist = "";
botFunc.endlessFilelist = [];
botFunc.endlessIndex = 0;
botFunc.currentMusic = null;

botFunc.playedNote = 0;
botFunc.MusicObj = {
  pits: [],
  seqData: [],
  soundCount: 0,
  outRanges: 0,
  tempo: 60,
  title: "MUSIC"
  //sectionCount:0,
  //sectionLength:1
};
var noteFeedback;

var prePosition;
var preTune = 0;
/*
  0:"harp"
  1:"doubleBass"
  2:"snareDrum"
  3:"sticks"
  4:"bassDrum"
  5:"xylophone"
  6:"bell"
  7:"guiter"
  8:"chime"
  9:"flute"
*/
botFunc.Album = new Object();
fs.readFile('musicAlbum.json', 'utf-8', function (err, text) {
  botFunc.Album = JSON.parse(text);
});


botFunc.createMusic = (MusicObj, tempo = 48, pits = []) => {
  botFunc.isPlayingMusic = false;
  if (MusicObj == botFunc.MusicObj) {
    MusicObj.tempo = tempo;
    MusicObj.pits = pits;
  } else {
    pits = MusicObj.pits;
    tempo = MusicObj.tempo;
  }
  MusicObj.seqData = [];
  MusicObj.soundCount = 0;
  MusicObj.outRanges = 0;

  var inst = 0;
  for (var i = 0; i < pits.length; i++) {
    if (typeof (pits[i]) == "string") {
      if (pits[i] == "wait") {
        i++;
        for (var k = pits[i]; k > 0; --k) {
          MusicObj.seqData.push(null);
        }
      }
      else if (pits[i] == "harp") inst = 0;
      else if (pits[i] == "doubleBass") inst = 1;
      else if (pits[i] == "snareDrum") inst = 2;
      else if (pits[i] == "sticks") inst = 3;
      else if (pits[i] == "bassDrum") inst = 4;
      else if (pits[i] == "flute") inst = 5;
      else if (pits[i] == "bell") inst = 6;
      else if (pits[i] == "guiter") inst = 7;
      else if (pits[i] == "chime") inst = 8;
      else if (pits[i] == "xylophone") inst = 9;
      else inst = 0;
      continue;
    }
    if (pits[i] == null) {//wait
      MusicObj.seqData.push(null);
      continue;
    }

    if (pits[i] < 0 || pits[i] > 24) {//out range
      MusicObj.outRanges++;
      MusicObj.seqData.push(null);
      continue;
    }
    var pitch = Math.pow(2,(-12+pits[i])/12);
    pitch = Math.round(pitch * 100) / 100;
    //console.log(pitch);
    switch(inst){
      case 0:MusicObj.seqData.push("/playsound minecraft:block.note.harp block @a ~ ~ ~ 100 "+pitch);
      break;
      case 7:MusicObj.seqData.push("/playsound minecraft:block.note.guiter block @a ~ ~ ~ 100 "+pitch);
      break;
    }

  }

  MusicObj.sectionCount = (3 * 1000) / MusicObj.tempo;
  MusicObj.sectionLength = Math.round(MusicObj.seqData.length / MusicObj.sectionCount);
  MusicObj.sectionCount = Math.round(MusicObj.seqData.length / MusicObj.sectionLength);

  bot.log("[note] MusicCreated  length: " + MusicObj.seqData.length
    + " sounds: " + MusicObj.soundCount
    + " ounRanges: " + MusicObj.outRanges
    + " tempo: " + MusicObj.tempo
  );
}

botFunc.playMusic = (MusicObj) => {
  var musician;
  var musicCode;
  try {
    if (botFunc.isPlayingMusic) return;
    if (typeof(MusicObj) == "string" ) {
      bot.log("[note] load "+ MusicObj);
      var objson;
      fs.readFile(MusicObj, 'utf-8', function (err, text) {
        try{objson = JSON.parse(text);}catch(e){console.log(e);return;}
      });
      setTimeout(() => {
        if(objson==undefined)return;
        botFunc.playMusic(objson);
      }, 500);
      return;
    }
    if (MusicObj.seqData == undefined) {
      bot.log("[note] New Music");
      botFunc.createMusic(MusicObj);
    }
    botFunc.isPlayingMusic = true;
    botFunc.playedNote = 0;
    botFunc.currentMusic = MusicObj;

    bot.log("[note] playMusic "+ MusicObj.title +" length: " + MusicObj.seqData.length + " tempo: " + MusicObj.tempo + " sections: " + MusicObj.sectionLength + " seconds: " + MusicObj.duration);
    musicCode = 0;
    musician = setInterval(function () {
      if (musicCode % MusicObj.sectionCount == 0  && botFunc.logNote)
        bot.log("[note] section: " + musicCode / MusicObj.sectionCount + "/" + MusicObj.sectionLength);

      if (MusicObj.seqData[musicCode] == null);
      else {
        bot.chat(MusicObj.seqData[musicCode]);
      }
      if (++musicCode >= MusicObj.seqData.length || !botFunc.isPlayingMusic) {
        clearInterval(musician);
        bot.log("[note] MusicEnd");
        botFunc.currentMusic = null;
        botFunc.isPlayingMusic = false;
      }
    }, MusicObj.tempo);

  } catch (e) {
    console.log(e);
  }
};

botFunc.stopMusic = () => {
  botFunc.isPlayingMusic = false;
  botFunc.isEndlessing = false;
  botFunc.isTuning=false;
}



function getJTune(pitch) {
  switch (pitch) {
    case 0: return "F#";
    case 1: return "G";
    case 2: return "G#";
    case 3: return "A";
    case 4: return "A#";
    case 5: return "B";
    case 6: return "ﾄﾞ";
    case 7: return "ﾄﾞ#";
    case 8: return "ﾚ";
    case 9: return "ﾚ#";
    case 10: return "ﾐ";
    case 11: return "ﾌｧ";
    case 12: return "ﾌｧ#";
    case 13: return "ｿ";
    case 14: return "ｿ#";
    case 15: return "ﾗ";
    case 16: return "ﾗ#";
    case 17: return "ｼ";
    case 18: return "C";
    case 19: return "C#";
    case 20: return "D";
    case 21: return "D#";
    case 22: return "E";
    case 23: return "F";
    case 24: return "F#";
    default: return "unknown";
  }
}

botFunc.endlessMusic = (playlist) => {
  botFunc.isEndlessing = true;
  botFunc.endlessPlaylist = playlist;
  botFunc.endlessFilelist = [];
  var stream = fs.createReadStream(playlist, "utf8");//"MusicListRandom.txt"

  var reader = readline.createInterface({ input: stream });
  reader.on("line", (data) => {
    botFunc.endlessFilelist.push(data);
  });

  var musicPlayer;

  try {
    musicPlayer = setInterval(function () {
      if (botFunc.endlessIndex >= botFunc.endlessFilelist.length) {
        botFunc.isEndlessing = false;
      }

      if (!botFunc.isEndlessing) {
        clearInterval(musicPlayer);
        bot.log("[note] Endless End");
        return;
      }
      if (botFunc.isPlayingMusic) return;
      bot.log("[note] Endless play "+botFunc.endlessFilelist[botFunc.endlessIndex] +  " playlist: "+ botFunc.endlessIndex+"/"+botFunc.endlessFilelist.length);
      botFunc.playMusic("./MineMusic/"+botFunc.endlessFilelist[botFunc.endlessIndex]);
      botFunc.endlessIndex++;
    }, 5000);
  } catch (e) {
    console.log(e);
  }
}

