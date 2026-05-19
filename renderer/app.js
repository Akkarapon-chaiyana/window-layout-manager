const api = window.electronAPI;

// --- Layouts ---

async function refreshLayouts() {
  const layouts = await api.getLayouts();
  const list = document.getElementById('layout-list');
  list.innerHTML = '';
  for (const name of Object.keys(layouts)) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${name}</span>
      <button data-name="${name}" class="restore-btn">Restore</button>
      <button data-name="${name}" class="delete-btn">✕</button>
    `;
    list.appendChild(li);
  }

  list.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', () => restoreLayout(btn.dataset.name));
  });
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteLayout(btn.dataset.name));
  });
}

async function saveLayout() {
  const name = document.getElementById('layout-name').value.trim();
  if (!name) return setLayoutStatus('Enter a layout name.', 'warn');
  const res = await api.saveLayout(name);
  if (res.ok) {
    document.getElementById('layout-name').value = '';
    setLayoutStatus(`Saved "${name}" (${res.count} windows).`, 'ok');
    refreshLayouts();
  } else {
    setLayoutStatus('Failed to save layout.', 'err');
  }
}

async function restoreLayout(name) {
  const res = await api.restoreLayout(name);
  if (res.ok) {
    setLayoutStatus(`Restored "${name}".`, 'ok');
  } else {
    setLayoutStatus(`Restore failed.`, 'err');
  }
}

async function deleteLayout(name) {
  await api.deleteLayout(name);
  setLayoutStatus(`Deleted "${name}".`, 'ok');
  refreshLayouts();
}

function setLayoutStatus(msg, type = '') {
  const el = document.getElementById('layout-status');
  el.textContent = msg;
  el.className = 'status ' + type;
}


// --- Lock Browser ---

const MAX_SLOTS = 4;
let openWindows = [];
// slotState[id] = win | null
const slotState = { 0: null, 1: null, 2: null, 3: null };

async function refreshWindows() {
  openWindows = await api.getWindows();
  renderSlots();
  setLockStatus('Window list refreshed.', 'ok');
}

function renderSlots() {
  const container = document.getElementById('lock-slots');
  container.innerHTML = '';
  for (let id = 0; id < MAX_SLOTS; id++) {
    const win = slotState[id];
    const div = document.createElement('div');
    div.className = 'slot-row' + (win ? ' active' : '');

    if (win) {
      div.innerHTML = `
        <div class="dot active"></div>
        <span class="slot-label">${win.app}: ${win.title.slice(0, 32)}</span>
        <button class="unlock-btn danger" data-id="${id}">Unlock</button>
      `;
    } else {
      const options = openWindows.map((w, i) =>
        `<option value="${i}">${w.app}: ${w.title.slice(0, 32)}</option>`
      ).join('');
      div.innerHTML = `
        <div class="dot"></div>
        <select class="slot-win-select" data-id="${id}">
          <option value="">Slot ${id + 1} — empty</option>
          ${options}
        </select>
        <button class="lock-btn primary" data-id="${id}">Lock</button>
      `;
    }

    container.appendChild(div);
  }

  container.querySelectorAll('.lock-btn').forEach(btn => {
    btn.addEventListener('click', () => lockSlot(parseInt(btn.dataset.id)));
  });
  container.querySelectorAll('.unlock-btn').forEach(btn => {
    btn.addEventListener('click', () => unlockSlot(parseInt(btn.dataset.id)));
  });
}

async function lockSlot(id) {
  const sel = document.querySelector(`.slot-win-select[data-id="${id}"]`);
  if (!sel || !sel.value) return setLockStatus(`Select a window for Slot ${id + 1}.`, 'warn');
  const win = openWindows[parseInt(sel.value)];
  const res = await api.lockWindow(id, win);
  if (res.ok) {
    slotState[id] = win;
    renderSlots();
    setLockStatus(`Slot ${id + 1} locked: ${win.title.slice(0, 35)}`, 'ok');
  } else {
    setLockStatus('Lock failed.', 'err');
  }
}

async function unlockSlot(id) {
  await api.unlockWindow(id);
  slotState[id] = null;
  renderSlots();
  setLockStatus(`Slot ${id + 1} unlocked.`, '');
}

async function unlockAll() {
  await api.unlockAll();
  for (let i = 0; i < MAX_SLOTS; i++) slotState[i] = null;
  renderSlots();
  setLockStatus('All slots unlocked.', '');
}

function setLockStatus(msg, type = '') {
  const el = document.getElementById('lock-status');
  el.textContent = msg;
  el.className = 'status ' + type;
}

document.getElementById('btn-refresh').addEventListener('click', refreshWindows);
document.getElementById('btn-unlock-all').addEventListener('click', unlockAll);

// --- Init ---
refreshLayouts();
refreshWindows();
renderSlots();
