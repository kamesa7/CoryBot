fs = require('fs');

glob.isPlayingMusic = false;
glob.isTuning = false;
glob.isMusicArm = false;
glob.notes = [[], [], [], [], [], [], [], [], [], []];
glob.logNote = false;

glob.initTempo = 90;
glob.tuneTempo = 90;

glob.isEndlessing = false;
glob.endlessPlaylist = "";
glob.endlessFilelist = [];
glob.endlessIndex = 0;

glob.currentMusic = null;
glob.validNoteDistance = 10;


glob.generalMusicObj = {
  pits: [],
  seqData: [],
  soundCount: 0,
  outRanges: 0,
  tempo: 60,
  title: "MUSIC",
  baseTitle: "baseMUSIC",
  duration: 0,
  baseduration: 0,
  score: 0,
  perfection: 100
};

glob.skip = skip;
glob.stopMusic = stopMusic;
glob.initNote = initNote;
glob.tuneNote = tuneNote;
glob.playMusic = playMusic;
glob.createMusic = createMusic;
glob.endlessMusic = endlessMusic;

var prePosition;
var preTune = 0;
var playedNote = 0;
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

function stopMusic() {
  glob.isPlayingMusic = false;
  glob.isEndlessing = false;
  glob.isTuning = false;
}

function skip() {
  glob.isPlayingMusic = false;
}

bot.on('noteHeard', (block, instrument, pitch) => {
  try {

    if (block.position.distanceTo(bot.entity.position) > glob.validNoteDistance) return;

    if (glob.logNote) {
      bot.log("[note] " + getJTune(pitch) + " " + block.position + " " + instrument.id);
    }

    if (glob.isPlayingMusic) {
      playedNote++;
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

function initNote() {
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
            tuneNote();
          }
        }, glob.initTempo);

      } else {
        bot.log("I couldn't find within " + glob.validNoteDistance);
        return;
      }
    });

}

function tuneNote() {
  glob.isTuning = true;
  var needArray = [];
  var tuneArray = [];
  var sumNeedCount = 0;
  function addTune(note, needCount) {
    sumNeedCount += needCount;
    for (; needCount > 0; needCount--) {
      tuneArray.push(note);
    }
    if (tuneArray.length > 0 && tuneArray[tuneArray.length - 1] != null) {
      tuneArray.push(null);
    }
  }
  for (var i = 0; i < glob.notes.length; i++) {
    bot.log("[note] Tune Inst: " + i);
    var okArray = [];
    var arrayInst = glob.notes[i];
    arrayInst.sort((a, b) => a.pitch - b.pitch);
    if (25 <= arrayInst.length) {
      for (var tg = 0; tg < 25; tg++) {
        for (var m = 0; m < 25; m++) {
          if (arrayInst[m].pitch == tg) {
            bot.log("[note] Tune: " + m + " " + arrayInst[m].pitch + " ok");
            okArray[m] = true;
            break;
          }
        }
        if (m == 25) {
          needArray.push(tg);
        }
      }
      for (var k = 0; k < needArray.length; k++) {
        var tg = needArray[k];
        for (var m = 0; m < 25; m++) {
          if (!okArray[m]) {
            var needCount = (arrayInst[m].pitch <= tg) ? tg - arrayInst[m].pitch : 25 - (arrayInst[m].pitch - tg);
            bot.log("[note] Tune: " + m + " " + arrayInst[m].pitch + " needCount: " + needCount);
            addTune(arrayInst[m], needCount);
            okArray[m] = true;
            break;
          }
        }
      }
    } else if (arrayInst.length > 0) {
      for (var m = 0; m < arrayInst.length; m++) {
        if (!arrayInst[m]) break;
        var tg = Math.floor(Math.min((m + 1) * 24 / arrayInst.length - 1, 23));
        var needCount = (arrayInst[m].pitch <= tg) ? tg - arrayInst[m].pitch : 25 - (arrayInst[m].pitch - tg);
        bot.log("[note] Tune: " + m + " " + arrayInst[m].pitch + " needCount: " + needCount);
        addTune(arrayInst[m], needCount);
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
        clearInterval(tunitian);
        if (sumNeedCount > 0 && glob.isTuning) {
          setTimeout(tuneNote, 300);
        }
        glob.isTuning = false;
        for (var k = 0; k < glob.notes.length; k++) {
          glob.notes[k].sort((a, b) => a.pitch - b.pitch);
        }
        bot.log("[note] TuneFinish");
      }
    }, glob.tuneTempo);

  } catch (e) {
    console.log(e);
  }
}


function createMusic(MusicObj) {
  var pits = MusicObj.pits;
  MusicObj.seqData = [];
  MusicObj.soundCount = 0;
  MusicObj.outRanges = 0;
  if (!MusicObj.baseTitle) MusicObj.baseTitle = "";
  if (!MusicObj.title) MusicObj.title = "";

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
      console.log("invalid note range");
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
  bot.log("[note] MusicCreated  " + MusicObj.baseTitle + " : " + MusicObj.title + " err:" + MusicObj.outRanges);
  if ((MusicObj.title == "untitled" || MusicObj.title == "") && MusicObj.baseTitle != "") MusicObj.title = MusicObj.baseTitle

  if (MusicObj.outRanges > 0) bot.log("[note] Something Error in creating Music : " + MusicObj.outRanges);
}

function playMusic(MusicObj) {
  var musician;
  var musicCode;
  var startTime = new Date().getTime();
  try {
    if (glob.isPlayingMusic) {
      bot.log("[note] aborted")
      glob.isPlayingMusic = false;
      setTimeout(playMusic, 1000, MusicObj)
      return;
    }
    if (typeof (MusicObj) == "string") {
      // bot.log("[note] load " + MusicObj);
      try {
        var objson = jsonfile.readFileSync("MineMusic/" + MusicObj);
      } catch (e) {
        console.log(e)
      }
      if (objson) {
        objson.baseTitle = MusicObj;
        playMusic(objson);
      }
      return;
    }
    if (MusicObj.seqData == undefined) {
      if (glob.logNote) bot.log("[note] New Music");
      createMusic(MusicObj);
    }
    glob.isPlayingMusic = true;
    playedNote = 0;
    glob.currentMusic = MusicObj;

    bot.log("[note] playMusic " + MusicObj.title + " length: " + MusicObj.seqData.length + " sounds: " + MusicObj.soundCount + " tempo: " + MusicObj.tempo + " seconds: " + MusicObj.duration + "/" + MusicObj.baseduration + " score: " + MusicObj.score + " perfection: "+MusicObj.perfection);
    musicCode = 0;
    musician = setInterval(function () {
      if (MusicObj.seqData[musicCode])
        punchNote(MusicObj.seqData[musicCode].block);
      if (++musicCode >= MusicObj.seqData.length || !glob.isPlayingMusic) {
        clearInterval(musician);
        bot.log("[note] MusicEnd " + ((playedNote / MusicObj.soundCount) * 100) + "% missing: " + (MusicObj.soundCount - playedNote) + " seconds: " + (new Date().getTime() - startTime) / 1000 + "s");
        glob.currentMusic = null;
        glob.isPlayingMusic = false;
      }
    }, MusicObj.tempo);

  } catch (e) {
    console.log(e);
  }
};


function punchNote(block) {
  if (glob.isMusicArm)
    bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true);//, () => {
  bot._client.write('block_dig', {
    status: 0, // start digging
    location: block.position,
    face: 1 // hard coded to always dig from the top
  })
  bot.targetDigBlock = block
  if (glob.isMusicArm)
    bot._client.write('arm_animation', { hand: 0 });
  // });
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

function endlessMusic(playlist, shuffle = false) {
  if (glob.isEndlessing) {
    bot.log("[note] [Endless] aborted")
    stopMusic();
    setTimeout(endlessMusic, 1000, playlist, shuffle)
    return;
  }
  glob.isEndlessing = true;
  glob.endlessPlaylist = playlist;
  glob.endlessFilelist = [];

  bot.log("[note] [Endless] playlist " + playlist);

  // NOT SYNC
  fs.readFile("./PlayLists/" + playlist, 'utf-8', function (err, text) {
    if (err) {
      console.log(err);
      glob.isEndlessing = false;
      return;
    }
    glob.endlessFilelist = text.split("\r\n");
    glob.endlessFilelist.splice(glob.endlessFilelist.length - 1, 1);

    if (shuffle) {
      bot.log("[note] [Endless] shuffle playlist")
      for (var i = glob.endlessFilelist.length - 1; i > 0; i--) {
        var r = Math.floor(Math.random() * (i + 1));
        var tmp = glob.endlessFilelist[i];
        glob.endlessFilelist[i] = glob.endlessFilelist[r];
        glob.endlessFilelist[r] = tmp;
      }
    }
  });

  var musicPlayer;
  try {
    musicPlayer = setInterval(function () {
      if (glob.endlessIndex >= glob.endlessFilelist.length) {
        glob.isEndlessing = false;
      }

      if (!glob.isEndlessing) {
        clearInterval(musicPlayer);
        bot.log("[note] [Endless] END");
        return;
      }
      if (glob.isPlayingMusic) return;
      bot.log("[note] [Endless] " + glob.endlessFilelist[glob.endlessIndex] + " : " + glob.endlessIndex + "/" + glob.endlessFilelist.length);
      playMusic(glob.endlessFilelist[glob.endlessIndex].split("\t")[0]);
      glob.endlessIndex++;
      glob.endlessIndex %= glob.endlessFilelist.length;
    }, 5000);
  } catch (e) {
    console.log(e);
  }
}

