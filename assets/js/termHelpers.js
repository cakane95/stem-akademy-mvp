// assets/js/termHelpers.js
// Usine IO dédiée à un terminal (stdout/stderr bufferisés par lignes + input bloquant)

export function createIOForTerminal(term) {
  let outBuf = '';
  let errBuf = '';
  let isCapturing = false;
  let captureDisposable = null;

  const termWrite   = (s) => term && term.write(String(s));
  const termWriteln = (s) => term && term.writeln(String(s));
  const println     = (line) => termWriteln(line);

  function writeStdout(chunk) {
    const text = String(chunk);
    const parts = (outBuf + text).split(/\r?\n/);
    outBuf = parts.pop() ?? '';
    for (const line of parts) println(line);
  }

  function writeStderr(chunk) {
    const text = String(chunk);
    const parts = (errBuf + text).split(/\r?\n/);
    errBuf = parts.pop() ?? '';
    for (const line of parts) println('\x1b[31m' + line + '\x1b[0m');
  }

  function flushStdoutPartial() {
    if (outBuf) { termWrite(outBuf); outBuf = ''; }
  }

  function flushStdIO() {
    if (outBuf) { println(outBuf); outBuf = ''; }
    if (errBuf) { println('\x1b[31m' + errBuf + '\x1b[0m'); errBuf = ''; }
  }

  // Lit UNE ligne (pour input() bloquant côté worker) avec écho local simple
  function requestOneLineFromTerminal() {
    return new Promise((resolve) => {
      if (isCapturing) { resolve(''); return; }
      isCapturing = true;
      let buf = '';

      captureDisposable = term.onData((data) => {
        for (const ch of data) {
          if (ch === '\r' || ch === '\n') {
            termWrite('\r\n');
            try { captureDisposable?.dispose(); } catch {}
            captureDisposable = null;
            isCapturing = false;
            resolve(buf);
            return;
          }
          if (ch === '\x7F') { // Backspace
            if (buf.length > 0) {
              buf = buf.slice(0, -1);
              termWrite('\b \b');
            }
            continue;
          }
          if (ch >= ' ' && ch !== '\x7F') {
            buf += ch;
            termWrite(ch);
          }
        }
      });
    });
  }

  return {
    writeStdout,
    writeStderr,
    flushStdoutPartial,
    flushStdIO,
    requestOneLineFromTerminal,
    termWrite,
    termWriteln,
  };
}
