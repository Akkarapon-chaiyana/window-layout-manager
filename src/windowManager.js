const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execAsync = promisify(exec);

async function runScript(script) {
  const tmp = path.join(os.tmpdir(), `wlm_${Date.now()}.scpt`);
  try {
    fs.writeFileSync(tmp, script, 'utf8');
    const { stdout } = await execAsync(`osascript "${tmp}"`);
    return stdout.trim();
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

async function getWindows() {
  const script = `
set output to {}
tell application "System Events"
  set appList to every application process whose visible is true
  repeat with proc in appList
    set appName to name of proc
    set pidNum to unix id of proc
    repeat with win in (every window of proc)
      try
        set winTitle to name of win
        set pos to position of win
        set sz to size of win
        set end of output to appName & "|||" & winTitle & "|||" & (item 1 of pos) & "|||" & (item 2 of pos) & "|||" & (item 1 of sz) & "|||" & (item 2 of sz) & "|||" & pidNum
      end try
    end repeat
  end repeat
end tell
return output
`;
  try {
    const raw = await runScript(script);
    return parseWindows(raw);
  } catch (e) {
    console.error('getWindows error:', e.message);
    return [];
  }
}

function parseWindows(raw) {
  if (!raw) return [];
  return raw.split(', ').map(entry => {
    const parts = entry.split('|||');
    if (parts.length < 7) return null;
    return {
      app:    parts[0].trim(),
      title:  parts[1].trim(),
      x:      parseInt(parts[2]),
      y:      parseInt(parts[3]),
      width:  parseInt(parts[4]),
      height: parseInt(parts[5]),
      pid:    parseInt(parts[6]),
    };
  }).filter(w => w && !isNaN(w.x));
}

// Find window by PID — works even when the title changes (e.g. YouTube song change)
async function getWindowBounds(app, title, pid) {
  const script = pid
    ? `
tell application "System Events"
  set proc to first application process whose unix id is ${pid}
  set win to first window of proc
  set pos to position of win
  set sz to size of win
  return (item 1 of pos) & "|||" & (item 2 of pos) & "|||" & (item 1 of sz) & "|||" & (item 2 of sz)
end tell
`
    : `
tell application "System Events"
  tell application process "${app}"
    repeat with win in every window
      if name of win is "${title.replace(/"/g, '\\"')}" then
        set pos to position of win
        set sz to size of win
        return (item 1 of pos) & "|||" & (item 2 of pos) & "|||" & (item 1 of sz) & "|||" & (item 2 of sz)
      end if
    end repeat
  end tell
end tell
`;
  try {
    const out = await runScript(script);
    const parts = out.split('|||');
    if (parts.length < 4) return null;
    return {
      x:      parseInt(parts[0]),
      y:      parseInt(parts[1]),
      width:  parseInt(parts[2]),
      height: parseInt(parts[3]),
    };
  } catch (e) {
    console.error('getWindowBounds error:', e.message);
    return null;
  }
}

// Set window bounds by PID
async function setWindowBounds(app, title, x, y, width, height, pid) {
  const script = pid
    ? `
tell application "System Events"
  set proc to first application process whose unix id is ${pid}
  set win to first window of proc
  set position of win to {${x}, ${y}}
  set size of win to {${width}, ${height}}
end tell
`
    : `
tell application "System Events"
  tell application process "${app}"
    repeat with win in every window
      if name of win is "${title.replace(/"/g, '\\"')}" then
        set position of win to {${x}, ${y}}
        set size of win to {${width}, ${height}}
      end if
    end repeat
  end tell
end tell
`;
  try {
    await runScript(script);
    return true;
  } catch (e) {
    console.error('setWindowBounds error:', e.message);
    return false;
  }
}

module.exports = { getWindows, setWindowBounds, getWindowBounds };
