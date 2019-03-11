var fs = require('fs');
var readline = require("readline");
botFunc.isPlayingMusic = false;

botFunc.isTuning = false;
botFunc.notes = [[], [], [], [], [], [], [], [], [], []];
botFunc.logNote = false;

botFunc.initTempo = 150;
botFunc.tuneTempo = 90;

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

bot.on('noteHeard', (block, instrument, pitch) => {
  try {
    if (botFunc.isPlayingMusic) {
      botFunc.playedNote++;
      return;
    }
    if (botFunc.logNote) {
      bot.log("[note] " + getJTune(pitch) + " " + block.position + " " + instrument.id);
    }

    if (block.position.distanceTo(bot.entity.position) > 9.0) return;
    var Note = {
      block,
      instrument,
      pitch
    };
    if (botFunc.isTuning && !botFunc.isSame(block.position, prePosition)) {
      bot.log("[note] tuned " + preTune);
    }
    prePosition = block.position;

    for (var i = 0; i < botFunc.notes.length; i++) {
      for (var k = 0; k < botFunc.notes[i].length; k++) {
        if (botFunc.isSame(block.position, botFunc.notes[i][k].block.position)) {
          if ((botFunc.notes[i][k].pitch == pitch) && (botFunc.notes[i][k].instrument == instrument)) {

          } else if (botFunc.notes[i][k].instrument == instrument) {
            botFunc.notes[i][k].pitch = pitch;
            if (!botFunc.isTuning && botFunc.logNote) {
              bot.log("[note] PitchChange");
            }
          } else {
            bot.log("[note] InstChange");
          }
          botFunc.notes[i][k].instrument = instrument;
          preTune = pitch;
          i = 100;
          break;
        }
      }
    }
    if (i == botFunc.notes.length && k == botFunc.notes[i - 1].length) {
      botFunc.notes[instrument.id].push(Note);
      if (botFunc.logNote) bot.log("[note] NewNote  " + instrument.name + " " + pitch);
    }
  } catch (e) {
    console.log(e);
  }
});


bot.loadPlugin(botFunc.blockFinderPlugin);

botFunc.initNote = () => {
  bot.log("[note] Init");
  botFunc.notes = [[], [], [], [], [], [], [], [], [], []];
  bot.findBlock(
    { point: bot.entity.position.floored(), matching: 25, maxDistance: 12, count: 500 }
    , function (err, blocks) {
      if (err) {
        return console.log('Error trying to find : ' + err);
      }
      if (blocks.length) {
        var i = 0;
        var initter = setInterval(function () {
          if (i < blocks.length) {
            if (blocks[i].position.distanceTo(bot.entity.position) > 8.0) {

            } else {
              punchNote(blocks[i]);
            }
            i++;
          } else {
            clearInterval(initter);
            bot.log("[note] InitEnd");
            botFunc.tuneNote();
          }
        }, botFunc.initTempo);

      } else {
        bot.log("I couldn't find within 5.");
        return;
      }
    });

}

botFunc.tuneNote = () => {
  botFunc.isTuning = true;
  var tuneArray = [];
  var needCount = 0;
  var sumNeedCount = 0;
  for (var i = 0; i < botFunc.notes.length; i++) {
    botFunc.notes[i].sort((a, b) => a.pitch - b.pitch);
    if (botFunc.notes[i].length >= 25)
      for (var k = 0; k < botFunc.notes[i].length && k < 25; k++) {
        needCount = (botFunc.notes[i][k].pitch <= k) ? k - botFunc.notes[i][k].pitch : 25 - (botFunc.notes[i][k].pitch - k);
        bot.log("[note] TuneTarget: " + botFunc.notes[i][k].pitch + " needCount: " + needCount);
        sumNeedCount += needCount;
        for (; needCount > 0; needCount--) {
          tuneArray.push(botFunc.notes[i][k]);
        }
        if (tuneArray.length > 0 && tuneArray[tuneArray.length - 1] != null) {
          tuneArray.push(null);
        }
      }
    else if (botFunc.notes[i].length > 0)
      for (var k = 0; k < 3; k++) {
        var tg = (k + 1) * 6;
        needCount = (botFunc.notes[i][k].pitch <= tg) ? tg - botFunc.notes[i][k].pitch : 25 - (botFunc.notes[i][k].pitch - tg);
        bot.log("[note] TuneTarget: " + botFunc.notes[i][k].pitch + " needCount: " + needCount);
        sumNeedCount += needCount;
        for (; needCount > 0; needCount--) {
          tuneArray.push(botFunc.notes[i][k]);
        }
        if (tuneArray.length > 0 && tuneArray[tuneArray.length - 1] != null) {
          tuneArray.push(null);
        }
      }
  }
  try {
    var i = 0;
    var tunitian = setInterval(function () {
      if (i < tuneArray.length && botFunc.isTuning) {
        if (tuneArray[i] != null) {
          bot.activateBlock(tuneArray[i].block);
          i++;
        } else {
          i++;
          if (i < tuneArray.length && tuneArray[i] != null) {
            bot.log("[note] TuneWait");
            bot.lookAt(tuneArray[i].block.position.offset(0.5, 0.5, 0.5), true);
          }
        }
      } else {
        botFunc.isTuning = false;
        bot.log("[note] TuneFinish");
        clearInterval(tunitian);
        if (sumNeedCount > 0) {
          setTimeout(botFunc.tuneNote, 300);
        }
      }
    }, botFunc.tuneTempo);

  } catch (e) {
    console.log(e);
  }
}


botFunc.createMusic = (MusicObj, tempo = 60, pits = []) => {
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
    for (var k = 0; k < botFunc.notes[inst].length; k++) {//matching
      if (botFunc.notes[inst][k].pitch == pits[i]) {
        MusicObj.soundCount++;
        MusicObj.seqData.push(botFunc.notes[inst][k]);
        break;
      }
    }
    if (k == botFunc.notes[inst].length) {//not exist
      MusicObj.outRanges++;
      MusicObj.seqData.push(null);
      continue;
    }

  }

  MusicObj.sectionCount = (3 * 1000) / MusicObj.tempo;
  MusicObj.sectionLength = Math.round(MusicObj.seqData.length / MusicObj.sectionCount);
  MusicObj.sectionCount = Math.round(MusicObj.seqData.length / MusicObj.sectionLength);

  bot.log("[note] MusicCreated  length: " + MusicObj.seqData.length
    + " sounds: " + MusicObj.soundCount
    + " ounRanges: " + MusicObj.outRanges
  );
}

botFunc.playMusic = (MusicObj) => {
  var musician;
  var musicCode;
  try {
    if (botFunc.isPlayingMusic) return;
    if (typeof (MusicObj) == "string") {
      bot.log("[note] load " + MusicObj);
      var objson;
      fs.readFile(MusicObj, 'utf-8', function (err, text) {
        try { objson = JSON.parse(text); } catch (e) { console.log(e); return; }
      });
      setTimeout(() => {
        if (objson == undefined) return;
        botFunc.playMusic(objson);
      }, 500);
      return;
    }
    if (MusicObj.seqData == undefined) {
      if(botFunc.logNote)bot.log("[note] New Music");
      botFunc.createMusic(MusicObj);
    }
    botFunc.isPlayingMusic = true;
    botFunc.playedNote = 0;
    botFunc.currentMusic = MusicObj;

    bot.log("[note] playMusic " + MusicObj.title + " length: " + MusicObj.seqData.length + " tempo: " + MusicObj.tempo + " sections: " + MusicObj.sectionLength + " seconds: " + MusicObj.duration);
    musicCode = 0;
    musician = setInterval(function () {
      if (musicCode % MusicObj.sectionCount == 0 && botFunc.logNote)
        bot.log("[note] section: " + musicCode / MusicObj.sectionCount + "/" + MusicObj.sectionLength);

      if (MusicObj.seqData[musicCode] == null);
      else {
        punchNote(MusicObj.seqData[musicCode].block);
      }
      if (++musicCode >= MusicObj.seqData.length || !botFunc.isPlayingMusic) {
        clearInterval(musician);
        bot.log("[note] MusicEnd " + ((botFunc.playedNote / MusicObj.soundCount) * 100) + "% missing: " + (MusicObj.soundCount - botFunc.playedNote));
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
  botFunc.isTuning = false;
}

function punchNote(block) {
  bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true, () => {
    bot._client.write('block_dig', {
      status: 0, // start digging
      location: block.position,
      face: 1 // hard coded to always dig from the top
    })
    bot.targetDigBlock = block
    bot._client.write('arm_animation', { hand: 0 });
  });
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
  var stream = fs.createReadStream("./PlayLists/"+playlist, "utf8");//"MusicListRandom.txt"

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
      bot.log("[note] Endless play " + botFunc.endlessFilelist[botFunc.endlessIndex] + " playlist: " + botFunc.endlessIndex + "/" + botFunc.endlessFilelist.length);
      botFunc.playMusic("./MineMusic/" + botFunc.endlessFilelist[botFunc.endlessIndex]);
      botFunc.endlessIndex++;
    }, 5000);
  } catch (e) {
    console.log(e);
  }
}

