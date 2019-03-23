var fs = require('fs');
var readline = require("readline");
glob.isPlayingMusic = false;

glob.isTuning = false;
glob.notes = [[], [], [], [], [], [], [], [], [], []];
glob.logNote = false;

glob.initTempo = 150;
glob.tuneTempo = 90;

glob.isEndlessing = false;
glob.endlessPlaylist = "";
glob.endlessFilelist = [];
glob.endlessIndex = 0;

glob.currentMusic = null;
glob.validNoteDistance = 9;
glob.playedNote = 0;

glob.generalMusicObj = {
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
glob.Album = new Object();
fs.readFile('musicAlbum.json', 'utf-8', function (err, text) {
  glob.Album = JSON.parse(text);
});

bot.on('noteHeard', (block, instrument, pitch) => {
  try {

    if (block.position.distanceTo(bot.entity.position) > glob.validNoteDistance) return;

    if (glob.logNote) {
      bot.log("[note] " + getJTune(pitch) + " " + block.position + " " + instrument.id);
    }

    if (glob.isPlayingMusic) {
      glob.playedNote++;
      return;
    }

    var Note = {
      block,
      instrument,
      pitch
    };
    if (glob.isTuning && !isSame(block.position, prePosition)) {
      bot.log("[note] tuned " + preTune);
    }
    prePosition = block.position;

    for (var i = 0; i < glob.notes.length; i++) {
      for (var k = 0; k < glob.notes[i].length; k++) {
        if (isSame(block.position, glob.notes[i][k].block.position)) {
          if ((glob.notes[i][k].pitch == pitch) && (glob.notes[i][k].instrument == instrument)) {

          } else if (glob.notes[i][k].instrument == instrument) {
            glob.notes[i][k].pitch = pitch;
            if (!glob.isTuning && glob.logNote) {
              bot.log("[note] PitchChange");
            }
          } else {
            bot.log("[note] InstChange");
          }
          glob.notes[i][k].instrument = instrument;
          preTune = pitch;
          i = 100;
          break;
        }
      }
    }
    if (i == glob.notes.length && k == glob.notes[i - 1].length) {
      glob.notes[instrument.id].push(Note);
      if (glob.logNote) bot.log("[note] NewNote  " + instrument.name + " " + pitch);
    }
  } catch (e) {
    console.log(e);
  }
});


bot.loadPlugin(glob.blockFinderPlugin);

glob.initNote = () => {
  bot.log("[note] Init");
  glob.notes = [[], [], [], [], [], [], [], [], [], []];
  bot.findBlock(
    { point: bot.entity.position.floored(), matching: 25, maxDistance: glob.validNoteDistance, count: 500 }
    , function (err, blocks) {
      if (err) {
        return console.log('Error trying to find : ' + err);
      }
      if (blocks.length) {
        var i = 0;
        var initter = setInterval(function () {
          if (i < blocks.length) {
            if (blocks[i].position.distanceTo(bot.entity.position) <= glob.validNoteDistance) {
              punchNote(blocks[i]);
            }
            i++;
          } else {
            clearInterval(initter);
            bot.log("[note] InitEnd");
            glob.tuneNote();
          }
        }, glob.initTempo);

      } else {
        bot.log("I couldn't find within 5.");
        return;
      }
    });

}

glob.tuneNote = () => {
  glob.isTuning = true;
  var tuneArray = [];
  var needCount = 0;
  var sumNeedCount = 0;
  for (var i = 0; i < glob.notes.length; i++) {
    glob.notes[i].sort((a, b) => a.pitch - b.pitch);
    if (glob.notes[i].length >= 25)
      for (var k = 0; k < glob.notes[i].length && k < 25; k++) {
        needCount = (glob.notes[i][k].pitch <= k) ? k - glob.notes[i][k].pitch : 25 - (glob.notes[i][k].pitch - k);
        bot.log("[note] TuneTarget: " + glob.notes[i][k].pitch + " needCount: " + needCount);
        sumNeedCount += needCount;
        for (; needCount > 0; needCount--) {
          tuneArray.push(glob.notes[i][k]);
        }
        if (tuneArray.length > 0 && tuneArray[tuneArray.length - 1] != null) {
          tuneArray.push(null);
        }
      }
    else if (glob.notes[i].length > 0)
      for (var k = 0; k < 3; k++) {
        if(!glob.notes[i][k]) break;
        var tg = (k + 1) * 6;
        needCount = (glob.notes[i][k].pitch <= tg) ? tg - glob.notes[i][k].pitch : 25 - (glob.notes[i][k].pitch - tg);
        bot.log("[note] TuneTarget: " + glob.notes[i][k].pitch + " needCount: " + needCount);
        sumNeedCount += needCount;
        for (; needCount > 0; needCount--) {
          tuneArray.push(glob.notes[i][k]);
        }
        if (tuneArray.length > 0 && tuneArray[tuneArray.length - 1] != null) {
          tuneArray.push(null);
        }
      }
  }
  try {
    var i = 0;
    var tunitian = setInterval(function () {
      if (i < tuneArray.length && glob.isTuning) {
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
        glob.isTuning = false;
        bot.log("[note] TuneFinish");
        clearInterval(tunitian);
        if (sumNeedCount > 0) {
          setTimeout(glob.tuneNote, 300);
        }
      }
    }, glob.tuneTempo);

  } catch (e) {
    console.log(e);
  }
}


glob.createMusic = (MusicObj, tempo = 60, pits = []) => {
  if (MusicObj == glob.generalMusicObj) {
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
    for (var k = 0; k < glob.notes[inst].length; k++) {//matching
      if (glob.notes[inst][k].pitch == pits[i]) {
        MusicObj.soundCount++;
        MusicObj.seqData.push(glob.notes[inst][k]);
        break;
      }
    }
    if (k == glob.notes[inst].length) {//not exist
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

glob.playMusic = (MusicObj) => {
  var musician;
  var musicCode;
  try {
    if (glob.isPlayingMusic) return;
    if (typeof (MusicObj) == "string") {
      bot.log("[note] load " + MusicObj);
      var objson;
      fs.readFile(MusicObj, 'utf-8', function (err, text) {
        try { objson = JSON.parse(text); } catch (e) { console.log(e); return; }
      });
      setTimeout(() => {
        if (objson == undefined) return;
        glob.playMusic(objson);
      }, 500);
      return;
    }
    if (MusicObj.seqData == undefined) {
      if (glob.logNote) bot.log("[note] New Music");
      glob.createMusic(MusicObj);
    }
    glob.isPlayingMusic = true;
    glob.playedNote = 0;
    glob.currentMusic = MusicObj;

    bot.log("[note] playMusic " + MusicObj.title + " length: " + MusicObj.seqData.length + " tempo: " + MusicObj.tempo + " sections: " + MusicObj.sectionLength + " seconds: " + MusicObj.duration);
    musicCode = 0;
    musician = setInterval(function () {
      if (musicCode % MusicObj.sectionCount == 0 && glob.logNote)
        bot.log("[note] section: " + musicCode / MusicObj.sectionCount + "/" + MusicObj.sectionLength);

      if (MusicObj.seqData[musicCode] == null);
      else {
        punchNote(MusicObj.seqData[musicCode].block);
      }
      if (++musicCode >= MusicObj.seqData.length || !glob.isPlayingMusic) {
        clearInterval(musician);
        bot.log("[note] MusicEnd " + ((glob.playedNote / MusicObj.soundCount) * 100) + "% missing: " + (MusicObj.soundCount - glob.playedNote));
        glob.currentMusic = null;
        glob.isPlayingMusic = false;
      }
    }, MusicObj.tempo);

  } catch (e) {
    console.log(e);
  }
};

glob.stopMusic = () => {
  glob.isPlayingMusic = false;
  glob.isEndlessing = false;
  glob.isTuning = false;
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

glob.endlessMusic = (playlist) => {
  glob.isEndlessing = true;
  glob.endlessPlaylist = playlist;
  glob.endlessFilelist = [];
  var stream = fs.createReadStream("./PlayLists/" + playlist, "utf8");//"MusicListRandom.txt"

  var reader = readline.createInterface({ input: stream });
  reader.on("line", (data) => {
    glob.endlessFilelist.push(data);
  });

  var musicPlayer;

  try {
    musicPlayer = setInterval(function () {
      if (glob.endlessIndex >= glob.endlessFilelist.length) {
        glob.isEndlessing = false;
      }

      if (!glob.isEndlessing) {
        clearInterval(musicPlayer);
        bot.log("[note] Endless End");
        return;
      }
      if (glob.isPlayingMusic) return;
      bot.log("[note] Endless play " + glob.endlessFilelist[glob.endlessIndex] + " playlist: " + glob.endlessIndex + "/" + glob.endlessFilelist.length);
      glob.playMusic("./MineMusic/" + glob.endlessFilelist[glob.endlessIndex]);
      glob.endlessIndex++;
    }, 5000);
  } catch (e) {
    console.log(e);
  }
}

