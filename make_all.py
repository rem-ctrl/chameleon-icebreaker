import os

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Wrote {path}')

html_code = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chameleon - Hide &amp; Seek Paint Game</title>
  <link rel="stylesheet" href="/css/style.css">
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>

  <header>
    <div class="logo-container">
      <div class="logo-badge">🚎 CHAMELEON</div>
      <div id="roomCodeDisplay" class="header-status hidden">ROOM: <span id="currentRoomCodeText">----</span></div>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <div id="gameStatusText" class="header-status">Party Lobby</div>
      <button id="muteBtn" class="paper-btn buff">🔊 SFX</button>
    </div>
  </header>

  <div class="game-container">

    <!-- Left Sidebar -->
    <div class="scoreboard-sidebar paper-panel" style="padding: 12px;">
      <div style="font-size: 18px; font-weight: 700; border-bottom: 3px solid #231f20; padding-bottom: 6px; margin-bottom: 8px;">�� Leaderboard</div>
      <div id="playerList" class="player-list"></div>
    </div>

    <!-- Center Stage -->
    <div class="center-stage">

      <div id="gameTopBar" class="game-top-bar hidden">
        <div class="timer-box">
          <span>🍩</span>
          <span id="timerClock">3:50</span>
        </div>
        <div class="timer-bar-container">
          <div id="timerBarFill" class="timer-bar-fill"></div>
        </div>
        <button id="submitEarlyBtn" class="paper-btn success">Submit Early ✔</button>
      </div>

      <div id="poseRibbon" class="pose-ribbon hidden">
        <span style="font-weight: 700; font-size: 14px;">1. Choose Pose:</span>
        <div class="pose-item active" data-pose="normalstand">
          <img src="/assets/poses/normalstand.png" alt="Standing">
          <span>Standing</span>
        </div>
        <div class="pose-item" data-pose="ballpose">
          <img src="/assets/poses/ballpose.png" alt="Ball">
          <span>Tucked</span>
        </div>
        <div class="pose-item" data-pose="sitpose">
          <img src="/assets/poses/sitpose.png" alt="Sitting">
          <span>Sitting</span>
        </div>
        <div class="pose-item" data-pose="laydown">
          <img src="/assets/poses/laydown.png" alt="Lying">
          <span>Lying</span>
        </div>
        <div class="pose-item" data-pose="handoverhead">
          <img src="/assets/poses/handoverhead.png" alt="Reaching">
          <span>Reaching</span>
        </div>
        <div class="pose-item" data-pose="tposestand">
          <img src="/assets/poses/tposestand.png" alt="T-Pose">
          <span>T-Pose</span>
        </div>

        <div style="display: flex; gap: 8px; margin-left: auto; align-items: center;">
          <button id="flipPoseBtn" class="paper-btn buff" style="padding: 6px 10px; font-size: 13px;">Flip ↔</button>
          <label style="font-size: 12px; font-weight: 700;">Size:
            <input type="range" id="poseScaleSlider" min="0.5" max="1.8" step="0.1" value="1.0" style="vertical-align: middle;">
          </label>
          <button id="lockPoseBtn" class="paper-btn coral" style="padding: 8px 14px;">🔒 Lock &amp; Paint!</button>
        </div>
      </div>

      <div class="canvas-wrapper">
        <canvas id="gameCanvas" width="800" height="600"></canvas>
      </div>

      <div id="drawingToolbar" class="drawing-toolbar hidden">
        <div class="tool-group">
          <button id="toolBrush" class="tool-btn active" title="Brush">🖌</button>
          <button id="toolEraser" class="tool-btn" title="Eraser">🫩</button>
          <button id="toolEyedropper" class="tool-btn" title="Eyedropper (Sample Color)">💉</button>
          <input type="color" id="customColorPicker" value="#2d5a27" style="width: 32px; height: 32px; border: 2px solid #231f20; border-radius: 6px; cursor: pointer;">
        </div>

        <div class="tool-group">
          <div id="colorSwatches" class="color-swatch-grid"></div>
        </div>

        <div class="tool-group">
          <span style="font-size: 13px; font-weight: 700;">Size:</span>
          <button class="tool-btn size-btn" data-size="4" style="font-size: 11px;">S</button>
          <button class="tool-btn size-btn active" data-size="16" style="font-size: 14px;">M</button>
          <button class="tool-btn size-btn" data-size="32" style="font-size: 18px;">L</button>
          <button class="tool-btn size-btn" data-size="54" style="font-size: 22px;">XL</button>
        </div>

        <div class="tool-group">
          <button id="undoBtn" class="paper-btn buff" style="padding: 6px 10px;">↩ Undo</button>
          <button id="redoBtn" class="paper-btn buff" style="padding: 6px 10px;">↪ Redo</button>
          <button id="clearBtn" class="paper-btn coral" style="padding: 6px 10px;">🗑 Clear</button>
        </div>
      </div>

    </div>

    <!-- Right Sidebar: Chat -->
    <div class="chat-sidebar">
      <div class="chat-header">💬 Game Chat &amp; Logs</div>
      <div id="chatMessages" class="chat-messages">
        <div class="chat-msg system">Welcome to Chameleon! Join or create a room to play.</div>
      </div>
      <form id="chatForm" class="chat-input-form">
        <input type="text" id="chatInput" class="paper-input" placeholder="Type a message..." style="flex: 1; padding: 6px 10px; font-size: 14px;" maxlength="100">
        <button type="submit" class="paper-btn primary" style="padding: 6px 12px; font-size: 14px;">Send</button>
      </form>
    </div>

  </div>

  <!-- Overlay: Main Menu -->
  <div id="mainMenuOverlay" class="screen-overlay">
    <div class="dialog-card">
      <div class="dialog-title">🚎 CHAMELEON 🏨</div>
      <p style="font-size: 16px; color: #555;">Hide your figure inside scenes &amp; race to spot each other!</p>

      <div style="display: flex; flex-direction: column; gap: 8px; text-align: left;">
        <label style="font-weight: 700;">Your Name:</label>
        <input type="text" id="playerNameInput" class="paper-input" placeholder="Enter name..." maxlength="16" value="Player 1">
      </div>

      <div class="avatar-builder-box">
        <div id="avatarPreview" class="avatar-preview-big" style="background: #e76f51;">😀</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 6px;">
            <button class="paper-btn buff avatar-opt-btn" data-type="face" data-val="😀" style="padding: 4px 8px;">😀</button>
            <button class="paper-btn buff avatar-opt-btn" data-type="face" data-val="😎" style="padding: 4px 8px;">😎</button>
            <button class="paper-btn buff avatar-opt-btn" data-type="face" data-val="🟩" style="padding: 4px 8px;">🟩</button>
            <button class="paper-btn buff avatar-opt-btn" data-type="face" data-val="🔥" style="padding: 4px 8px;">🔥</button>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="paper-btn avatar-color-btn" data-color="#e76f51" style="width: 28px; height: 28px; background: #e76f51; padding:0;"></button>
            <button class="paper-btn avatar-color-btn" data-color="#2a9d8f" style="width: 28px; height: 28px; background: #2a9d8f; padding:0;"></button>
            <button class="paper-btn avatar-color-btn" data-color="#e9c46a" style="width: 28px; height: 28px; background: #e9c46a; padding:0;"></button>
            <button class="paper-btn avatar-color-btn" data-color="#9b5de5" style="width: 28px; height: 28px; background: #9b5de5; padding:0;"></button>
          </div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="createRoomBtn" class="paper-btn primary" style="font-size: 20px; padding: 14px;">➕ Create Room</button>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="joinRoomCodeInput" class="paper-input" placeholder="4-Letter Code" maxlength="4" style="flex: 1; text-transform: uppercase;">
          <button id="joinRoomBtn" class="paper-btn success" style="font-size: 18px;">Join Room</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Overlay: Lobby -->
  <div id="lobbyOverlay" class="screen-overlay hidden">
    <div class="dialog-card" style="width: 540px;">
      <dialog-title">Game Lobby 🏳</dialog-title>
      <div style="background: #wff3b0; border: 3px solid #231f20; border-radius: 10px; padding: 12px; font-size: 22px; font-weight: 700;">
        Room Code: <span id="lobbyCodeText" style="color: #e63946; letter-spacing: 2px;">----</span>
      </div>

      <div style="text-align: left;">
        <div style="font-weight: 700; margin-bottom: 6px;">Players in Room:</div>
        <div id="lobbyPlayerGrid" style="display: flex; flex-wrap: wrap; gap: 10px; max-height: 180px; overflow-y: auto;"></div>
      </div>

      <div style="background: #e5dec9; border: 2.5px solid #231f20; border-radius: 8px; padding: 10px; font-size: 14px; text-align: left;">
        📌 <b>How to play:</b><br>
        1. <b>Painting Phase (3:50)</b>: Pose your humanoid figure and paint over it to camouflage it!<br>
        2. <b>Guessing Phase (15s)</b>: Race to click and spot each other's hidden figures!
      </div>

      <button id="startGameBtn" class="paper-btn success" style="font-size: 20px; padding: 14px;">🚀 START GAME</button>
    </div>
  </div>

  <!-- Overlay: Podium -->
  <div id="podiumOverlay" class="screen-overlay hidden">
    <div class="dialog-card" style="width: 560px;">
      <div class="dialog-title">🏩 MATCH PODIUM 🏩</div>
      <div id="podiumStand" class="podium-stand"></div>
      <div id="podiumRankingsTable" style="text-align: left; max-height: 140px; overflow-y: auto;"></div>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="playAgainBtn" class="paper-btn primary" style="font-size: 18px;">🔄 Play Again</button>
      </div>
    </div>
  </div>

  <script src="/js/audio.js"></script>
  <script src="/js/scenes.js"></script>
  <script src="/js/canvas.js"></script>
  <script src="/js/app.js"></script>
</body>
</head>
</html>'''
write('public/index.html', html_code)
