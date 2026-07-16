/* core.js — state, init, settings, theme, tabs, sections
 * Part of Empty Wall. Classic script (shared global scope) — load order in index.html.
 */
// --- Global App State ---
const state = {
  theme: 'dark',
  text: {
    color: 'gradient-cyan',
    charset: 'standard',
    size: 1.0,
    shadow: false,
    border: false,
  },
  qr: {
    errorCorrection: 'M',
    style: 'blocks',
    quietZone: 4,
    invert: false,
    image: null,
  },
  image: {
    color: 'solid-white',
    width: 170,
    contrast: 1.6,
    saturation: 1,
    warmth: 0,
    edgeBoost: 1.2,
    wallpaperStyle: 'wired',
    artType: 'poster',
    movement: 'none',
    funkyMode: 'none',
    chaos: 0,
    composition: 'center',
    zoom: 1,
    panX: 0,
    panY: 0,
    texture: 'paper',
    margin: 4,
    charset: 'detailed',
    invert: false,
    autoDark: true,
    colorMode: false,
    currentImage: null, // Image object
    deviceWidth: 1920,
    deviceHeight: 1080,
    showSafeZones: false,
    livePreview: false,
  }
};

// Background processing worker
let imageWorker = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initParticles();
  initPasteUpload();
  syncWallpaperControls(); // Sync UI with potentially loaded settings
  generateAscii(); // Initial render for text
});

function saveSettings() {
  // Clone state but omit image objects to prevent localStorage quota errors
  const stateToSave = {
    theme: state.theme,
    text: state.text,
    qr: { ...state.qr, image: null },
    image: { ...state.image, currentImage: null }
  };
  localStorage.setItem('emptyWallSettings', JSON.stringify(stateToSave));
}

function loadSettings() {
  const saved = localStorage.getItem('emptyWallSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge saved state into current state deeply
      Object.assign(state.text, parsed.text);
      Object.assign(state.qr, parsed.qr);
      Object.assign(state.image, parsed.image);

      if (parsed.theme && parsed.theme !== state.theme) {
        toggleTheme(); // Apply saved theme
      }
    } catch (e) {
      console.error('Failed to parse saved settings', e);
    }
  }
}

// --- Theme ---
function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById('themeIcon');
  if (state.theme === 'dark') {
    state.theme = 'light';
    body.dataset.theme = 'light';
    icon.textContent = 'light_mode';
  } else {
    state.theme = 'dark';
    delete body.dataset.theme;
    icon.textContent = 'dark_mode';
  }
  saveSettings();
}

// --- Tabs ---
function switchTab(tabId) {
  // Update buttons
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
  if (tabId === 'text') {
    document.getElementById('tabTextBtn').classList.add('active');
  } else if (tabId === 'explore') {
    document.getElementById('tabExploreBtn').classList.add('active');
  } else {
    document.getElementById('tabImageBtn').classList.add('active');
  }

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  if (tabId === 'text') {
    document.getElementById('panelText').classList.add('active');
  } else if (tabId === 'explore') {
    document.getElementById('panelExplore').classList.add('active');
  } else {
    document.getElementById('panelImage').classList.add('active');
  }
}

// --- Control Sections ---
function toggleSection(header) {
  const section = header.closest('.control-section');
  section.classList.toggle('collapsed');
}

