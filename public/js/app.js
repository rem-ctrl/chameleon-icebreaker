/**
 * BS-IT/CS General Assembly Icebreaker Client Application
 * Pure Stroke Papercraft & Camouflage Hide-and-Seek
 */

const socket = io();

// Avatar Shapes (100% SVG vectors, zero emojis)
const AVATAR_SHAPES = {
  star: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><polygon points="12 2 15 8.5 22 9.3 17 14.2 18.5 21.3 12 17.7 5.5 21.3 7 14.2 2 9.3 9 8.5 12 2"></polygon></svg>`,
  chameleon: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><circle cx="8.5" cy="9.5" r="1.5" fill="#231f20"/><circle cx="15.5" cy="9.5" r="1.5" fill="#231f20"/><path d="M8 15s1.5 2 4 2 4-2 4-2" fill="none" stroke="#231f20" stroke-width="2"/></svg>`,
  diamond: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><polygon points="12 2 22 12 12 22 2 12 12 2"></polygon></svg>`,
  crown: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><path d="M2 4l3 12 h14l3-12l-5 7l-5-9-5 9l-5-7z"/><rect x="5" y="18" width="14" height="3" rx="1"/></svg>`,
  lightning: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><path d="M12 22 s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" fill="#ffffff"/><circle cx="12" cy="12" r="2" fill="#231f20"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="#231f20" stroke-width="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 c1.74 0 3.41 .81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
};

let myProfile = {
  name: 'Player',
  avatar: { color: '#e76f51', shape: 'star' }
};

let currentRoom = null;
let isHost = false;
let isSpectator = false;
let chameleonCanvas = null;
let currentSceneId = 'random';

window.audioManager = new AudioManager();

const PALETTE = [
  '#231f20', '#ffffff', '#7f8c8d', '#5d4037',
  '#2d5a27', '#4e873b', '#86c232', '#a3c944',
  '#1d3557', '#457b9d', '#a8dadc', '#2a9d8f',
  '#e63946', '#f72585', '#b1179e', '#7209b7',
  '#e76f51', '#f4a261', '#e9c46a', '#ffd166',
  '#d4a373', '#c59263', '#8d5b4c', '#5c3d2e'
];

document.addEventListener('DOMContentLoaded', () => {
  const canvasEl = document.getElementById('gameCanvas');
  chameleonCanvas = new ChameleonCanvas(canvasEl);

  initPalette();
  initAvatarBuilder();
  initDrawingTools();
  initPoseControls();
  initScenePicker();
  initChat();
  initAudioControls();
  initRulesModal();
  bindSocketEvents();
});

function initPalette() {
  const container = document.getElementById('colorSwatches');
  if (!container) return;
  container.innerHTML = '';
  PALETTE.forEach((col, idx) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (idx === 4 ? ' active' : '');
    swatch.style.backgroundColor = col;
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      chameleonCanvas.brushColor = col;
      chameleonCanvas.tool = 'brush';
      updateToolButtons('brush');
      const customPicker = document.getElementById('customColorPicker');
      if (customPicker) customPicker.value = col;
      if (window.audioManager) window.audioManager.playClick();
    });
    container.appendChild(swatch);
  });

  const customPicker = document.getElementById('customColorPicker');
  if (customPicker) {
    customPicker.addEventListener('input', (e) => {
      chameleonCanvas.brushColor = e.target.value;
      chameleonCanvas.tool = 'brush';
      updateToolButtons('brush');
    });
  }
}

function initAvatarBuilder() {
  const preview = document.getElementById('avatarPreview');
  const nameInput = document.getElementById('playerNameInput');
  const shapesGrid = document.getElementById('avatarShapesGrid');

  function updateAvatarPreview() {
    if (!preview) return;
    preview.style.backgroundColor = myProfile.avatar.color;
    const svgCode = AVATAR_SHAPES[myProfile.avatar.shape] || AVATAR_SHAPES.star;
    preview.innerHTML = svgCode;
  }

  if (shapesGrid) {
    shapesGrid.innerHTML = '';
    Object.keys(AVATAR_SHAPES).forEach((shapeKey) => {
      const btn = document.createElement('button');
      btn.className = 'avatar-shape-btn' + (shapeKey === myProfile.avatar.shape ? ' active' : '');
      btn.innerHTML = `<span style="width:22px; height:22px; display:inline-flex;">${AVATAR_SHAPES[shapeKey]}</span>`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        myProfile.avatar.shape = shapeKey;
        updateAvatarPreview();
        if (window.audioManager) window.audioManager.playClick();
      });
      shapesGrid.appendChild(btn);
    });
  }

  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      myProfile.name = e.target.value.trim() || 'Player';
    });
  }

  document.querySelectorAll('.avatar-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      myProfile.avatar.color = btn.dataset.color;
      updateAvatarPreview();
      if (window.audioManager) window.audioManager.playClick();
    });
  });

  updateAvatarPreview();
}

function updateToolButtons(activeTool) {
  document.querySelectorAll('.tool-btn').forEach(btn => {
    if (btn.id === 'toolBrush') btn.classList.toggle('active', activeTool === 'brush');
    if (btn.id === 'toolEraser') btn.classList.toggle('active', activeTool === 'eraser');
    if (btn.id === 'toolEyedropper') btn.classList.toggle('active', activeTool === 'eyedropper');
  });
}

function initDrawingTools() {
  const brushBtn = document.getElementById('toolBrush');
  const eraserBtn = document.getElementById('toolEraser');
  const eyedropperBtn = document.getElementById('toolEyedropper');
  const undoBtn = document.getElementById('toolUndo');
  const clearBtn = document.getElementById('toolClear');
  const submitBtn = document.getElementById('submitEarlyBtn');

  if (brushBtn) brushBtn.addEventListener('click', () => {
    chameleonCanvas.tool = 'brush';
    updateToolButtons('brush');
    if (window.audioManager) window.audioManager.playClick();
  });

  if (eraserBtn) eraserBtn.addEventListener('click', () => {
    chameleonCanvas.tool = 'eraser';
    updateToolButtons('eraser');
    if (window.audioManager) window.audioManager.playClick();
  });

  if (eyedropperBtn) eyedropperBtn.addEventListener('click', () => {
    chameleonCanvas.tool = 'eyedropper';
    updateToolButtons('eyedropper');
    if (window.audioManager) window.audioManager.playClick();
  });

  if (undoBtn) undoBtn.addEventListener('click', () => {
    chameleonCanvas.undo();
    if (window.audioManager) window.audioManager.playClick();
  });

  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (confirm('Clear your entire painting?')) {
      chameleonCanvas.clearPaint();
      if (window.audioManager) window.audioManager.playClick();
    }
  });

  if (submitBtn) submitBtn.addEventListener('click', () => {
    submitMyPainting();
  });

  // Zoom Controls (Toolbar & Floating Widget)
  const zoomInBtn = document.getElementById('btnZoomIn');
  const zoomOutBtn = document.getElementById('btnZoomOut');
  const zoomResetBtn = document.getElementById('btnZoomReset');
  const zoomDisplay = document.getElementById('zoomLevelDisplay');

  const tbZoomIn = document.getElementById('toolbarZoomIn');
  const tbZoomOut = document.getElementById('toolbarZoomOut');
  const tbZoomReset = document.getElementById('toolbarZoomReset');
  const tbZoomDisplay = document.getElementById('toolbarZoomDisplay');

  function doZoomIn() {
    chameleonCanvas.zoomIn(0.5);
    if (window.audioManager) window.audioManager.playClick();
  }

  function doZoomOut() {
    chameleonCanvas.zoomOut(0.5);
    if (window.audioManager) window.audioManager.playClick();
  }

  function doZoomReset() {
    chameleonCanvas.resetZoom();
    if (window.audioManager) window.audioManager.playClick();
  }

  if (zoomInBtn) zoomInBtn.addEventListener('click', doZoomIn);
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', doZoomOut);
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', doZoomReset);

  if (tbZoomIn) tbZoomIn.addEventListener('click', doZoomIn);
  if (tbZoomOut) tbZoomOut.addEventListener('click', doZoomOut);
  if (tbZoomReset) tbZoomReset.addEventListener('click', doZoomReset);

  chameleonCanvas.onZoomChange = (zm) => {
    const formattedPct = Math.round(zm * 100) + '%';
    const formattedRatio = zm.toFixed(1) + 'x';
    if (zoomDisplay) zoomDisplay.textContent = formattedPct;
    if (tbZoomDisplay) tbZoomDisplay.textContent = formattedPct;
  };

  chameleonCanvas.onColorPicked = (hex) => {
    const customPicker = document.getElementById('customColorPicker');
    if (customPicker) customPicker.value = hex;

    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.remove('active');
    });

    const statusText = document.getElementById('gameStatusText');
    if (statusText && chameleonCanvas.mode === 'PAINT') {
      statusText.textContent = `Sampled color: ${hex.toUpperCase()}! Ready to paint.`;
    }
  };

  chameleonCanvas.onToolChange = (tool) => {
    updateToolButtons(tool);
  };

  function updateBrushSize(sz) {
    chameleonCanvas.brushSize = sz;
  }

  document.querySelectorAll('.size-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateBrushSize(parseInt(btn.dataset.size, 10));
      if (window.audioManager) window.audioManager.playClick();
    });
  });
}

function initPoseControls() {
  const poseContainer = document.getElementById('poseCardsContainer');
  const poses = [
    { id: 'normalstand', name: 'Stand', file: 'normalstand.png' },
    { id: 'ballpose', name: 'Curl', file: 'ballpose.png' },
    { id: 'handoverhead', name: 'Reach', file: 'handoverhead.png' },
    { id: 'laydown', name: 'Flat', file: 'laydown.png' },
    { id: 'sitpose', name: 'Sit', file: 'sitpose.png' },
    { id: 'tposestand', name: 'T-Pose', file: 'tposestand.png' }
  ];

  if (poseContainer) {
    poseContainer.innerHTML = '';
    poses.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'pose-card-btn' + (idx === 0 ? ' active' : '');
      card.innerHTML = `
        <img src="assets/poses/${p.file}" alt="${p.name}">
        <span>${p.name}</span>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.pose-card-btn').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        chameleonCanvas.setPoseId(p.id);
        if (window.audioManager) window.audioManager.playClick();
      });
      poseContainer.appendChild(card);
    });
  }

  const flipBtn = document.getElementById('btnFlipPose');
  if (flipBtn) flipBtn.addEventListener('click', () => {
    chameleonCanvas.pose.flipX = !chameleonCanvas.pose.flipX;
    chameleonCanvas.render();
    if (window.audioManager) window.audioManager.playClick();
  });

  const rotateBtn = document.getElementById('btnRotatePose');
  if (rotateBtn) rotateBtn.addEventListener('click', () => {
    chameleonCanvas.pose.rotation = (chameleonCanvas.pose.rotation + 90) % 360;
    chameleonCanvas.render();
    if (window.audioManager) window.audioManager.playClick();
  });

  // Scaling Controls
  const scaleDownBtn = document.getElementById('btnScaleDown');
  const scaleUpBtn = document.getElementById('btnScaleUp');
  const scaleDisplay = document.getElementById('poseScaleDisplay');

  function updateScaleDisplay(sc) {
    if (scaleDisplay) scaleDisplay.textContent = Math.round(sc * 100) + '%';
  }

  if (scaleDownBtn) {
    scaleDownBtn.addEventListener('click', () => {
      const sc = chameleonCanvas.changeScale(-0.1);
      updateScaleDisplay(sc);
      if (window.audioManager) window.audioManager.playClick();
    });
  }

  if (scaleUpBtn) {
    scaleUpBtn.addEventListener('click', () => {
      const sc = chameleonCanvas.changeScale(0.1);
      updateScaleDisplay(sc);
      if (window.audioManager) window.audioManager.playClick();
    });
  }

  chameleonCanvas.onScaleChange = (sc) => {
    updateScaleDisplay(sc);
  };

  const lockBtn = document.getElementById('btnLockPoseAndPaint');
  if (lockBtn) lockBtn.addEventListener('click', () => {
    chameleonCanvas.lockPose();
    document.getElementById('poseRibbon').classList.add('hidden');
    document.getElementById('drawingToolbar').classList.remove('hidden');
    const zoomWidget = document.getElementById('mobileZoomWidget');
    if (zoomWidget) zoomWidget.classList.remove('hidden');
    document.getElementById('phasePill').textContent = 'PAINT';
    document.getElementById('gameStatusText').textContent = 'Paint over your humanoid figure to camouflage it!';
    if (window.audioManager) window.audioManager.playSuccess();
  });
}

function initScenePicker() {
  const sceneCardsGrid = document.getElementById('sceneCardsGrid');
  const openBtn = document.getElementById('btnScenePicker');
  const closeBtn = document.getElementById('btnCloseScenePicker');
  const modal = document.getElementById('scenePickerOverlay');

  function refreshScenePicker() {
    if (!sceneCardsGrid) return;
    sceneCardsGrid.innerHTML = '';

    fetch('/api/backgrounds')
      .then(res => res.json())
      .then(data => {
        const backgrounds = (data && data.backgrounds) || [];

        // 1. Add Dynamic Background Image Cards
        backgrounds.forEach((bgUrl, idx) => {
          const fileName = bgUrl.split('/').pop().replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          const card = document.createElement('div');
          card.className = 'scene-select-card';
          card.innerHTML = `
            <div class="scene-preview-box" style="background-image: url('${bgUrl}'); background-size: cover; background-position: center; color:#ffffff;">
              <strong style="background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px;">Photo ${idx + 1}</strong>
            </div>
            <span>${fileName.substring(0, 18)}</span>
          `;
          card.addEventListener('click', () => {
            document.querySelectorAll('.scene-select-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            chameleonCanvas.setBackgroundImage(bgUrl);
            modal.classList.add('hidden');
            if (window.audioManager) window.audioManager.playClick();
          });
          sceneCardsGrid.appendChild(card);
        });

        // 2. Add Procedural Scenes
        if (window.SCENES) {
          const sceneThemeColors = {
            jungle: '#2d5a27',
            library: '#5d4037',
            coral: '#1d3557',
            castle: '#457b9d',
            candyland: '#f72585',
            campfire: '#e76f51'
          };
          Object.keys(window.SCENES).forEach(sk => {
            const sc = window.SCENES[sk];
            const card = document.createElement('div');
            card.className = 'scene-select-card';
            const bgCol = (sc.themeColors && sc.themeColors[0]) || sceneThemeColors[sk] || '#2d5a27';
            card.innerHTML = `
              <div class="scene-preview-box" style="background: ${bgCol}; color:#ffffff;">
                <strong>${sc.name}</strong>
              </div>
              <span>${sc.name}</span>
            `;
            card.addEventListener('click', () => {
              document.querySelectorAll('.scene-select-card').forEach(c => c.classList.remove('active'));
              card.classList.add('active');
              currentSceneId = sk;
              chameleonCanvas.setScene(sk);
              modal.classList.add('hidden');
              if (window.audioManager) window.audioManager.playClick();
            });
            sceneCardsGrid.appendChild(card);
          });
        }
      })
      .catch(() => {
        if (window.SCENES) {
          Object.keys(window.SCENES).forEach(sk => {
            const sc = window.SCENES[sk];
            const card = document.createElement('div');
            card.className = 'scene-select-card';
            card.innerHTML = `
              <div class="scene-preview-box" style="background: #2d5a27; color:#ffffff;">
                <strong>${sc.name}</strong>
              </div>
              <span>${sc.name}</span>
            `;
            card.addEventListener('click', () => {
              chameleonCanvas.setScene(sk);
              modal.classList.add('hidden');
            });
            sceneCardsGrid.appendChild(card);
          });
        }
      });
  }

  refreshScenePicker();

  if (openBtn) openBtn.addEventListener('click', () => {
    refreshScenePicker();
    modal.classList.remove('hidden');
    if (window.audioManager) window.audioManager.playClick();
  });

  if (closeBtn) closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    if (window.audioManager) window.audioManager.playClick();
  });
}

function initChat() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('btnSendChat');

  const sendMessage = () => {
    if (!input) return;
    const text = input.value.trim();
    if (text) {
      socket.emit('send_chat', {
        text,
        roomCode: currentRoom ? currentRoom.code : null,
        playerName: myProfile ? myProfile.name : 'Player',
        avatar: myProfile ? myProfile.avatar : null
      });
      input.value = '';
    }
  };

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  }
}

function initAudioControls() {
  const muteBtn = document.getElementById('btnSoundToggle');
  const iconWrap = document.getElementById('soundIconSvg');

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = window.audioManager.toggleMute();
      if (isMuted) {
        iconWrap.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        `;
        muteBtn.style.opacity = '0.67';
      } else {
        iconWrap.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        `;
        muteBtn.style.opacity = '1';
        window.audioManager.playClick();
      }
    });
  }
}

function initRulesModal() {
  const openBtn = document.getElementById('btnHowToPlay');
  const closeBtn = document.getElementById('btnCloseRules');
  const modal = document.getElementById('howToPlayOverlay');

  if (openBtn) openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    if (window.audioManager) window.audioManager.playClick();
  });

  if (closeBtn) closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    if (window.audioManager) window.audioManager.playClick();
  });
}

function bindSocketEvents() {
  const createBtn = document.getElementById('createRoomBtn');
  const joinBtn = document.getElementById('joinRoomBtn');
  const startBtn = document.getElementById('startGameBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const copyBtn = document.getElementById('btnCopyCode');
  const lobbyCopyBtn = document.getElementById('btnLobbyCopyCode');

  function copyRoomCode(targetBtn) {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom).then(() => {
      if (targetBtn) {
        const origHTML = targetBtn.innerHTML;
        targetBtn.textContent = 'Copied!';
        setTimeout(() => { targetBtn.innerHTML = origHTML; }, 1500);
      }
    });
    if (window.audioManager) window.audioManager.playClick();
  }

  if (copyBtn) copyBtn.addEventListener('click', () => copyRoomCode(copyBtn));
  if (lobbyCopyBtn) lobbyCopyBtn.addEventListener('click', () => copyRoomCode(lobbyCopyBtn));

  if (createBtn) createBtn.addEventListener('click', () => {
    if (window.audioManager) window.audioManager.playClick();
    const sceneSelect = document.getElementById('lobbySceneSelect');
    const sceneVal = (sceneSelect && sceneSelect.value) ? sceneSelect.value : 'random';
    const pName = myProfile.name || 'Player';
    
    socket.emit('create_room', { name: pName, playerName: pName, avatar: myProfile.avatar, sceneId: sceneVal }, (res) => {
      if (res && res.success) {
        currentRoom = res.roomCode;
        isHost = true;
        document.getElementById('mainMenuOverlay').classList.add('hidden');
        document.getElementById('lobbyOverlay').classList.remove('hidden');
        document.getElementById('roomCodeBadge').classList.remove('hidden');
        document.getElementById('headerRoomCode').textContent = res.roomCode;
        document.getElementById('lobbyCodeText').textContent = res.roomCode;
        document.getElementById('startGameBtn').classList.remove('hidden');
      }
    });
  });

  const lobbySceneSelect = document.getElementById('lobbySceneSelect');
  if (lobbySceneSelect) {
    lobbySceneSelect.addEventListener('change', (e) => {
      if (isHost && currentRoom) {
        socket.emit('update_lobby_settings', { sceneId: e.target.value });
      }
    });
  }

  if (joinBtn) joinBtn.addEventListener('click', () => {
    const codeInput = document.getElementById('joinRoomCodeInput');
    const errorMsg = document.getElementById('joinErrorMsg');
    const code = (codeInput.value || '').trim().toUpperCase();
    const pName = myProfile.name || 'Player';

    if (code.length !== 4) {
      errorMsg.textContent = 'Please enter a 4-letter room code.';
      errorMsg.classList.remove('hidden');
      return;
    }

    if (window.audioManager) window.audioManager.playClick();
    socket.emit('join_room', { roomCode: code, name: pName, playerName: pName, avatar: myProfile.avatar }, (res) => {
      if (res && res.success) {
        currentRoom = res.roomCode;
        isHost = false;
        document.getElementById('mainMenuOverlay').classList.add('hidden');
        document.getElementById('lobbyOverlay').classList.remove('hidden');
        document.getElementById('roomCodeBadge').classList.remove('hidden');
        document.getElementById('headerRoomCode').textContent = res.roomCode;
        document.getElementById('lobbyCodeText').textContent = res.roomCode;
        document.getElementById('startGameBtn').classList.add('hidden');
      } else {
        errorMsg.textContent = (res && res.message) ? res.message : 'Failed to join room.';
        errorMsg.classList.remove('hidden');
      }
    });
  });

  if (startBtn) startBtn.addEventListener('click', () => {
    if (window.audioManager) window.audioManager.playClick();
    socket.emit('start_game');
  });

  if (playAgainBtn) playAgainBtn.addEventListener('click', () => {
    if (window.audioManager) window.audioManager.playClick();
    socket.emit('play_again');
  });

  const specToggleWrap = document.getElementById('hostSpectatorToggleWrap');
  const specCheckbox = document.getElementById('hostSpectatorCheckbox');

  if (specCheckbox) {
    specCheckbox.addEventListener('change', (e) => {
      if (isHost && currentRoom) {
        socket.emit('toggle_host_spectator', { isSpectator: e.target.checked });
      }
    });
  }

  socket.on('room_updated', (data) => {
    if (specToggleWrap) {
      if (isHost) {
        specToggleWrap.classList.remove('hidden');
      } else {
        specToggleWrap.classList.add('hidden');
      }
    }
    if (specCheckbox && data && data.hostIsSpectator !== undefined) {
      specCheckbox.checked = !!data.hostIsSpectator;
    }
    if (isHost && data && data.hostIsSpectator !== undefined) {
      isSpectator = !!data.hostIsSpectator;
    }

    updateScoreboard(data);
    updateLobby(data);

    if (isSpectator && data.state === 'PAINTING') {
      updateSpectatorHub(data);
    }
  });

  socket.on('game_started', (data) => {
    document.getElementById('lobbyOverlay').classList.add('hidden');
    document.getElementById('podiumOverlay').classList.add('hidden');
    const spectatorHub = document.getElementById('hostSpectatorHub');
    const zoomWidget = document.getElementById('mobileZoomWidget');
    if (zoomWidget) zoomWidget.classList.add('hidden');

    const amISpectator = (data && data.isHostSpectator) || (isHost && isSpectator);
    isSpectator = amISpectator;

    if (amISpectator) {
      document.getElementById('poseRibbon').classList.add('hidden');
      document.getElementById('drawingToolbar').classList.add('hidden');
      document.getElementById('guessPromptRibbon').classList.add('hidden');
      if (spectatorHub) spectatorHub.classList.remove('hidden');

      document.getElementById('phasePill').textContent = 'STREAM HUB';
      document.getElementById('gameStatusText').textContent = 'Contestants are camouflaging their figures secretly...';

      const bgImage = (data && (data.backgroundImage || data.room?.backgroundImage)) || null;
      const sceneKey = (data && (data.sceneId || data.room?.sceneId)) || currentSceneId;
      currentSceneId = sceneKey;

      chameleonCanvas.resetAll(bgImage || currentSceneId);
      if (data.room) updateSpectatorHub(data.room);
    } else {
      if (spectatorHub) spectatorHub.classList.add('hidden');
      document.getElementById('poseRibbon').classList.remove('hidden');
      document.getElementById('drawingToolbar').classList.add('hidden');
      document.getElementById('guessPromptRibbon').classList.add('hidden');

      // Re-enable drawing tools for new match
      document.querySelectorAll('#drawingToolbar button').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      });
      const customPicker = document.getElementById('customColorPicker');
      if (customPicker) customPicker.disabled = false;

      document.getElementById('phasePill').textContent = 'POSE';
      document.getElementById('gameStatusText').textContent = 'Drag & pose your figure on the canvas';

      const submitBtn = document.getElementById('submitEarlyBtn');
      if (submitBtn) {
        submitBtn.innerHTML = `
          <div class="btn-content-wrap">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>I'M HIDDEN!</span>
          </div>
        `;
        submitBtn.disabled = false;
      }

      const bgImage = (data && (data.backgroundImage || data.room?.backgroundImage)) || null;
      const sceneKey = (data && (data.sceneId || data.room?.sceneId)) || currentSceneId;
      currentSceneId = sceneKey;

      chameleonCanvas.resetAll(bgImage || currentSceneId);
    }

    if (window.audioManager) window.audioManager.playSuccess();
  });

  socket.on('timer_tick', (data) => {
    const mins = Math.floor(data.timeLeft / 60);
    const secs = data.timeLeft % 60;
    document.getElementById('timerClock').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const percent = Math.max(0, Math.min(100, (data.timeLeft / data.totalTime) * 100));
    const bar = document.getElementById('timerBarFill');
    if (bar) {
      bar.style.width = percent + '%';
      if (data.timeLeft <= 5) {
        bar.classList.add('warning');
        if (window.audioManager) window.audioManager.playHurry();
      } else {
        bar.classList.remove('warning');
      }
    }
  });

  socket.on('painting_time_up', () => {
    if (!isSpectator) {
      submitMyPainting();
    }
  });

  socket.on('time_up_paint', () => {
    if (!isSpectator) {
      submitMyPainting();
    }
  });

  socket.on('start_guess_round', (data) => {
    const spectatorHub = document.getElementById('hostSpectatorHub');
    if (spectatorHub) spectatorHub.classList.add('hidden');
    document.getElementById('poseRibbon').classList.add('hidden');
    document.getElementById('drawingToolbar').classList.add('hidden');
    document.getElementById('guessPromptRibbon').classList.remove('hidden');
    const zoomWidget = document.getElementById('mobileZoomWidget');
    if (zoomWidget) zoomWidget.classList.add('hidden');

    const isMyDrawing = data.artistId === socket.id;

    if (isSpectator) {
      document.getElementById('phasePill').textContent = 'SPOT ' + data.roundIndex + '/' + data.totalRounds;
      document.getElementById('gameStatusText').textContent = `Spotting ${data.artistName}'s hidden figure!`;
      const promptBanner = document.querySelector('#guessPromptRibbon .guess-hint-text span');
      if (promptBanner) {
        promptBanner.textContent = `Broadcasting ${data.artistName}'s disguise to the livestream! Watch classmates search live.`;
      }
      chameleonCanvas.setGuessImage(data.imageData, true);
    } else if (isMyDrawing) {
      document.getElementById('phasePill').textContent = 'YOUR ART ' + data.roundIndex + '/' + data.totalRounds;
      document.getElementById('gameStatusText').textContent = 'This is your camouflage drawing! Watch your classmates search.';
      const promptBanner = document.querySelector('#guessPromptRibbon .guess-hint-text span');
      if (promptBanner) {
        promptBanner.textContent = 'This is your disguised figure! Sit back and see how many classmates you can fool.';
      }
      chameleonCanvas.setGuessImage(data.imageData, true);
    } else {
      document.getElementById('phasePill').textContent = 'SPOT ' + data.roundIndex + '/' + data.totalRounds;
      document.getElementById('gameStatusText').textContent = `Spot ${data.artistName}'s hidden figure!`;
      const promptBanner = document.querySelector('#guessPromptRibbon .guess-hint-text span');
      if (promptBanner) {
        promptBanner.textContent = 'Click anywhere on the canvas to spot the hidden figure! (-25 pts penalty for wrong guesses)';
      }
      chameleonCanvas.setGuessImage(data.imageData, false);
      chameleonCanvas.onGuessClick = (coords) => {
        socket.emit('submit_guess', coords);
      };
    }

    if (window.audioManager) window.audioManager.playPop();
  });

  socket.on('guess_feedback', (fb) => {
    if (fb.success) {
      if (chameleonCanvas) chameleonCanvas.hasFound = true;
      const promptBanner = document.querySelector('#guessPromptRibbon .guess-hint-text span');
      if (promptBanner) {
        promptBanner.textContent = `You found it! (#${fb.rank} Place, +${fb.points} pts). Waiting for remaining classmates...`;
      }
      if (window.audioManager) window.audioManager.playSuccess();
    } else if (fb.message) {
      if (window.audioManager) window.audioManager.playFail();
    }
  });

  socket.on('reveal_round', (data) => {
    document.getElementById('gameStatusText').textContent = 'Hidden spot revealed!';
    chameleonCanvas.setRevealData(data.poseData);
    if (window.audioManager) window.audioManager.playFanfare();
  });

  socket.on('game_over', (data) => {
    const spectatorHub = document.getElementById('hostSpectatorHub');
    if (spectatorHub) spectatorHub.classList.add('hidden');
    document.getElementById('poseRibbon').classList.add('hidden');
    document.getElementById('drawingToolbar').classList.add('hidden');
    document.getElementById('guessPromptRibbon').classList.add('hidden');
    const zoomWidget = document.getElementById('mobileZoomWidget');
    if (zoomWidget) zoomWidget.classList.add('hidden');
    document.getElementById('phasePill').textContent = 'FINISH';
    document.getElementById('gameStatusText').textContent = 'Match Completed!';

    renderPodium(data.leaderboard);
    document.getElementById('podiumOverlay').classList.remove('hidden');

    const plyAgainBtn = document.getElementById('playAgainBtn');
    const podiumWaitMsg = document.getElementById('podiumWaitingMsg');

    if (isHost) {
      plyAgainBtn.classList.remove('hidden');
      podiumWaitMsg.classList.add('hidden');
    } else {
      plyAgainBtn.classList.add('hidden');
      podiumWaitMsg.classList.remove('hidden');
    }

    if (window.audioManager) window.audioManager.playFanfare();
  });

  socket.on('return_to_lobby', () => {
    const spectatorHub = document.getElementById('hostSpectatorHub');
    if (spectatorHub) spectatorHub.classList.add('hidden');
    document.getElementById('podiumOverlay').classList.add('hidden');
    document.getElementById('lobbyOverlay').classList.remove('hidden');
    document.getElementById('phasePill').textContent = 'LOBBY';
    document.getElementById('gameStatusText').textContent = 'Gathering players in lobby...';
  });

  socket.on('chat_message', (msg) => {
    appendChatMessage(msg);
  });
}

function updateSpectatorHub(roomData) {
  const grid = document.getElementById('spectatorPlayerGrid');
  const countText = document.getElementById('spectatorProgressText');
  const barFill = document.getElementById('spectatorProgressBarFill');
  if (!grid || !roomData) return;

  const contestants = (roomData.players || []).filter(p => !p.isSpectator);
  const submittedCount = contestants.filter(p => p.submitted).length;
  const totalCount = contestants.length;

  if (countText) countText.textContent = `${submittedCount} / ${totalCount}`;
  if (barFill) {
    const pct = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;
    barFill.style.width = pct + '%';
  }

  grid.innerHTML = '';
  contestants.forEach(p => {
    const card = document.createElement('div');
    card.className = 'hub-player-card' + (p.submitted ? ' ready' : '');
    const avatarColor = (p.avatar && p.avatar.color) || '#e76f51';
    const avatarShape = (p.avatar && p.avatar.shape) ? p.avatar.shape : 'star';
    const avatarSvg = AVATAR_SHAPES[avatarShape] || AVATAR_SHAPES.star;

    card.innerHTML = `
      <div class="hub-player-avatar-chip" style="background: ${avatarColor};">
        <span style="width:20px; height:20px; display:inline-flex;">${avatarSvg}</span>
      </div>
      <div class="hub-player-name">${escapeHTML(p.name)}</div>
      <div class="hub-player-badge ${p.submitted ? 'ready' : 'painting'}">
        ${p.submitted ? 'HIDDEN' : 'PAINTING...'}
      </div>
    `;
    grid.appendChild(card);
  });
}

function submitMyPainting() {
  if (!chameleonCanvas || isSpectator) return;
  const submitBtn = document.getElementById('submitEarlyBtn');
  if (submitBtn) {
    submitBtn.textContent = 'Submitted!';
    submitBtn.disabled = true;
  }
  chameleonCanvas.isSubmitted = true;
  chameleonCanvas.lockPose();
  const zoomWidget = document.getElementById('mobileZoomWidget');
  if (zoomWidget) zoomWidget.classList.add('hidden');

  // Disable drawing toolbar buttons and inputs
  document.querySelectorAll('#drawingToolbar button').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
  });
  const customPicker = document.getElementById('customColorPicker');
  if (customPicker) customPicker.disabled = true;

  const statusText = document.getElementById('gameStatusText');
  if (statusText) {
    statusText.textContent = 'Disguise submitted! Waiting for other players...';
  }

  const imageData = chameleonCanvas.getCombinedImage();
  const poseData = chameleonCanvas.getNormalizedPoseData();

  socket.emit('submit_painting', { imageData, poseData });
  if (window.audioManager) window.audioManager.playSuccess();
}

function updateScoreboard(roomData) {
  const list = document.getElementById('playerList');
  const countBadge = document.getElementById('playerCountBadge');
  if (!list) return;

  if (countBadge) {
    const activeContestants = (roomData.players || []).filter(p => !p.isSpectator);
    countBadge.textContent = activeContestants.length + '/20';
  }

  list.innerHTML = '';
  const sorted = [...roomData.players].sort((a, b) => b.score - a.score);

  sorted.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'player-card' + (p.isArtist ? ' is-artist' : '') + (p.hasGuessed ? ' has-guessed' : '') + (p.isSpectator ? ' is-spectator' : '');

    const avatarColor = (p.avatar && p.avatar.color) || '#e76f51';
    const avatarShape = (p.avatar && p.avatar.shape) ? p.avatar.shape : 'star';
    const avatarSvg = AVATAR_SHAPES[avatarShape] || AVATAR_SHAPES.star;

    card.innerHTML = `
      <div class="player-rank">${p.isSpectator ? 'HOST' : '#' + (idx + 1)}</div>
      <div class="player-avatar-chip" style="background: ${avatarColor};">
        <span style="width:20px; height:20px; display:inline-flex;">${avatarSvg}</span>
      </div>
      <div class="player-info">
        <div class="player-name">
          ${escapeHTML(p.name)}
          ${p.isHost ? '<span class="host-badge">' + (p.isSpectator ? 'STREAMER' : 'HOST') + '</span>' : ''}
        </div>
        <div class="player-score">${p.isSpectator ? 'Spectating' : p.score + ' pts'}</div>
      </div>
      ${p.isSpectator ? '<div class="player-status-badge spectator">SPECTATOR</div>' : (p.hasGuessed ? '<div class="player-status-badge">FOUND!</div>' : (p.submitted && roomData.state === 'PAINTING' ? '<div class="player-status-badge ready">READY</div>' : ''))}
    `;
    list.appendChild(card);
  });
}

function updateLobby(roomData) {
  const grid = document.getElementById('lobbyPlayersGrid');
  const count = document.getElementById('lobbyPlayerCount');
  if (!grid) return;

  if (count) count.textContent = roomData.players.length;
  grid.innerHTML = '';

  roomData.players.forEach(p => {
    const chip = document.createElement('div');
    chip.style.cssText = `
      display: flex; align-items: center; gap: 8px; padding: 8px 14px;
      background: #ffffff; border: 2px solid #231f20; border-radius: 8px;
      font-weight: 700; font-size: 14px;
    `;

    const avatarColor = (p.avatar && p.avatar.color) || '#e76f51';
    const avatarShape = (p.avatar && p.avatar.shape) ? p.avatar.shape : 'star';
    const avatarSvg = AVATAR_SHAPES[avatarShape] || AVATAR_SHAPES.star;

    chip.innerHTML = `
      <span style="width:24px; height:24px; background: ${avatarColor}; border: 1.5px solid #231f20; border-radius: 6px; display:inline-flex; align-items:center; justify-content:center;">
        <span style="width:18px; height:18px; display:inline-flex;">${avatarSvg}</span>
      </span>
      <span>${escapeHTML(p.name)}</span>
      ${p.isHost ? '<span class="host-badge">HOST</span>' : ''}
    `;
    grid.appendChild(chip);
  });
}

function appendChatMessage(msg) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'chat-msg' + (msg.system ? ' system' : '') + (msg.highlight ? ' highlight' : '');

  if (msg.system) {
    div.textContent = msg.text;
  } else {
    const sender = escapeHTML(msg.senderName || 'Player');
    const text = escapeHTML(msg.text || '');
    div.innerHTML = `<b>${sender}:</b> ${text}`;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[tag] || tag));
}

function renderPodium(leaderboard) {
  const stand = document.getElementById('podiumStand');
  const table = document.getElementById('podiumRankingsTable');
  if (!stand || !table || !leaderboard) return;

  stand.innerHTML = '';
  table.innerHTML = '';

  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  stand.innerHTML = `
    ${second ? `
      <div class="podium-col">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">${escapeHTML(second.name)}</div>
        <div style="font-size: 12px; margin-bottom: 4px; color: var(--text-muted);">${second.score} pts</div>
        <div class="podium-pillar second">2nd</div>
      </div>
    ` : ''}
    ${first ? `
      <div class="podium-col">
        <div style="font-size: 16px; font-weight: 800; margin-bottom: 4px; color: var(--primary);">WINNER! ${escapeHTML(first.name)}</div>
        <div style="font-size: 14px; font-weight: 800; margin-bottom: 4px; color: var(--text-main);">${first.score} pts</div>
        <div class="podium-pillar first">1st</div>
      </div>
    ` : ''}
    ${third ? `
      <div class="podium-col">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">${escapeHTML(third.name)}</div>
        <div style="font-size: 12px; margin-bottom: 4px; color: var(--text-muted);">${third.score} pts</div>
        <div class="podium-pillar third">3rd</div>
      </div>
    ` : ''}
  `;

  let tableHTML = '<table>';
  leaderboard.forEach((p, i) => {
    tableHTML += `
      <tr>
        <td style="padding: 8px 12px; width: 30px; font-weight: 800; color: var(--text-muted);">#${i + 1}</td>
        <td style="padding: 8px 12px; font-weight: 700;">${escapeHTML(p.name)}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: var(--primary);">${p.score} pts</td>
      </tr>
    `;
  });
  tableHTML += '</table>';
  table.innerHTML = tableHTML;
}

window.submitMyPainting = submitMyPainting;
