flag.MusicArm = false;
flag.logNote = false;
flag.logMusic = true;

glob.notes = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];

const initTempo = 90;
const tuneTempo = 90;

flag.Playlist = false;
glob.Playlist = "";
glob.PlaylistFiles = [];
glob.PlaylistIndex = 0;

glob.currentMusic = null;
glob.validNoteDistance = 10;
glob.logggingMusicDelay = 100;

glob.skip = skip;
glob.stopMusic = stopMusic;
glob.initNote = initNote;
glob.tuneNote = tuneNote;
glob.commandMusic = commandMusic;
glob.playMusic = playMusic;
glob.commandPlaylist = commandPlaylist;
glob.playPlaylist = playPlaylist;

var prePosition;
var preTune = 0;
var playedNote = 0;

const instmap = {
  "harp": 0,
  "basedrum": 1,
  "snare": 2,
  "hat": 3,
  "bass": 4,
  "flute": 5,
  "bell": 6,
  "guiter": 7,
  "chime": 8,
  "xylophone": 9,
  "iron_xylophone": 10,
  "cow_bell": 11,
  "didgeridoo": 12,
  "bit": 13,
  "banjo": 14,
  "pling": 15
}

function stopMusic() {
  glob.finishState("music")
  flag.Playlist = false;
}

function skip() {
  glob.finishState("music")
}

bot.on('noteHeard', (block, instrument, pitch) => {
  try {

    if (block.position.distanceTo(bot.entity.position) > glob.validNoteDistance) return;

    if (flag.logNote) {
      bot.log("[note] " + getJTune(pitch) + " " + block.position + " " + instrument.id);
    }

    if (glob.getState() == "music") {
      playedNote++;
      return;
    }

    var Note = {
      block,
      instrument,
      pitch
    };
    if (flag.Tuning && !isSame(block.position, prePosition)) {
      bot.log("[note] tuned " + preTune);
    }
    prePosition = block.position;

    for (var i = 0; i < glob.notes.length; i++) {
      for (var k = 0; k < glob.notes[i].length; k++) {
        if (isSame(block.position, glob.notes[i][k].block.position)) {
          if ((glob.notes[i][k].pitch == pitch) && (glob.notes[i][k].instrument == instrument)) {

          } else if (glob.notes[i][k].instrument == instrument) {
            glob.notes[i][k].pitch = pitch;
            if (!flag.Tuning && flag.logNote) {
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
      if (flag.logNote) bot.log("[note] NewNote  " + instrument.name + " " + pitch);
    }
  } catch (e) {
    console.log(e);
  }
});

function initNote() {
  bot.log("[note] Init");
  glob.notes = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
  bot.findBlock(
    { point: bot.entity.position.floored(), matching: 74, maxDistance: glob.validNoteDistance, count: 500 }
    , function (err, blocks) {
      if (err) {
        return console.log('Error trying to find : ' + err);
      }
      if (blocks.length) {
        var i = 0;
        var initter = setInterval(function () {
          if (i < blocks.length) {
            punchNote(blocks[i]);
            i++;
          } else {
            clearInterval(initter);
            bot.log("[note] InitEnd");
            tuneNote();
          }
        }, initTempo);

      } else {
        bot.log("I couldn't find within " + glob.validNoteDistance);
      }
    });
}

function tuneNote() {
  flag.Tuning = true;
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
            if (flag.logNote) bot.log("[note] Tune: " + m + " " + arrayInst[m].pitch + " ok");
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
      bot.log("[note] Tune: noteneeds 25 " + arrayInst.length);
    }
  }
  try {
    var i = 0;
    var tunitian = setInterval(function () {
      if (i < tuneArray.length && flag.Tuning) {
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
        if (sumNeedCount > 0 && flag.Tuning) {
          setTimeout(tuneNote, 300);
        }
        flag.Tuning = false;
        for (var k = 0; k < glob.notes.length; k++) {
          glob.notes[k].sort((a, b) => a.pitch - b.pitch);
        }
        bot.log("[note] TuneFinish");
      }
    }, tuneTempo);

  } catch (e) {
    console.log(e);
  }
}

function playMusic(MusicObj) {
  player(MusicObj, playNote)
}

function commandMusic(MusicObj) {
  player(MusicObj, commandNote)
}

function player(MusicObj, playsound) {
  glob.tryState("music", function () {
    var musicCode;
    var startTime = new Date().getTime();
    if (typeof (MusicObj) == "string") {
      var baseTitle = MusicObj;
      if (flag.logMusic)
        bot.log("[music] load " + baseTitle);
      try {
        MusicObj = jsonfile.readFileSync("MineMusic/" + baseTitle);
      } catch (e) {
        console.log(e)
        glob.finishState("music");
        return;
      }
    }
    glob.currentMusic = MusicObj;
    playedNote = 0;
    musicCode = 0;
    const pits = MusicObj.pits
    bot.log("[music] Music " + MusicObj.title + " tempo: " + MusicObj.tempo + " seconds: " + MusicObj.seconds + " sounds: " + MusicObj.sounds + " pitslength: " + pits.length);
    var inst = pits[musicCode++]
    var wait = pits[musicCode++]
    var pitch = pits[musicCode++]
    var clock = Date.now();
    setTimeout(player, wait)
    function player() {
      const now = Date.now();
      if (flag.logMusic && ((now - clock) - wait) >= glob.logggingMusicDelay) {
        bot.log("[music] Delayed " + ((now - clock) - wait) + "ms")
      }
      clock = now
      playsound(inst, pitch)
      if (musicCode >= pits.length || glob.getState() != "music") {
        bot.log("[music] MusicEnd " + ((playedNote / MusicObj.sounds) * 100) + "% missing: " + (MusicObj.sounds - playedNote) + " seconds: " + (new Date().getTime() - startTime) / 1000 + "s");
        glob.currentMusic = null;
        glob.finishState("music")
        return
      }
      const next = pits[musicCode++]
      if (typeof (next) == "string") {
        inst = next;
        wait = pits[musicCode++]
      } else {
        wait = next;
      }
      pitch = pits[musicCode++]
      if (wait == 0) {
        player();
      } else {
        setTimeout(player, wait)
      }
    }
  })
};

function punchNote(block) {
  if (flag.MusicArm)
    bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true);//, () => {
  bot._client.write('block_dig', {
    status: 0, // start digging
    location: block.position,
    face: 1 // hard coded to always dig from the top
  })
  bot.targetDigBlock = block
  if (flag.MusicArm)
    bot._client.write('arm_animation', { hand: 0 });
}

function playNote(inst, pitch) {
  const note = glob.notes[instmap[inst]][pitch]
  if (!note || !note.block) {
    bot.log("couldn't find note " + inst + " " + pitch)
    return
  }
  const block = note.block

  if (flag.MusicArm)
    bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true);//, () => {
  bot._client.write('block_dig', {
    status: 0, // start digging
    location: block.position,
    face: 1 // hard coded to always dig from the top
  })
  bot.targetDigBlock = block
  if (flag.MusicArm)
    bot._client.write('arm_animation', { hand: 0 });
}

function commandNote(inst, pitch) {
  const commandpitch = Math.pow(2, (pitch) / 12) * 0.5;
  bot.justchat("/playsound minecraft:block.note_block." + inst + " record @a ~ ~ ~ 100 " + commandpitch)
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


function playPlaylist(playlist, shuffle = false) {
  playlister(playlist, playMusic, shuffle)
}

function commandPlaylist(playlist, shuffle = false) {
  playlister(playlist, commandMusic, shuffle)
}

function playlister(playlist, playsound, shuffle = false) {
  if (flag.Playlist) {
    bot.log("[note] [Playlist] aborted")
    stopMusic();
    setTimeout(playPlaylist, 1000, playlist, shuffle)
    return;
  }
  flag.Playlist = true;
  glob.Playlist = playlist;
  glob.PlaylistFiles = [];

  bot.log("[note] [Playlist] playlist " + playlist);

  // NOT SYNC
  fs.readFile("./PlayLists/" + playlist, 'utf-8', function (err, text) {
    if (err) {
      console.log(err);
      flag.Playlist = false;
      return;
    }
    glob.PlaylistFiles = text.split("\r\n");
    glob.PlaylistFiles.splice(glob.PlaylistFiles.length - 1, 1);

    if (shuffle) {
      bot.log("[note] [Playlist] shuffle playlist")
      for (var i = glob.PlaylistFiles.length - 1; i > 0; i--) {
        var r = Math.floor(Math.random() * (i + 1));
        var tmp = glob.PlaylistFiles[i];
        glob.PlaylistFiles[i] = glob.PlaylistFiles[r];
        glob.PlaylistFiles[r] = tmp;
      }
    }
    var playlistPlayer;
    try {
      playlistPlayer = setInterval(function () {
        if (glob.PlaylistIndex >= glob.PlaylistFiles.length) {
          flag.Playlist = false;
        }

        if (!flag.Playlist) {
          clearInterval(playlistPlayer);
          bot.log("[note] [Playlist] END");
          return;
        }

        if (glob.doNothing()) {
          bot.log("[note] [Playlist] " + glob.PlaylistFiles[glob.PlaylistIndex] + " : " + glob.PlaylistIndex + "/" + glob.PlaylistFiles.length);
          playsound(glob.PlaylistFiles[glob.PlaylistIndex].split("\t")[0]);
          glob.PlaylistIndex++;
          glob.PlaylistIndex %= glob.PlaylistFiles.length;
        }
      }, 5000);
    } catch (e) {
      console.log(e);
    }
  });
}

