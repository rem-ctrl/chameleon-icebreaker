#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys

def write_file(path, text):
    dirname = os.path.dirname(path)
    if dirname and not os.path.exists(dirname):
        os.makedirs(dirname, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('[WROTE]', path, len(text), 'chars')


def make_server():
    code = '''const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e8
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

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
  const { x, y, width, height } = poseData;
  const halfW = (width || 0.2) / 2;
  const halfI = (height || 0.3) / 2;
  const toleranceX = halfW * 1.35;
  const toleranceY = halfH * 1.35;
  
  const minX = x - toleranceX;
  const maxX = x + toleranceX;
  const minY = y - toleranceY;
  const maxY = y + toleranceY;
  
  return guessX >= minX && guessX <= maxX && guessY >= minY && guessY <= maxY;
}


io.on('connection', (socket) => {
  let currentRoomCode = null;

  socket.on('create_room', (data, callback) => {
    const code = generateRoomCode();
    const playerName = (data && data.name ? data.name.trim() : 'Player') || 'Player 1';
    const avatar = (data && data.avatar) || { color: '#e76f51', shape: 'square', eyes: 1, mouth: 1, hat: 0 };

    const room = {
      code,
      hostId: socket.id,
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
    io.to(code).updatedRoomData = getSafeRoomData(room);
    io.to(code).emit('room_updated', getSafeRoomData(room));
    io.to(code).emit('chat_message', {
      system: true,
      text: '[ROOM CREATED] ' + player.name + ' created room ' + code + '.'
    });
  });

  socket.on('join_room', (data, callback) => {
    const code = (data && data.roomCode ? data.roomCode.trim().toUpperCase() : '');
    const playerName = (data && data.name ? data.name.trim() : 'Player') || 'Player';
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
    if (room.players.size >= 12) {
      if (typeof callback === 'function') callback({ success: false, message: 'Room is full (max 12 players)!' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      avatar,
      score: 0,
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

    room.players.forEach(p => {
      p.submitted = false;
      p.hasGuessed = false;
      p.lastPoints = 0;
    });

    const paintDuration = 230;
    room.timeLeft = paintDuration;
    room.totalTime = paintDuration;

    io.to(currentRoomCode).emit('game_started', {
      duration: paintDuration,
      room: getSafeRoomData(room)
    });

    io.to(currentRoomCode).emit('chat_message', {
      system: true,
      text: '[PHASE 1: PAINTING] 3:50 to pose and camouflage your figure!'
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

  socket.on('submit_painting', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PAINTING') return;

    const player = room.players.get(socket.id);
    if (!player || player.submitted) return;

    player.submitted = true;

    room.submissions.push({
      artistId: socket.id,
      artistName: player.name,
      artistAvatar: player.avatar,
      imagData: data.imagData,
      poseData: data.poseData,
      sceneId: data.sceneId || 'jungle'
    });

    io.to(room.code).emit('room_updated', getSafeRoomData(room));
    io.to(room.code).emit('chat_message', {
      system: true,
      text: '[READY] ' + player.name + ' finished camouflaging their figure.'
    });

    const allSubmitted = Array.from(room.players.values()).every(p => p.submitted);
    if (allSubmitted && room.submissions.length > 0) {
      clearRoomTimers(room);
      io.to(room.code).emit('chat_message', {
        system: true,
        text: '[ALL READY] Starting the guessing phase!'
      });
      setTimeout(() => startGuessingPhase(room), 1200);
    }
  });


  function startGuessingPhase(room) {
    clearRoomTimers(room);
    if (room.submissions.length === 0) {
      room.state = 'LOBBY';
      io.to(room.code).emit('room_updated', getSafeRoomData(room));
      io.to(room.code).emit('chat_message', {
        system: true,
        text: 'No paintings were submitted. Returned to lobby.'
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

    const guessDuration = 15;
    room.timeLeft = guessDuration;
    room.totalTime = guessDuration;

    io.to(room.code).emit('start_guess_round', {
      roundIndex: room.currentGuessIndex + 1,
      totalRounds: room.submissions.length,
      artistId: sub.artistId,
      artistName: sub.artistName,
      imagData: sub.imageData,
      duration: guessDuration
-   });

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
    if (!player) return;

    if (socket.id === room.currentSubmission.artistId) {
      socket.emit('guess_feedback', { isArtist: true, message: 'You painted this! Watch others search for your disguise.' });
      return;
    }

    if (player.hasGuessed) {
      socket.emit('guess_feedback', { alreadyGuessed: true, message: 'You already found it!' });
      return;
    }

    const isHit = checkHit(data.x, data.y, room.currentSubmission.poseData);

    if (isHit) {
      player.hasGuessed = true;
      const rank = room.roundFinders.length + 1;
      
      const timeFraction = Math.max(0, room.timeLeft / 15);
      let earnedPoints = Math.round(150 + 250 * timeFraction);
      if (rank === 1) earnedPoints += 100;
      else if (rank === 2) earnedPoints += 50;
      else if (rank === 3) earnedPoints += 25;

      player.score += earnedPoints;
      player.lastPoints = earnedPoints;

      room.roundFinders.push({
        id: player.id,
        name: player.name,
        points: earnedPoints,
        rank,
        timeTaken: 15 - room.timeLeft
      });

      socket.emit('guess_feedback', {
        success: true,
        points: earnedPoints,
        rank,
        clickX: data.x,
        clickY: data.y
      });

      io.to(room.code).emit('chat_message', {
        system: true,
        highlight: true,
        text: '[FOUND!] ' + player.name + ' spotted the figure! (+' + earnedPoints + ' pts)'
      });

      io.to(room.code).emit('room_updated', getSafeRoomData(room));

      const eligibleGuessers = Array.from(room.players.values()).filter(p => p.id !== room.currentSubmission.artistId);
      const allFound = eligibleGuessers.every(p => p.hasGuessed);
      if (allFound) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
        setTimeout(() => finishCurrentGuessRound(room), 800);
      }
    } else {
      socket.emit('guess_feedback', {
        success: false,
        clickX: data.x,
        clickY: data.y,
        message: 'Miss! Keep searching.'
      });
    }
  });


  function finishCurrentGuessRound(room) {
    clearRoomTimers(room);
    room.state = 'REVEAL';

    const sub = room.currentSubmission;
    const artist = room.players.get(sub.artistId);
    
    let artistBonus = 0;
    const eligibleCount = Math.max(1, room.players.size - 1);
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
    room.state = 'PO
  DIUM';
    room.state = 'PODIUM';

    const sortedPlayers = Array.from(room.players.values())
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
      p.hasGuessed = false,
      p.lastPoints = 0;
    });

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

    const text = (data && data.text ? data.text.trim().substring(0, 100) : '');
    if (!text) return;

    io.to(room.code).emit('chat_message', {
      senderId: socket.id,
      senderName: player.name,
      avatar: player.avatar,
      text
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
'''
    write_file('server.js', code)
