"use strict";

inlets = 1;
outlets = 2;

const options = {
  isLoop: true,
  outputMode: "byCharacter",
  dim: [127, 15],
};

declareattribute("dim", {
  type: "long",
  min: 5,
  max: 172,
  default: [172, 15],
  getter: "getDim",
  setter: "setDim",
});

function getDim() {
  return options.dim;
}

function setDim(x, y) {
  options.dim = [x, y];
  historyMat.dim = [x, y];
}

declareattribute("loop", {
  style: "onoff",
  getter: "getLoop",
  setter: "setLoop",
});

function getLoop() {
  return options.isLoop;
}

function setLoop(val) {
  options.isLoop = val;
}

declareattribute("output_mode", {
  style: "enum",
  enumvals: ["byLine", "byCharacter"],
  getter: "getOutputMode",
  setter: "setOutputMode",
});

function getOutputMode() {
  return options.outputMode;
}

function setOutputMode(val) {
  options.outputMode = val;
  textLineTemp.clear();
  historyMat.clear();
}

let currentLine = 0;
let lineCursor = 0;
let isPlaying = true;
let cycleCount = 0;

function iterMatrix(matrix, row) {
  const columns = [...Array(matrix.dim[0]).keys()];
  const listValues = new Uint8Array(
    columns.map((col) => {
      const cell = matrix.getcell([col, row]);
      return cell;
    })
  );

  return listValues;
}

const textFileMatrix = new JitterMatrix(1, "char");
const historyMat = new JitterMatrix(
  1,
  "char",
  options.dim[0],
  options.dim[1] - 1
);
const consoleMat = new JitterMatrix(1, "char", options.dim[0], 1);
const textLineTemp = new JitterMatrix(1, "char", options.dim[0], 1);
const tempMat = new JitterMatrix();

const displayMat = new JitterMatrix(1, "char", options.dim[0], options.dim[1]);
const jit_concat = new JitterObject("jit.concat");
jit_concat.concatdim = 1;
const jit_rota = new JitterObject("jit.rota");
jit_rota.offset_y = -1;

function notifydeleted() {
  textFileMatrix.freepeer();
  historyMat.freepeer();
  consoleMat.freepeer();
  textLineTemp.freepeer();
  jit_concat.freepeer();
  jit_rota.freepeer();
}

// handle the input text from [textedit]
const consoleData = {
  prefix: ">>> ",
  text: "",
  suffix: "_",
};

function text(text) {
  if (text !== undefined) {
    consoleData.text = text;
    task.repeat();
    task.interval = 250;
  } else {
    consoleData.text = "";
    consoleMat.clear();
    task.cancel();
  }
}

const task = new Task(function () {
  // toggle the suffix
  if (consoleData.suffix === "_") {
    consoleData.suffix = " ";
  } else {
    consoleData.suffix = "_";
  }

  const chars = encodeText(
    consoleData.prefix + consoleData.text + consoleData.suffix
  );
  consoleMat.dim = [chars.length, 1];
  consoleMat.copyarraytomatrix(new Uint8Array(chars));
  historyMat.frommatrix(displayMat);
  jit_concat.matrixcalc([historyMat, consoleMat], displayMat);
  outlet(0, "jit_matrix", displayMat.name);
});

function textReturn() {
  task.cancel();

  const chars = encodeText(consoleData.prefix + consoleData.text);
  consoleMat.dim = [chars.length, 1];
  consoleMat.copyarraytomatrix(new Uint8Array(chars));

  jit_concat.matrixcalc([historyMat, consoleMat], tempMat);
  jit_rota.matrixcalc(tempMat, displayMat);

  // clear the last row
  for (let i = 0; i < displayMat.dim[0]; i++) {
    displayMat.setcell2d(i, displayMat.dim[1] - 1, 0);
  }

  outlet(0, "jit_matrix", displayMat.name);
}

// income textfile
function jit_matrix(name) {
  currentLine = 0;
  lineCursor = 0;
  historyMat.clear();
  textFileMatrix.name = name;
  textLineTemp.dim = [textFileMatrix.dim[0], 1];
}

function play() {
  isPlaying = true;
  bang();
}

function pause() {
  isPlaying = false;
}

function clear() {
  historyMat.clear();
  displayMat.clear();
  bang();
}

function bang() {
  historyMat.frommatrix(displayMat);

  if (isPlaying) {
    // output by each line
    if (options.outputMode === "byLine") {
      const listValues = iterMatrix(textFileMatrix, currentLine);
      if (currentLine < textFileMatrix.dim[1]) {
        currentLine += 1;
      } else {
        currentLine = 0;
        if (!options.isLoop) {
          isPlaying = false;
        }
        outlet(1, "loopnotify");
      }
      if (listValues.length > 1) {
        textLineTemp.copyarraytomatrix(listValues);
      }

      jit_concat.matrixcalc([historyMat, textLineTemp], tempMat);
      jit_rota.matrixcalc(tempMat, historyMat);

      jit_concat.matrixcalc([historyMat, consoleMat], displayMat);
      outlet(0, "jit_matrix", displayMat.name);
    }

    // output by each character
    if (options.outputMode === "byCharacter") {
      const listValues = iterMatrix(textFileMatrix, currentLine);
      const currentCell = listValues[lineCursor];

      if (listValues.length > 1) {
        textLineTemp.copyarraytomatrix(listValues);
      }

      if (lineCursor < listValues.length && currentCell !== 0) {
        historyMat.setcell2d(lineCursor, historyMat.dim[1] - 1, currentCell);
        lineCursor += 1;

        jit_concat.matrixcalc([historyMat, consoleMat], displayMat);
        outlet(0, "jit_matrix", displayMat.name);
      } else {
        jit_concat.matrixcalc([historyMat, textLineTemp], tempMat);
        jit_rota.matrixcalc(tempMat, historyMat);
        // clear the last row
        for (let i = 0; i < historyMat.dim[0]; i++) {
          historyMat.setcell2d(i, historyMat.dim[1] - 1, 0);
        }

        jit_concat.matrixcalc([historyMat, consoleMat], displayMat);

        outlet(0, "jit_matrix", displayMat.name);

        if (currentLine < textFileMatrix.dim[1]) {
          currentLine += 1;
          lineCursor = 0;
        } else {
          currentLine = 0;
          if (!options.isLoop) {
            isPlaying = false;
          }
          outlet(1, "loopnotify");
        }
      }
    }
  }
}

// This function encodes a string into UTF-8 octets, similar to the [jit.str.fromsymbol]
function encodeText(string) {
  return string.split("").reduce((octets, char, i, arr) => {
    const codePoint = char.codePointAt(0);

    let c = 0;
    let bits = 0;
    if (codePoint <= 0x0000007f) {
      c = 0;
      bits = 0x00;
    } else if (codePoint <= 0x000007ff) {
      c = 6;
      bits = 0xc0;
    } else if (codePoint <= 0x0000ffff) {
      c = 12;
      bits = 0xe0;
    } else if (codePoint <= 0x001fffff) {
      c = 18;
      bits = 0xf0;
    }
    octets.push(bits | (codePoint >> c));
    c -= 6;
    while (c >= 0) {
      octets.push(0x80 | ((codePoint >> c) & 0x3f));
      c -= 6;
    }
    return octets;
  }, []);
}
