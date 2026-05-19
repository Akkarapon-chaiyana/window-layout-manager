const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Use AppleScript to list and move windows — more reliable on macOS than node-window-manager
async function getWindows() {
  const script = `
    set output to {}
    tell application "System Events"
      set appList to every application process whose visible is true
      repeat with proc in appList
        set appName to name of proc
        repeat with win in (every window of proc)
          try
            set winTitle to name of win
            set pos to position of win
            set sz to size of win
            set end of output to appName & "|" & winTitle & "|" & (item 1 of pos) & "|" & (item 2 of pos) & "|" & (item 1 of sz) & "|" & (item 2 of sz)
          end try
        end repeat
      end repeat
    end tell
    return output
  `;
  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    return parseWindows(stdout.trim());
  } catch (e) {
    return [];
  }
}

function parseWindows(raw) {
  if (!raw) return [];
  return raw.split(', ').map(entry => {
    const parts = entry.split('|');
    if (parts.length < 6) return null;
    return {
      app: parts[0],
      title: parts[1],
      x: parseInt(parts[2]),
      y: parseInt(parts[3]),
      width: parseInt(parts[4]),
      height: parseInt(parts[5]),
    };
  }).filter(Boolean);
}

async function setWindowBounds(app, title, x, y, width, height) {
  const script = `
    tell application "System Events"
      tell application process "${app}"
        repeat with win in every window
          if name of win is "${title}" then
            set position of win to {${x}, ${y}}
            set size of win to {${width}, ${height}}
          end if
        end repeat
      end tell
    end tell
  `;
  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    return true;
  } catch (e) {
    return false;
  }
}

async function getWindowBounds(app, title) {
  const script = `
    tell application "System Events"
      tell application process "${app}"
        repeat with win in every window
          if name of win is "${title}" then
            set pos to position of win
            set sz to size of win
            return (item 1 of pos) & "|" & (item 2 of pos) & "|" & (item 1 of sz) & "|" & (item 2 of sz)
          end if
        end repeat
      end tell
    end tell
  `;
  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    const parts = stdout.trim().split('|');
    if (parts.length < 4) return null;
    return {
      x: parseInt(parts[0]),
      y: parseInt(parts[1]),
      width: parseInt(parts[2]),
      height: parseInt(parts[3]),
    };
  } catch (e) {
    return null;
  }
}

module.exports = { getWindows, setWindowBounds, getWindowBounds };
