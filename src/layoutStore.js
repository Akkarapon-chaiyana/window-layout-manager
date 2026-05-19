const fs = require('fs');
const path = require('path');

const LAYOUTS_FILE = path.join(__dirname, '..', 'layouts.json');

function load() {
  try {
    if (fs.existsSync(LAYOUTS_FILE)) {
      return JSON.parse(fs.readFileSync(LAYOUTS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function save(layouts) {
  fs.writeFileSync(LAYOUTS_FILE, JSON.stringify(layouts, null, 2));
}

module.exports = { load, save };
