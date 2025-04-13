"use strict";

inlets = 1;
outlets = 2;

const options = {
  isLoop: true,
  outputMode: "byCharacter",
  dim: [127, 15],
  consolePrefix: ">>> ",
  consoleCursor: "_",
  consoleCursorAlt: " ",
};

declareattribute("console_prefix", {
  type: "symbol",
  default: options.consolePrefix,
  getter: "getConsolePrefix",
  setter: "setConsolePrefix",
});
function getConsolePrefix() {
  return options.consolePrefix;
}
function setConsolePrefix(val) {
  options.consolePrefix = val;
}

declareattribute("console_cursor", {
  type: "symbol",
  default: options.consoleCursor,
  getter: "getConsoleCursor",
  setter: "setConsoleCursor",
});
function getConsoleCursor() {
  return options.consoleCursor;
}
function setConsoleCursor(val) {
  options.consoleCursor = val;
}

declareattribute("dim", {
  type: "long",
  min: 2,
  max: 127,
  default: options.dim,
  getter: "getDim",
  setter: "setDim",
});
function getDim() {
  return options.dim;
}
function setDim(x, y) {
  options.dim = [x, y];
  historyMat.dim = [x, y - 1];
  displayMat.dim = [x, y];
}

declareattribute("loop", {
  style: "onoff",
  default: options.isLoop,
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
  default: options.outputMode,
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
  text: "",
  cursor: options.consoleCursor,
};

function text(text) {
  if (text !== undefined) {
    consoleData.text = text;
    task.repeat();
    task.interval = 250;
  } else {
    task.cancel();
    consoleMat.clear();
    consoleData.text = "";
    historyMat.frommatrix(displayMat);
    jit_concat.matrixcalc([historyMat, consoleMat], displayMat);
    outlet(0, "jit_matrix", displayMat.name);
  }
}

const task = new Task(function () {
  // toggle the suffix
  if (consoleData.cursor === options.consoleCursor) {
    consoleData.cursor = options.consoleCursorAlt;
  } else {
    consoleData.cursor = options.consoleCursor;
  }

  const chars = encodeText(
    options.consolePrefix + consoleData.text + consoleData.cursor
  );
  consoleMat.dim = [chars.length, 1];
  consoleMat.copyarraytomatrix(new Uint8Array(chars));
  historyMat.frommatrix(displayMat);
  jit_concat.matrixcalc([historyMat, consoleMat], displayMat);
  outlet(0, "jit_matrix", displayMat.name);
});

function textReturn() {
  historyMat.frommatrix(displayMat);
  task.cancel();
  const regex = /^\/(\S+)\s*(.*)$/;

  const chars = encodeText(options.consolePrefix + consoleData.text);
  consoleMat.dim = [chars.length, 1];
  consoleMat.copyarraytomatrix(new Uint8Array(chars));

  jit_concat.matrixcalc([historyMat, consoleMat], tempMat);
  jit_rota.matrixcalc(tempMat, displayMat);

  // clear the last row
  for (let i = 0; i < displayMat.dim[0]; i++) {
    displayMat.setcell2d(i, displayMat.dim[1] - 1, 0);
  }

  outlet(0, "jit_matrix", displayMat.name);

  const match = consoleData.text.trim().match(regex);
  if (match) {
    const command = match[1];
    const message = match[2];

    outlet_dictionary(1, { command, message });
  }
}

// text matrix input
let currentLine = 0;
let lineCursor = 0;
let isPlaying = true;
let cycleCount = 0;

function jit_matrix(name) {
  currentLine = 0;
  lineCursor = 0;
  textFileMatrix.name = name;
  textLineTemp.dim = [textFileMatrix.dim[0], 1];

  // show the first line
  clear();

  const listValues = iterMatrix(textFileMatrix, currentLine);
  if (listValues.length > 1) {
    textLineTemp.copyarraytomatrix(listValues);
  }
  jit_concat.matrixcalc([historyMat, textLineTemp], tempMat);
  jit_rota.matrixcalc(tempMat, historyMat);
  // clear the last row
  outlet(0, "jit_matrix", historyMat.name);
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

function play() {
  isPlaying = true;
  bang();
}

function pause() {
  isPlaying = false;
}

function clear() {
  historyMat.clear();
  textLineTemp.clear();
  tempMat.clear();
  displayMat.clear();
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
