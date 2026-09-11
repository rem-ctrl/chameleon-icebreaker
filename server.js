const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e8
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const BACKGROUNDS_DIR = path.join(__dirname, 'public', 'assets', 'backgrounds');

function getAvailableBackgrounds() {
  try {
    if (!fs.existsSync(BACKGROUNDS_DIR)) {
      fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
    }
    const files = fs.readdirSync(BACKGROUNDS_DIR);
    const validExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
    const bgFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return validExts.has(ext);
    });
    return bgFiles.map(file => `/assets/backgrounds/${file}`);
  } catch (err) {
    console.error('Error reading backgrounds directory:', err);
    return [];
  }
}

function getRandomBackground() {
  const bgs = getAvailableBackgrounds();
  if (bgs.length === 0) return null;
  return bgs[Math.floor(Math.random() * bgs.length)];
}

app.get('/api/backgrounds', (req, res) => {
  const backgrounds = getAvailableBackgrounds();
  res.json({ backgrounds });
});

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getSafeRoomData(room) {
  return {
    code: room.code,
    state: room.state,
    hostId: room.hostId,
    hostIsSpectator: !!room.hostIsSpectator,
    sceneId: room.sceneId || 'jungle',
    backgroundImage: room.backgroundImage || null,
    timeLeft: room.timeLeft,
    totalTime: room.totalTime,
    currentRound: room.currentGuessIndex + 1,
    totalRounds: room.submissions.length,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      isHost: p.id === room.hostId,
      isSpectator: !!p.isSpectator,
      submitted: p.submitted,
      hasGuessed: p.hasGuessed,
      isArtist: room.currentSubmission ? room.currentSubmission.artistId === p.id : false,
      lastPoints: p.lastPoints || 0
    }))
  };
}

function clearRoomTimers(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.revealTimeout) {
    clearTimeout(room.revealTimeout);
    room.revealTimeout = null;
  }
}

function checkHit(guessX, guessY, poseData) {
  if (!poseData) return false;
  const { x, y, width, height, rotation } = poseData;
  
  // Delta in normalized space
  const dx = guessX - x;
  const dy = guessY - y;
  
  // Un-rotate the clicked point to match the figure's orientation
  const rad = -((rotation || 0) * Math.PI / 180);
  const unrotX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const unrotY = dx * Math.sin(rad) + dy * Math.cos(rad);
  
  // Exact tight silhouette radius matching the humanoid body PNG
  const halfW = (width || 0.15) * 0.40;
  const halfH = (height || 0.35) * 0.45;
  
  if (halfW <= 0 || halfH <= 0) return false;
  
  const normDistSq = (unrotX * unrotX) / (halfW * halfW) + (unrotY * unrotY) / (halfH * halfH);
  return normDistSq <= 1.0;
}


io.on('connection', (socket) => {
  let currentRoomCode = null;

  socket.on('create_room', (data, callback) => {
    const code = generateRoomCode();
    const rawName = data && (data.playerName || data.name);
    const playerName = (rawName ? rawName.trim() : 'Player') || 'Player 1';
    const avatar = (data && data.avatar) || { color: '#e76f51', shape: 'square', eyes: 1, mouth: 1, hat: 0 };
    const sceneId = (data && data.sceneId) || 'jungle';

    const initialBg = getRandomBackground();

    const room = {
      code,
      hostId: socket.id,
      hostIsSpectator: false,
      sceneId,
      backgroundImage: initialBg,
      state: 'LOBBY',
      players: new Map(),
      submissions: [],
      currentGuessIndex: 0,
      currentSubmission: null,
      roundFinders: [],
      timeLeft: 0,
      totalTime: 0,
      timerInterval: null,
      revealTimeout: null
    };

    const player = {
      id: socket.id,
      name: playerName,
      avatar,
      score: 0,
      isSpectator: false,
      submitted: false,
      hasGuessed: false,
      lastPoints: 0
    };

    room.players.set(socket.id, player);
    rooms.set(code, room);
    currentRoomCode = code;
    socket.join(code);

    if (typeof callback === 'function') {
      callback({ success: true, roomCode: code, player, isHost: true });
    }
    io.to(code).emit('room_updated', getSafeRoomData(room));
    io.to(code).emit('chat_message', {
      system: true,
      text: '[ROOM CREATED] ' + player.name + ' created room ' + code + '.'
    });
  });

  socket.on('join_room', (data, callback) => {
    const code = (data && data.roomCode ? data.roomCode.trim().toUpperCase() : '');
    const rawName = data && (data.playerName || data.name);
    const playerName = (rawName ? rawName.trim() : 'Player') || 'Player';
    const avatar = (data && data.avatar) || { color: '#2a9d8f', shape: 'circle', eyes: 1, mouth: 1, hat: 0 };

    const room = rooms.get(code);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, message: 'Room not found! Check the room code.' });
      return;
    }
    if (room.state !== 'LOBBY') {
      if (typeof callback === 'function') callback({ success: false, message: 'Game already in progress!' });
      return;
    }
    if (room.players.size >= 20) {
      if (typeof callback === 'function') callback({ success: false, message: 'Room is full (max 20 players)!' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      avatar,
      score: 0,
      isSpectator: false,
      submitted: false,
      hasGuessed: false,
      lastPoints: 0
    };

    room.players.set(socket.id, player);
    currentRoomCode = code;
    socket.join(code);

    if (typeof callback === 'function') {
      callback({ success: true, roomCode: code, player, isHost: false });
    }

    io.to(code).emit('room_updated', getSafeRoomData(room));
    io.to(code).emit('chat_message', {
      system: true,
      text: '[PLAYER JOINED] ' + player.name + ' joined the room.'
    });
  });

  socket.on('toggle_host_spectator', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;
    room.hostIsSpectator = !!(data && data.isSpectator);
    const hostP = room.players.get(socket.id);
    if (hostP) {
      hostP.isSpectator = room.hostIsSpectator;
    }
    io.to(room.code).emit('room_updated', getSafeRoomData(room));
  });

  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    clearRoomTimers(room);
    room.state = 'PAINTING';
    room.submissions = [];
    room.currentGuessIndex = 0;
    room.currentSubmission = null;
    room.roundFinders = [];

    const paintDuration = 230;
    room.timeLeft = paintDuration;
    room.totalTime = paintDuration;

    // Dynamically pick distinct random background images for every player!
    const availableBgs = getAvailableBackgrounds();
    const shuffledBgs = [...availableBgs].sort(() => Math.random() - 0.5);

    let bgIdx = 0;
    room.players.forEach(p => {
      p.submitted = false;
      p.hasGuessed = false;
      p.lastPoints = 0;

      const isThisHostSpectator = (p.id === room.hostId && room.hostIsSpectator);
      p.isSpectator = isThisHostSpectator;
      if (isThisHostSpectator) {
        p.submitted = true;
      }

      let playerBg = null;
      if (shuffledBgs.length > 0) {
        playerBg = shuffledBgs[bgIdx % shuffledBgs.length];
        bgIdx++;
      } else {
        playerBg = getRandomBackground();
      }
      p.assignedBackground = playerBg;

      const playerSocket = io.sockets.sockets.get(p.id);
      if (playerSocket) {
        playerSocket.emit('game_started', {
          duration: paintDuration,
          backgroundImage: playerBg,
          isHostSpectator: isThisHostSpectator,
          room: getSafeRoomData(room)
        });
      }
    });

    io.to(currentRoomCode).emit('chat_message', {
      system: true,
      text: '[PHASE 1: PAINTING] 3:50 to pose and camouflage your figure into your scene!'
    });

    room.timerInterval = setInterval(() => {
      room.timeLeft -= 1;
      io.to(room.code).emit('timer_tick', { timeLeft: room.timeLeft, totalTime: room.totalTime });

      if (room.timeLeft <= 0) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
        io.to(room.code).emit('painting_time_up');
        setTimeout(() => startGuessingPhase(room), 1500);
      }
    }, 1000);
  });

  socket.on('update_lobby_settings', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;
    if (data && data.sceneId) {
      room.sceneId = data.sceneId;
      if (data.sceneId === 'random') {
        room.backgroundImage = getRandomBackground();
      }
      io.to(room.code).emit('room_updated', getSafeRoomData(room));
    }
  });

  socket.on('submit_painting', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PAINTING') return;

    const player = room.players.get(socket.id);
    if (!player || player.submitted || player.isSpectator) return;

    player.submitted = true;

    room.submissions.push({
      artistId: socket.id,
      artistName: player.name,
      artistAvatar: player.avatar,
      imageData: (data && (data.imageData || data.imagData)) || room.backgroundImage || '/assets/backgrounds/images.jpg',
      poseData: (data && data.poseData) || { poseId: 'normalstand', x: 0.5, y: 0.5, width: 0.22, height: 0.38, rotation: 0, flipX: false },
      sceneId: (data && data.sceneId) || room.sceneId || 'jungle'
    });

    io.to(room.code).emit('room_updated', getSafeRoomData(room));
    io.to(room.code).emit('chat_message', {
      system: true,
      text: '[READY] ' + player.name + ' finished camouflaging their figure.'
    });

    const activeContestants = Array.from(room.players.values()).filter(p => !p.isSpectator);
    const allSubmitted = activeContestants.length > 0 && activeContestants.every(p => p.submitted);
    if (allSubmitted && room.submissions.length > 0) {
      clearRoomTimers(room);
      io.to(room.code).emit('chat_message', {
        system: true,
        text: '[ALL READY] Starting the guessing phase!'
      });
      setTimeout(() => startGuessingPhase(room), 1000);
    }
  });

  function startGuessingPhase(room) {
    clearRoomTimers(room);

    // Auto-create fallback submissions for any connected contestants who haven't submitted
    room.players.forEach(p => {
      if (p.isSpectator) return;
      const alreadySub = room.submissions.some(s => s.artistId === p.id);
      if (!alreadySub) {
        room.submissions.push({
          artistId: p.id,
          artistName: p.name,
          artistAvatar: p.avatar,
          imageData: p.assignedBackground || room.backgroundImage || '/assets/backgrounds/images.jpg',
          poseData: { poseId: 'normalstand', x: 0.5, y: 0.5, width: 0.22, height: 0.38, rotation: 0, flipX: false },
          sceneId: room.sceneId || 'jungle'
        });
        p.submitted = true;
      }
    });

    if (room.submissions.length === 0) {
      room.state = 'LOBBY';
      io.to(room.code).emit('room_updated', getSafeRoomData(room));
      io.to(room.code).emit('chat_message', {
        system: true,
        text: 'No players in room. Returned to lobby.'
      });
      return;
    }

    room.submissions.sort(() => Math.random() - 0.5);
    room.currentGuessIndex = 0;
    startNextGuessRound(room);
  }

  function startNextGuessRound(room) {
    clearRoomTimers(room);

    if (room.currentGuessIndex >= room.submissions.length) {
      showPodium(room);
      return;
    }

    const sub = room.submissions[room.currentGuessIndex];
    room.currentSubmission = sub;
    room.state = 'GUESSING';
    room.roundFinders = [];

    room.players.forEach(p => {
      p.hasGuessed = false;
      p.lastPoints = 0;
    });

    const guessDuration = 25;
    room.timeLeft = guessDuration;
    room.totalTime = guessDuration;

    io.to(room.code).emit('start_guess_round', {
      roundIndex: room.currentGuessIndex + 1,
      totalRounds: room.submissions.length,
      artistId: sub.artistId,
      artistName: sub.artistName,
      imageData: sub.imageData,
      duration: guessDuration
    });

    io.to(room.code).emit('room_updated', getSafeRoomData(room));
    io.to(room.code).emit('chat_message', {
      system: true,
      text: '[ROUND ' + (room.currentGuessIndex + 1) + '/' + room.submissions.length + '] Spot ' + sub.artistName + '\'s hidden figure!'
    });

    room.timerInterval = setInterval(() => {
      room.timeLeft -= 1;
      io.to(room.code).emit('timer_tick', { timeLeft: room.timeLeft, totalTime: room.totalTime });

      if (room.timeLeft <= 0) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
        finishCurrentGuessRound(room);
      }
    }, 1000);
  }


  socket.on('submit_guess', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'GUESSING' || !room.currentSubmission) return;

    const player = room.players.get(socket.id);
    if (!player || player.isSpectator) return;

    if (socket.id === room.currentSubmission.artistId) {
      socket.emit('guess_feedback', { isArtist: true, message: 'You painted this! Watch others search for your disguise.' });
      return;
    }

    if (player.hasGuessed) {
      socket.emit('guess_feedback', { alreadyGuessed: true, message: 'You already found it!' });
      return;
    }

    const now = Date.now();
    if (player.lastGuessTime && (now - player.lastGuessTime < 950)) {
      return; // Rate-limit spam clicks
    }
    player.lastGuessTime = now;

    const isHit = checkHit(data.x, data.y, room.currentSubmission.poseData);

    if (isHit) {
      player.hasGuessed = true;
      const rank = room.roundFinders.length + 1;
      
      const timeFraction = Math.max(0, room.timeLeft / (room.totalTime || 25));
      let earnedPoints = Math.round(100 + 200 * timeFraction);
      if (rank === 1) earnedPoints += 100;
      else if (rank === 2) earnedPoints += 60;
      else if (rank === 3) earnedPoints += 35;
      else if (rank === 4) earnedPoints += 15;

      player.score += earnedPoints;
      player.lastPoints = earnedPoints;

      room.roundFinders.push({
        id: player.id,
        name: player.name,
        points: earnedPoints,
        rank,
        timeTaken: (room.totalTime || 25) - room.timeLeft
      });

      socket.emit('guess_feedback', {
        success: true,
        points: earnedPoints,
        rank,
        clickX: data.x,
        clickY: data.y
      });

      // Broadcast live finding celebration event to all room clients & spectator screen!
      io.to(room.code).emit('player_found', {
        finderId: player.id,
        finderName: player.name,
        finderAvatar: player.avatar,
        rank,
        points: earnedPoints
      });

      io.to(room.code).emit('chat_message', {
        system: true,
        highlight: true,
        text: '[FOUND!] ' + player.name + ' spotted the figure! (#' + rank + ' Place, +' + earnedPoints + ' pts)'
      });

      io.to(room.code).emit('room_updated', getSafeRoomData(room));

      // Skribbl-style rush timer: When the 1st player finds it, drop timer to 10s if more time remained
      if (rank === 1 && room.timeLeft > 10) {
        room.timeLeft = 10;
        io.to(room.code).emit('timer_tick', { timeLeft: room.timeLeft, totalTime: room.totalTime });
      }

      const eligibleGuessers = Array.from(room.players.values()).filter(p => !p.isSpectator && p.id !== room.currentSubmission.artistId);
      const allFound = eligibleGuessers.length > 0 && eligibleGuessers.every(p => p.hasGuessed);
      if (allFound) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
        setTimeout(() => finishCurrentGuessRound(room), 800);
      }
    } else {
      const penalty = 25;
      player.score = Math.max(0, player.score - penalty);
      player.lastPoints = -penalty;

      socket.emit('guess_feedback', {
        success: false,
        penalty,
        clickX: data.x,
        clickY: data.y,
        message: 'Miss! -' + penalty + ' pts. Keep searching.'
      });

      io.to(room.code).emit('room_updated', getSafeRoomData(room));
    }
  });

  function finishCurrentGuessRound(room) {
    clearRoomTimers(room);
    room.state = 'REVEAL';

    const sub = room.currentSubmission;
    const artist = room.players.get(sub.artistId);
    
    let artistBonus = 0;
    const eligibleCount = Math.max(1, Array.from(room.players.values()).filter(p => !p.isSpectator && p.id !== sub.artistId).length);
    const foundCount = room.roundFinders.length;
    const missedCount = eligibleCount - foundCount;

    if (artist) {
      artistBonus = Math.round(100 + (missedCount / eligibleCount) * 250);
      if (foundCount === 0) artistBonus += 150;
      artist.score += artistBonus;
      artist.lastPoints = artistBonus;
    }

    io.to(room.code).emit('reveal_round', {
      poseData: sub.poseData,
      artistId: sub.artistId,
      artistName: sub.artistName,
      artistBonus,
      finders: room.roundFinders,
      room: getSafeRoomData(room)
    });

    if (artist) {
      io.to(room.code).emit('chat_message', {
        system: true,
        text: '[CAMOUFLAGE BONUS] ' + artist.name + ' earned +' + artistBonus + ' camouflage bonus points.'
      });
    }

    room.revealTimeout = setTimeout(() => {
      room.currentGuessIndex += 1;
      startNextGuessRound(room);
    }, 4500);
  }

  function showPodium(room) {
    clearRoomTimers(room);
    room.state = 'PODIUM';

    const sortedPlayers = Array.from(room.players.values())
      .filter(p => !p.isSpectator)
      .sort((a, b) => b.score - a.score);

    io.to(room.code).emit('game_over', {
      leaderboard: sortedPlayers,
      room: getSafeRoomData(room)
    });

    io.to(room.code).emit('chat_message', {
      system: true,
      text: '[MATCH FINISHED] 1st Place: ' + (sortedPlayers[0] ? sortedPlayers[0].name : 'Nobody') + '!'
    });
  }


  socket.on('play_again', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    clearRoomTimers(room);
    room.state = 'LOBBY';
    room.submissions = [];
    room.currentGuessIndex = 0;
    room.currentSubmission = null;
    room.roundFinders = [];

    room.players.forEach(p => {
      p.score = 0;
      p.submitted = false;
      p.hasGuessed = false;
      p.lastPoints = 0;
    });

    const nextBg = getRandomBackground();
    if (nextBg) room.backgroundImage = nextBg;

    io.to(room.code).emit('room_updated', getSafeRoomData(room));
    io.to(room.code).emit('return_to_lobby');
    io.to(room.code).emit('chat_message', {
      system: true,
      text: '[NEW ROUND] Host started a new round. Prepare in lobby.'
    });
  });

  socket.on('send_chat', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const rawText = (typeof data === 'string') ? data : (data && data.text);
    const text = (rawText ? String(rawText).trim().substring(0, 150) : '');
    if (!text) return;

    io.to(room.code).emit('chat_message', {
      senderId: socket.id,
      senderName: player.name,
      avatar: player.avatar,
      text: text
    });
  });

  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        const player = room.players.get(socket.id);
        const name = player ? player.name : 'A player';
        room.players.delete(socket.id);

        if (room.players.size === 0) {
          clearRoomTimers(room);
          rooms.delete(currentRoomCode);
        } else {
          if (room.hostId === socket.id) {
            const nextHost = room.players.keys().next().value;
            room.hostId = nextHost;
            const newHostPlayer = room.players.get(nextHost);
            io.to(currentRoomCode).emit('chat_message', {
              system: true,
              text: '[NEW HOST] ' + (newHostPlayer ? newHostPlayer.name : 'A player') + ' is now the room host.'
            });
          }

          io.to(currentRoomCode).emit('room_updated', getSafeRoomData(room));
          io.to(currentRoomCode).emit('chat_message', {
            system: true,
            text: '[PLAYER LEFT] ' + name + ' disconnected.'
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chameleon Paint Game running at http://localhost:${PORT}`);
});
