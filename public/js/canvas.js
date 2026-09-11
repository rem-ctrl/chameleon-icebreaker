// BS-IT/CS General Assembly Icebreaker - 1080p Canvas Engine
// Features: 1920x1080 resolution, Scalable Humanoid (Min/Max Bounds), Alpha Mask Paint Clipping
class ChameleonCanvas {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.width = 1920;
    this.height = 1080;

    // Background Scenery Layer
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    this.bgCtx = this.bgCanvas.getContext('2d', { willReadFrequently: true });

    // Humanoid Silhouette Alpha Mask Layer
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = this.width;
    this.maskCanvas.height = this.height;
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });

    // User Painting Layer
    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = this.width;
    this.paintCanvas.height = this.height;
    this.paintCtx = this.paintCanvas.getContext('2d', { willReadFrequently: true });

    // Composite Figure Layer (Base Humanoid + Clipped Paint)
    this.figureCanvas = document.createElement('canvas');
    this.figureCanvas.width = this.width;
    this.figureCanvas.height = this.height;
    this.figureCtx = this.figureCanvas.getContext('2d', { willReadFrequently: true });

    // Mode: 'POSE', 'PAINT', 'GUESS', 'REVEAL'
    this.mode = 'POSE';
    this.currentSceneId = 'jungle';
    this.currentBgUrl = null;
    this.bgImage = null;

    // Humanoid Scale Limits
    this.minScale = 0.35;
    this.maxScale = 1.65;
    this.baseFigureHeight = 420; // Natural 1080p scale

    // Pose State
    this.poseImages = {};
    this.selectedPoseId = 'normalstand';
    this.pose = {
      id: 'normalstand',
      x: 960,
      y: 540,
      scale: 1.0,
      rotation: 0,
      flipX: false,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      locked: false
    };

    // Drawing State
    this.tool = 'brush'; // 'brush', 'eraser', 'eyedropper'
    this.brushColor = '#2d5a27';
    this.brushSize = 24;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndo = 25;

    // Guessing State
    this.onGuessClick = null;
    this.onScaleChange = null;
    this.activeImageData = null;
    this.revealPoseData = null;
    this.clickMarkers = [];
    this.guessCooldownUntil = 0;
    this.isArtistDrawing = false;
    this.hasFound = false;

    this.initPoses();
    this.bindEvents();
    this.resize();
  }

  resize() {
    this.render();
  }

  initPoses() {
    const poseFiles = {
      normalstand: 'normalstand.png',
      ballpose: 'ballpose.png',
      handoverhead: 'handoverhead.png',
      laydown: 'laydown.png',
      sitpose: 'sitpose.png',
      tposestand: 'tposestand.png'
    };

    Object.keys(poseFiles).forEach((id) => {
      const img = new Image();
      img.src = '/assets/poses/' + poseFiles[id];
      img.onload = () => {
        this.poseImages[id] = img;
        if (this.mode === 'POSE') {
          this.render();
        }
      };
    });
  }

  changeScale(delta) {
    this.pose.scale = Math.max(this.minScale, Math.min(this.maxScale, +(this.pose.scale + delta).toFixed(2)));
    if (this.onScaleChange) this.onScaleChange(this.pose.scale);
    this.render();
    return this.pose.scale;
  }

  setScale(val) {
    this.pose.scale = Math.max(this.minScale, Math.min(this.maxScale, +val.toFixed(2)));
    if (this.onScaleChange) this.onScaleChange(this.pose.scale);
    this.render();
    return this.pose.scale;
  }

  setBackgroundImage(url, callback) {
    if (!url) {
      this.setScene(this.currentSceneId);
      if (callback) callback();
      return;
    }

    this.currentBgUrl = url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.bgImage = img;
      this.drawBackground();
      this.render();
      if (callback) callback();
    };
    img.onerror = () => {
      console.warn('Failed to load background image:', url, 'Falling back to procedural scene.');
      this.bgImage = null;
      this.setScene(this.currentSceneId);
      if (callback) callback();
    };
    img.src = url;
  }

  drawBackground() {
    this.bgCtx.clearRect(0, 0, this.width, this.height);
    if (this.bgImage) {
      const canvasRatio = this.width / this.height;
      const imgRatio = this.bgImage.width / this.bgImage.height;
      let renderW, renderH, offsetX, offsetY;

      if (imgRatio > canvasRatio) {
        renderH = this.height;
        renderW = this.height * imgRatio;
        offsetX = (this.width - renderW) / 2;
        offsetY = 0;
      } else {
        renderW = this.width;
        renderH = this.width / imgRatio;
        offsetX = 0;
        offsetY = (this.height - renderH) / 2;
      }

      this.bgCtx.drawImage(this.bgImage, offsetX, offsetY, renderW, renderH);
    } else {
      const scene = (window.SCENES && window.SCENES[this.currentSceneId]) || (window.SCENES && window.SCENES.jungle);
      if (scene && typeof scene.draw === 'function') {
        scene.draw(this.bgCtx, this.width, this.height);
      } else {
        this.bgCtx.fillStyle = '#264653';
        this.bgCtx.fillRect(0, 0, this.width, this.height);
      }
    }
  }

  setScene(sceneId) {
    this.currentSceneId = sceneId || 'jungle';
    this.bgImage = null;
    this.drawBackground();
    this.render();
  }

  setMode(mode) {
    this.mode = mode;
    this.clickMarkers = [];
    this.render();
  }

  setPoseId(poseId) {
    this.selectedPoseId = poseId;
    this.pose.id = poseId;
    this.render();
  }

  updatePoseMask() {
    this.maskCtx.clearRect(0, 0, this.width, this.height);
    const img = this.poseImages[this.pose.id];
    if (!img) return;

    this.maskCtx.save();
    this.maskCtx.translate(this.pose.x, this.pose.y);
    this.maskCtx.rotate(this.pose.rotation * Math.PI / 180);
    this.maskCtx.scale(this.pose.flipX ? -this.pose.scale : this.pose.scale, this.pose.scale);

    const targetH = this.baseFigureHeight;
    const targetW = (img.width / img.height) * targetH;
    this.maskCtx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
    this.maskCtx.restore();
  }

  updateFigureLayer() {
    this.figureCtx.clearRect(0, 0, this.width, this.height);
    const img = this.poseImages[this.pose.id];
    if (!img) return;

    const targetH = this.baseFigureHeight;
    const targetW = (img.width / img.height) * targetH;

    // 1. Draw base humanoid figure
    this.figureCtx.save();
    this.figureCtx.translate(this.pose.x, this.pose.y);
    this.figureCtx.rotate(this.pose.rotation * Math.PI / 180);
    this.figureCtx.scale(this.pose.flipX ? -this.pose.scale : this.pose.scale, this.pose.scale);
    this.figureCtx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
    this.figureCtx.restore();

    // 2. Draw user paint on top
    this.figureCtx.drawImage(this.paintCanvas, 0, 0);

    // 3. Strictly clip all paint and content to the humanoid alpha silhouette!
    this.figureCtx.globalCompositeOperation = 'destination-in';
    this.figureCtx.drawImage(this.maskCanvas, 0, 0);
    this.figureCtx.globalCompositeOperation = 'source-over';
  }

  lockPose() {
    if (this.pose.locked) return;
    this.pose.locked = true;

    this.updatePoseMask();
    this.updateFigureLayer();
    this.saveState();
    this.setMode('PAINT');
  }

  getNormalizedPoseData() {
    const img = this.poseImages[this.pose.id];
    const targetH = this.baseFigureHeight;
    const targetW = img ? (img.width / img.height) * targetH : 260;

    return {
      poseId: this.pose.id,
      x: this.pose.x / this.width,
      y: this.pose.y / this.height,
      width: (targetW * this.pose.scale) / this.width,
      height: (targetH * this.pose.scale) / this.height,
      rotation: this.pose.rotation,
      flipX: this.pose.flipX
    };
  }

  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  bindEvents() {
    const onStart = (e) => {
      if (e.cancelable && (e.target === this.canvas || e.type === 'touchstart')) {
        e.preventDefault();
      }
      const pos = this.getCanvasCoordinates(e);

      if (this.mode === 'POSE' && !this.pose.locked) {
        const dist = Math.hypot(pos.x - this.pose.x, pos.y - this.pose.y);
        if (dist < 260 * this.pose.scale) {
          this.pose.isDragging = true;
          this.pose.dragOffsetX = pos.x - this.pose.x;
          this.pose.dragOffsetY = pos.y - this.pose.y;
        }
      } else if (this.mode === 'PAINT') {
        if (this.tool === 'eyedropper') {
          this.sampleColor(pos.x, pos.y);
        } else {
          this.isDrawing = true;
          this.lastX = pos.x;
          this.lastY = pos.y;
          this.drawStroke(pos.x, pos.y, pos.x, pos.y);
        }
      } else if (this.mode === 'GUESS') {
        if (this.isArtistDrawing || this.hasFound) {
          return; // Artist or player who already found it cannot guess again
        }
        const now = Date.now();
        if (this.guessCooldownUntil && now < this.guessCooldownUntil) {
          return;
        }
        this.guessCooldownUntil = now + 1000;
        if (this.onGuessClick) {
          const normX = Math.max(0, Math.min(1, pos.x / this.width));
          const normY = Math.max(0, Math.min(1, pos.y / this.height));
          this.addClickMarker(pos.x, pos.y);
          this.onGuessClick({ x: normX, y: normY });
        }
      }
    };

    const onMove = (e) => {
      if (this.mode === 'POSE' && this.pose.isDragging) {
        if (e.cancelable) e.preventDefault();
        const pos = this.getCanvasCoordinates(e);
        this.pose.x = Math.max(80, Math.min(this.width - 80, pos.x - this.pose.dragOffsetX));
        this.pose.y = Math.max(80, Math.min(this.height - 80, pos.y - this.pose.dragOffsetY));
        this.render();
      } else if (this.mode === 'PAINT' && this.isDrawing) {
        if (e.cancelable) e.preventDefault();
        const pos = this.getCanvasCoordinates(e);
        this.drawStroke(this.lastX, this.lastY, pos.x, pos.y);
        this.lastX = pos.x;
        this.lastY = pos.y;
      }
    };

    const onEnd = (e) => {
      if (this.mode === 'POSE' && this.pose.isDragging) {
        this.pose.isDragging = false;
        if (e.cancelable && e.target === this.canvas) e.preventDefault();
      } else if (this.mode === 'PAINT' && this.isDrawing) {
        this.isDrawing = false;
        this.saveState();
        if (e.cancelable && e.target === this.canvas) e.preventDefault();
      }
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });

    // Mouse wheel resizing in POSE mode
    this.canvas.addEventListener('wheel', (e) => {
      if (this.mode === 'POSE' && !this.pose.locked) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        this.changeScale(delta);
      }
    }, { passive: false });
  }

  drawStroke(x1, y1, x2, y2) {
    this.paintCtx.save();
    this.paintCtx.lineCap = 'round';
    this.paintCtx.lineJoin = 'round';
    this.paintCtx.lineWidth = this.brushSize;

    if (this.tool === 'eraser') {
      this.paintCtx.globalCompositeOperation = 'destination-out';
      this.paintCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.paintCtx.globalCompositeOperation = 'source-over';
      this.paintCtx.strokeStyle = this.brushColor;
    }

    this.paintCtx.beginPath();
    this.paintCtx.moveTo(x1, y1);
    this.paintCtx.lineTo(x2, y2);
    this.paintCtx.stroke();
    this.paintCtx.restore();

    this.render();
  }

  sampleColor(x, y) {
    const pixel = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
    this.brushColor = hex;
    if (this.onColorPicked) this.onColorPicked(hex);
    this.tool = 'brush';
    if (this.onToolChange) this.onToolChange('brush');
    if (window.audioManager) window.audioManager.playClick();
  }

  saveState() {
    const dataUrl = this.paintCanvas.toDataURL();
    this.undoStack.push(dataUrl);
    if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length <= 1) {
      this.clearPaint();
      return;
    }
    this.redoStack.push(this.undoStack.pop());
    const prev = this.undoStack[this.undoStack.length - 1];
    const img = new Image();
    img.src = prev;
    img.onload = () => {
      this.paintCtx.clearRect(0, 0, this.width, this.height);
      this.paintCtx.drawImage(img, 0, 0);
      this.render();
    };
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    const img = new Image();
    img.src = next;
    img.onload = () => {
      this.paintCtx.clearRect(0, 0, this.width, this.height);
      this.paintCtx.drawImage(img, 0, 0);
      this.render();
    };
  }

  clearPaint() {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.saveState();
    this.render();
  }

  resetAll(bgImageUrlOrSceneId) {
    this.pose.locked = false;
    this.pose.x = 960;
    this.pose.y = 540;
    this.pose.scale = 1.0;
    this.pose.rotation = 0;
    this.pose.flipX = false;
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.maskCtx.clearRect(0, 0, this.width, this.height);
    this.figureCtx.clearRect(0, 0, this.width, this.height);
    this.undoStack = [];
    this.redoStack = [];
    this.clickMarkers = [];
    this.activeImageData = null;
    this.revealPoseData = null;

    if (this.onScaleChange) this.onScaleChange(this.pose.scale);

    if (bgImageUrlOrSceneId && (bgImageUrlOrSceneId.startsWith('/') || bgImageUrlOrSceneId.startsWith('http') || bgImageUrlOrSceneId.includes('.'))) {
      this.setBackgroundImage(bgImageUrlOrSceneId);
    } else {
      this.setScene(bgImageUrlOrSceneId || 'jungle');
    }
    this.setMode('POSE');
  }

  getCombinedImage() {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const expCtx = exportCanvas.getContext('2d');

    // 1. Draw Background Image / Scenery
    expCtx.drawImage(this.bgCanvas, 0, 0);

    // 2. Draw Clipped Camouflage Humanoid Figure
    this.updateFigureLayer();
    expCtx.drawImage(this.figureCanvas, 0, 0);

    return exportCanvas.toDataURL('image/jpeg', 0.88);
  }

  setGuessImage(dataUrl, isArtist = false) {
    this.guessCooldownUntil = 0;
    this.clickMarkers = [];
    this.isArtistDrawing = isArtist;
    this.hasFound = false;
    const img = new Image();
    img.onload = () => {
      this.activeImageData = img;
      this.setMode('GUESS');
      this.render();
    };
    img.src = dataUrl;
  }

  setRevealData(poseData) {
    this.revealPoseData = poseData;
    this.setMode('REVEAL');
    this.render();
  }

  addClickMarker(x, y) {
    this.clickMarkers.push({ x, y, time: Date.now() });
    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.mode === 'GUESS' || this.mode === 'REVEAL') {
      if (this.activeImageData) {
        this.ctx.drawImage(this.activeImageData, 0, 0, this.width, this.height);
      }

      // Draw click markers: big bold red circle stroke
      this.clickMarkers.forEach((m) => {
        this.ctx.save();
        this.ctx.strokeStyle = '#e63946';
        this.ctx.lineWidth = 7;
        this.ctx.beginPath();
        this.ctx.arc(m.x, m.y, 38, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      });

      // If Reveal Mode, draw dashed paper highlight around target figure!
      if (this.mode === 'REVEAL' && this.revealPoseData) {
        const pd = this.revealPoseData;
        const px = pd.x * this.width;
        const py = pd.y * this.height;
        const pw = pd.width * this.width;
        const ph = pd.height * this.height;

        this.ctx.save();
        this.ctx.translate(px, py);
        this.ctx.rotate((pd.rotation || 0) * Math.PI / 180);

        // Pulsing Neon Dashed Outline
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 8;
        this.ctx.setLineDash([16, 10]);
        this.ctx.strokeRect(-pw / 2 - 14, -ph / 2 - 14, pw + 28, ph + 28);

        this.ctx.strokeStyle = '#231f20';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(-pw / 2 - 14, -ph / 2 - 14, pw + 28, ph + 28);

        // Tag
        this.ctx.fillStyle = '#ffbe0b';
        this.ctx.strokeStyle = '#231f20';
        this.ctx.lineWidth = 4;
        this.ctx.fillRect(-80, -ph / 2 - 54, 160, 36);
        this.ctx.strokeRect(-80, -ph / 2 - 54, 160, 36);

        this.ctx.fillStyle = '#231f20';
        this.ctx.font = 'bold 20px Fredoka, Patrick Hand, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FOUND!', 0, -ph / 2 - 28);

        this.ctx.restore();
      }
      return;
    }

    // 1. Draw Clean Background Scenery
    this.ctx.drawImage(this.bgCanvas, 0, 0);

    // 2. If POSE mode (not yet locked), draw interactive pose over background with guides
    if (this.mode === 'POSE' && !this.pose.locked) {
      const img = this.poseImages[this.pose.id];
      if (img) {
        this.ctx.save();
        this.ctx.translate(this.pose.x, this.pose.y);
        this.ctx.rotate(this.pose.rotation * Math.PI / 180);
        this.ctx.scale(this.pose.flipX ? -this.pose.scale : this.pose.scale, this.pose.scale);

        const targetH = this.baseFigureHeight;
        const targetW = (img.width / img.height) * targetH;

        this.ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);

        // Cutout dashed placement bounding guide
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([12, 8]);
        this.ctx.strokeRect(-targetW / 2 - 8, -targetH / 2 - 8, targetW + 16, targetH + 16);

        this.ctx.restore();
      }
    } else {
      // In PAINT mode: Composite Figure + Clipped Paint
      this.updateFigureLayer();
      this.ctx.drawImage(this.figureCanvas, 0, 0);
    }
  }

  resize() {
    this.render();
  }
}

window.ChameleonCanvas = ChameleonCanvas;
