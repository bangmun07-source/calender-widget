/* Pomodoro vanilla JS widget
   Features: modes, start/pause/reset/skip, settings panel, background upload, localStorage persistence,
   tick sound, chime sound, auto-start behavior, keyboard shortcuts.
*/

(() => {
  // Defaults
  const DEFAULTS = {
    pomodoro: 25,
    short: 5,
    long: 15,
    autoStartBreaks: false,
    autoStartFocus: false,
    tickSound: true,
    chimeSound: true,
    background: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop'
  };

  // DOM
  const app = document.getElementById('app');
  const timerDisplay = document.getElementById('timer-display');
  const startPauseBtn = document.getElementById('start-pause');
  const resetBtn = document.getElementById('reset');
  const skipBtn = document.getElementById('skip');
  const progressEl = document.getElementById('progress');
  const modeButtons = document.querySelectorAll('.mode-btn');

  const settingsPanel = document.getElementById('settings-panel');
  const openSettingsBtn = document.getElementById('open-settings');
  const closeSettingsBtn = document.getElementById('close-settings');

  // settings inputs
  const inPom = document.getElementById('t-pomodoro');
  const inShort = document.getElementById('t-short');
  const inLong = document.getElementById('t-long');
  const inAutoBreaks = document.getElementById('auto-breaks');
  const inAutoFocus = document.getElementById('auto-focus');
  const inTick = document.getElementById('tick-sound');
  const inChime = document.getElementById('chime-sound');

  const bgBtns = document.querySelectorAll('.bg-btn');
  const uploadBg = document.getElementById('upload-bg');
  const restoreDefaultsBtn = document.getElementById('restore-defaults');

  // state
  let settings = load('pomodoro.settings') || DEFAULTS;
  // ensure defaults present
  settings = Object.assign({}, DEFAULTS, settings);

  let mode = load('pomodoro.mode') || 'pomodoro'; // 'pomodoro' | 'short' | 'long'
  let secondsLeft = (settings[mode] || DEFAULTS[mode]) * 60;
  let running = false;

  // timing accuracy
  let tickTimer = null;
  let lastUpdate = null;

  // audio
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  function playBeep(freq = 880, dur = 120) {
    try {
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur/1000);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur/1000 + 0.02);
    } catch (e) { /* ignore */ }
  }

  // helper
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }

  // UI sync
  function syncSettingsToUI() {
    inPom.value = settings.pomodoro;
    inShort.value = settings.short;
    inLong.value = settings.long;
    inAutoBreaks.checked = !!settings.autoStartBreaks;
    inAutoFocus.checked = !!settings.autoStartFocus;
    inTick.checked = !!settings.tickSound;
    inChime.checked = !!settings.chimeSound;
    // background
    app.style.backgroundImage = `url("${settings.background || DEFAULTS.background}")`;
    // active bg button highlight
    bgBtns.forEach(b => {
      if (b.dataset.url === settings.background) {
        b.classList.add('active-bg');
        b.style.outline = '2px solid rgba(255,255,255,0.9)';
      } else {
        b.style.outline = 'none';
      }
    });
  }

  function mmss(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function setMode(newMode, options = {}) {
    mode = newMode;
    save('pomodoro.mode', mode);
    // highlight button
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    // set seconds
    secondsLeft = (settings[mode] || DEFAULTS[mode]) * 60;
    updateDisplay();
    if (options.autostart) {
      start();
    } else {
      stopTicking();
    }
  }

  function updateDisplay() {
    timerDisplay.textContent = mmss(secondsLeft);
    const total = (settings[mode] || DEFAULTS[mode]) * 60;
    const pct = total ? Math.max(0, Math.min(100, 100 * (1 - secondsLeft / total))) : 0;
    progressEl.style.width = pct + '%';
    startPauseBtn.textContent = running ? 'Pause' : 'Start';
  }

  function tickStep() {
    const now = Date.now();
    if (!lastUpdate) lastUpdate = now;
    const dt = (now - lastUpdate) / 1000;
    if (dt >= 0.25) { // update at least 4x per second for smoothness
      // subtract exact seconds
      secondsLeft -= dt;
      lastUpdate = now;
      const prevSecondsFloor = Math.ceil(secondsLeft + dt);
      const nowSecondsFloor = Math.ceil(secondsLeft);
      // play tick on integer second boundary if enabled
      if (settings.tickSound && nowSecondsFloor < prevSecondsFloor) {
        playBeep(660, 30);
      }
      if (secondsLeft <= 0) {
        secondsLeft = 0;
        onSessionEnd();
      }
      updateDisplay();
    }
  }

  function start() {
    if (!running) {
      running = true;
      saveState();
      lastUpdate = Date.now();
      // resume audio context on user gesture if needed
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(()=>{});
      }
      if (!tickTimer) tickTimer = setInterval(tickStep, 250);
      updateDisplay();
    }
  }
  function pause() {
    running = false;
    stopTicking();
    updateDisplay();
    saveState();
  }
  function stopTicking() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    lastUpdate = null;
  }
  function toggleStartPause(){ running ? pause() : start(); }

  function reset() {
    running = false;
    secondsLeft = (settings[mode] || DEFAULTS[mode]) * 60;
    stopTicking();
    updateDisplay();
    saveState();
  }

  function skip() {
    running = false;
    const next = (mode === 'pomodoro') ? 'short' : 'pomodoro';
    setMode(next, { autostart: false });
    saveState();
  }

  function onSessionEnd() {
    stopTicking();
    running = false;
    if (settings.chimeSound) {
      // tri-tone chime
      playBeep(660, 140);
      setTimeout(()=>playBeep(880, 160), 170);
      setTimeout(()=>playBeep(660, 200), 360);
    }
    // auto advance
    const isFocus = mode === 'pomodoro';
    const shouldAuto = isFocus ? settings.autoStartBreaks : settings.autoStartFocus;
    const nextMode = isFocus ? 'short' : 'pomodoro';
    setTimeout(() => {
      setMode(nextMode, { autostart: !!shouldAuto });
    }, 600);
  }

  function saveState() {
    save('pomodoro.settings', settings);
    save('pomodoro.mode', mode);
    save('pomodoro.running', running);
    save('pomodoro.secondsLeft', secondsLeft);
  }

  // handlers
  startPauseBtn.addEventListener('click', () => {
    toggleStartPause();
    saveState();
  });
  resetBtn.addEventListener('click', () => { reset(); });
  skipBtn.addEventListener('click', () => { skip(); });

  modeButtons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // settings panel open/close
  openSettingsBtn.addEventListener('click', () => {
    settingsPanel.setAttribute('aria-hidden', 'false');
  });
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.setAttribute('aria-hidden', 'true');
  });

  // settings inputs -> update settings
  function applySettingsFromUI() {
    const p = parseInt(inPom.value) || DEFAULTS.pomodoro;
    const s = parseInt(inShort.value) || DEFAULTS.short;
    const l = parseInt(inLong.value) || DEFAULTS.long;
    settings.pomodoro = Math.max(1, Math.min(180, p));
    settings.short = Math.max(1, Math.min(180, s));
    settings.long = Math.max(1, Math.min(180, l));
    settings.autoStartBreaks = !!inAutoBreaks.checked;
    settings.autoStartFocus = !!inAutoFocus.checked;
    settings.tickSound = !!inTick.checked;
    settings.chimeSound = !!inChime.checked;
    save('pomodoro.settings', settings);
    // when durations change, adjust secondsLeft to new value for current mode
    secondsLeft = (settings[mode] || DEFAULTS[mode]) * 60;
    updateDisplay();
  }

  [inPom, inShort, inLong].forEach(inp => inp.addEventListener('change', applySettingsFromUI));
  [inAutoBreaks, inAutoFocus, inTick, inChime].forEach(inp => inp.addEventListener('change', applySettingsFromUI));

  // background presets
  bgBtns.forEach(b => {
    b.addEventListener('click', () => {
      const url = b.dataset.url;
      if (url) {
        settings.background = url;
        syncSettingsToUI();
        save('pomodoro.settings', settings);
      }
    });
  });

  uploadBg.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    settings.background = url;
    syncSettingsToUI();
    save('pomodoro.settings', settings);
  });

  restoreDefaultsBtn.addEventListener('click', () => {
    settings = Object.assign({}, DEFAULTS);
    syncSettingsToUI();
    setMode('pomodoro');
    save('pomodoro.settings', settings);
  });

  // keyboard
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // ignore typing
    if (e.code === 'Space') { e.preventDefault(); toggleStartPause(); saveState(); }
    if (e.key.toLowerCase() === 'r') { reset(); }
    if (e.key.toLowerCase() === 's') { skip(); }
  });

  // init from storage
  function initFromStorage() {
    const savedSettings = load('pomodoro.settings');
    if (savedSettings) settings = Object.assign({}, DEFAULTS, savedSettings);
    const savedMode = load('pomodoro.mode');
    if (savedMode) mode = savedMode;
    const savedRunning = load('pomodoro.running');
    const savedSeconds = load('pomodoro.secondsLeft');

    if (typeof savedSeconds === 'number') secondsLeft = savedSeconds;
    else secondsLeft = (settings[mode] || DEFAULTS[mode]) * 60;

    syncSettingsToUI();
    // ensure UI mode highlight and display
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    updateDisplay();

    // resume if saved running true
    if (savedRunning) {
      start();
    }
  }

  // expose for debugging (optional)
  window._pomodoro = {
    getState: () => ({ mode, secondsLeft, running, settings })
  };

  // start
  initFromStorage();

})();
