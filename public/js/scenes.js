// Paper-craft Scene Generator & Renderer
const SCENES = {
  jungle: {
    id: 'jungle',
    name: 'Dense Jungle Sanctuary',
    themeColors: ['#2d5a27', '#4e873b', '#86c232'],
    draw: function(ctx, w, h) {
      // Sky/Background
      ctx.fillStyle = '#a8dadc';
      ctx.fillRect(0, 0, w, h);

      // Back mountain hills (papercraft polygon look)
      ctx.fillStyle = '#457b9d';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.lineTo(w * 0.25, h * 0.4);
      ctx.lineTo(w * 0.5, h * 0.58);
      ctx.lineTo(w * 0.8, h * 0.35);
      ctx.lineTo(w, h * 0.6);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Sun cutout
      ctx.fillStyle = '#f4a261';
      ctx.beginPath();
      ctx.arc(w * 0.85, h * 0.2, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Bamboo / Trees Layer
      const trunkColors = ['#5d4037', '#795548', '#8d6e63'];
      for (let x = 40; x < w; x += 110) {
        ctx.fillStyle = trunkColors[(x / 110) % trunkColors.length];
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3;
        ctx.fillRect(x, h * 0.2, 35, h * 0.8);
        ctx.strokeRect(x, h * 0.2, 35, h * 0.8);

        // Bamboo joints
        ctx.fillStyle = '#3e2723';
        for (let y = h * 0.25; y < h; y += 60) {
          ctx.fillRect(x - 3, y, 41, 6);
          ctx.strokeRect(x - 3, y, 41, 6);
        }
      }

      // Layered Jungle Leaves (Monstera / Palm fronds)
      const leafColors = ['#2d5a27', '#4e873b', '#68a348', '#86c232', '#a3c944'];
      for (let i = 0; i < 40; i++) {
        const lx = ((i * 137) % w);
        const ly = h * 0.3 + ((i * 97) % (h * 0.65));
        const size = 35 + (i % 5) * 12;
        const color = leafColors[i % leafColors.length];

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(((i * 45) % 180 - 90) * Math.PI / 180);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Leaf vein
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, 0);
        ctx.lineTo(size * 0.8, 0);
        ctx.stroke();

        ctx.restore();
      }

      // Foreground Ground & Bush Patches
      ctx.fillStyle = '#2d5a27';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.82);
      for (let x = 0; x <= w; x += 60) {
        ctx.lineTo(x, h * 0.82 + Math.sin(x * 0.05) * 20);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Exotic Flowers
      const flowerColors = ['#e63946', '#f72585', '#ffb703', '#fb8500'];
      for (let i = 0; i < 12; i++) {
        const fx = 30 + i * (w / 12);
        const fy = h * 0.88 + Math.sin(i) * 30;
        ctx.fillStyle = flowerColors[i % flowerColors.length];
        ctx.beginPath();
        ctx.arc(fx, fy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fffdf0';
        ctx.beginPath();
        ctx.arc(fx, fy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  library: {
    id: 'library',
    name: 'Cozy Bookshop Study',
    themeColors: ['#5d4037', '#d4a373', '#c59263'],
    draw: function(ctx, w, h) {
      // Wallpaper
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(0, 0, w, h);

      // Wallpaper stripes
      ctx.fillStyle = '#c59263';
      for (let x = 0; x < w; x += 40) {
        ctx.fillRect(x, 0, 20, h);
      }

      // Wooden Floor
      ctx.fillStyle = '#8d5b4c';
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, h * 0.8, w, h * 0.2);

      // Floor plank lines
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.8);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Bookshelves (3 tiers)
      const shelfY = [h * 0.25, h * 0.50, h * 0.75];
      shelfY.forEach((sy) => {
        // Shelf wood
        ctx.fillStyle = '#5c3d2e';
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3.5;
        ctx.fillRect(20, sy, w - 40, 22);
        ctx.strokeRect(20, sy, w - 40, 22);

        // Books on shelf
        const bookColors = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#9b5de5', '#00bbf9', '#00f5d4'];
        let bx = 35;
        let bIndex = 0;
        while (bx < w - 60) {
          const bw = 14 + (bIndex % 4) * 5;
          const bh = 50 + (bIndex % 6) * 12;
          const bColor = bookColors[bIndex % bookColors.length];

          ctx.fillStyle = bColor;
          ctx.strokeStyle = '#231f20';
          ctx.lineWidth = 3;

          // Some books straight, some tilted
          if (bIndex % 7 === 0 && bx + bw + 20 < w - 60) {
            ctx.save();
            ctx.translate(bx + 15, sy);
            ctx.rotate(0.2);
            ctx.fillRect(0, -bh, bw, bh);
            ctx.strokeRect(0, -bh, bw, bh);
            ctx.restore();
            bx += bw + 15;
          } else {
            ctx.fillRect(bx, sy - bh, bw, bh);
            ctx.strokeRect(bx, sy - bh, bw, bh);
            // Book gold spine lines
            ctx.fillStyle = '#fff3b0';
            ctx.fillRect(bx + 2, sy - bh + 10, bw - 4, 4);
            bx += bw + 3;
          }
          bIndex++;
        }
      });

      // Potted Plant on Top Shelf
      ctx.fillStyle = '#e76f51';
      ctx.fillRect(60, shelfY[0] - 80, 40, 35);
      ctx.strokeRect(60, shelfY[0] - 80, 40, 35);
      // Leaves
      ctx.fillStyle = '#2a9d8f';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(80 + i * 14, shelfY[0] - 90, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  },

  coral: {
    id: 'coral',
    name: 'Deep Coral Reef',
    themeColors: ['#1d3557', '#457b9d', '#a8dadc'],
    draw: function(ctx, w, h) {
      // Ocean gradient layers
      ctx.fillStyle = '#1d3557';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#457b9d';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.3);
      ctx.bezierCurveTo(w * 0.3, h * 0.2, w * 0.7, h * 0.4, w, h * 0.25);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#a8dadc';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      ctx.bezierCurveTo(w * 0.3, h * 0.65, w * 0.6, h * 0.45, w, h * 0.6);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Sandy Seabed
      ctx.fillStyle = '#e9c46a';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.85);
      ctx.bezierCurveTo(w * 0.25, h * 0.80, w * 0.75, h * 0.90, w, h * 0.82);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wavy Seaweed
      const weedColors = ['#2a9d8f', '#1b4332', '#40916c', '#52b788'];
      for (let x = 30; x < w; x += 45) {
        ctx.fillStyle = weedColors[(x / 45) % weedColors.length];
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.85);
        ctx.bezierCurveTo(x + 30, h * 0.65, x - 30, h * 0.45, x + 15, h * 0.3);
        ctx.bezierCurveTo(x + 25, h * 0.45, x - 15, h * 0.65, x + 15, h * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Coral Formations (Paper cutout circles & fans)
      const coralColors = ['#e63946', '#ff70a6', '#ff9770', '#ffd670', '#70d6ff'];
      for (let i = 0; i < 20; i++) {
        const cx = 50 + (i * 93) % (w - 100);
        const cy = h * 0.7 + ((i * 37) % (h * 0.25));
        const cr = 25 + (i % 4) * 12;
        ctx.fillStyle = coralColors[i % coralColors.length];
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Bubbles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 2;
      for (let i = 0; i < 15; i++) {
        const bx = (i * 123) % w;
        const by = (i * 87) % (h * 0.7);
        const br = 6 + (i % 3) * 5;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  },

  castle: {
    id: 'castle',
    name: 'Fortress Courtyard',
    themeColors: ['#457b9d', '#6c757d', '#adb5bd'],
    draw: function(ctx, w, h) {
      // Sky
      ctx.fillStyle = '#6c757d';
      ctx.fillRect(0, 0, w, h);

      // Castle Wall Base
      ctx.fillStyle = '#adb5bd';
      ctx.fillRect(0, h * 0.3, w, h * 0.5);
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, h * 0.3, w, h * 0.5);

      // Battlements / Crenellations
      ctx.fillStyle = '#adb5bd';
      for (let x = 0; x < w; x += 50) {
        ctx.fillRect(x, h * 0.22, 30, h * 0.08);
        ctx.strokeRect(x, h * 0.22, 30, h * 0.08);
      }

      // Stone Bricks pattern
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 3;
      const brickH = 30;
      const brickW = 60;
      for (let y = h * 0.3; y < h * 0.8; y += brickH) {
        const offset = ((y / brickH) % 2 === 0) ? 0 : brickW / 2;
        for (let x = -brickW; x < w + brickW; x += brickW) {
          ctx.strokeRect(x + offset, y, brickW, brickH);
        }
      }

      // Royal Banners
      const bannerColors = ['#e63946', '#1d3557', '#e63946', '#1d3557'];
      bannerColors.forEach((color, i) => {
        const bx = 80 + i * (w / 4);
        ctx.fillStyle = color;
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, h * 0.35);
        ctx.lineTo(bx + 45, h * 0.35);
        ctx.lineTo(bx + 45, h * 0.58);
        ctx.lineTo(bx + 22.5, h * 0.52);
        ctx.lineTo(bx, h * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Banner Emblem
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(bx + 22.5, h * 0.44, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Cobblestone Ground
      ctx.fillStyle = '#495057';
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, h * 0.8, w, h * 0.2);

      // Cobblestones
      ctx.fillStyle = '#6c757d';
      for (let i = 0; i < 35; i++) {
        const cx = (i * 73) % w;
        const cy = h * 0.82 + (i * 29) % (h * 0.16);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  },

  candyland: {
    id: 'candyland',
    name: 'Sweet Candy Kingdom',
    themeColors: ['#f72585', '#ffccd5', '#ff85a1'],
    draw: function(ctx, w, h) {
      // Pastel Pink Sky
      ctx.fillStyle = '#ffccd5';
      ctx.fillRect(0, 0, w, h);

      // Frosting Clouds
      ctx.fillStyle = '#fff0f3';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 4; i++) {
        const cx = 80 + i * 220;
        const cy = 60 + (i % 2) * 30;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.arc(cx + 30, cy - 10, 45, 0, Math.PI * 2);
        ctx.arc(cx + 65, cy, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Gumdrop Hills
      const hillColors = ['#ff85a1', '#fbb1bd', '#c9184a'];
      hillColors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(w * 0.25 + i * (w * 0.3), h * 0.75 + i * 10, 160 + i * 30, Math.PI, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Candy Canes & Giant Swirl Lollipops
      const lollyX = [100, 240, 400, 560, 700];
      const lollyColors = ['#ff0054', '#7000ff', '#00f5d4', '#ffbe0b', '#ff5400'];

      lollyX.forEach((lx, idx) => {
        // Stick
        ctx.fillStyle = '#fdf0d5';
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3;
        ctx.fillRect(lx - 5, h * 0.35, 10, h * 0.5);
        ctx.strokeRect(lx - 5, h * 0.35, 10, h * 0.5);

        // Candy Head
        const rad = 45;
        ctx.fillStyle = lollyColors[idx % lollyColors.length];
        ctx.beginPath();
        ctx.arc(lx, h * 0.35, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Swirl Ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(lx, h * 0.35, rad * 0.6, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3;
      });

      // Chocolate Floor Path
      ctx.fillStyle = '#4a2810';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.88);
      ctx.bezierCurveTo(w * 0.4, h * 0.80, w * 0.6, h * 0.95, w, h * 0.85);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sprinkles
      const sprinkleColors = ['#ff0a54', '#ff477e', '#ff70a6', '#ff99c8', '#fcf6bd', '#d0f4de'];
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
        const sx = (i * 79) % w;
        const sy = h * 0.88 + (i * 31) % (h * 0.1);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate((i * 45) * Math.PI / 180);
        ctx.fillRect(-8, -3, 16, 6);
        ctx.restore();
      }
    }
  },

  campfire: {
    id: 'campfire',
    name: 'Night Campfire Woods',
    themeColors: ['#e76f51', '#0d1b2a', '#1b4332'],
    draw: function(ctx, w, h) {
      // Midnight Sky
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, w, h);

      // Stars (Chunky paper dots)
      ctx.fillStyle = '#ffeedd';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137) % w;
        const sy = (i * 89) % (h * 0.5);
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3 === 0) ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crescent Moon
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w * 0.85, 70, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0d1b2a';
      ctx.beginPath();
      ctx.arc(w * 0.82, 65, 34, 0, Math.PI * 2);
      ctx.fill();

      // Pine Trees Layers (Background)
      const treeColors = ['#1b4332', '#2d6a4f', '#40916c'];
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = treeColors[layer];
        ctx.strokeStyle = '#231f20';
        ctx.lineWidth = 3.5;
        const startX = layer * 30;
        for (let x = startX; x < w + 50; x += 90) {
          const treeBaseY = h * (0.6 + layer * 0.1);
          const treeH = 120 + layer * 20;

          ctx.beginPath();
          ctx.moveTo(x, treeBaseY - treeH);
          ctx.lineTo(x + 40, treeBaseY);
          ctx.lineTo(x - 40, treeBaseY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Ground Hill
      ctx.fillStyle = '#1b263b';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.78);
      ctx.bezierCurveTo(w * 0.3, h * 0.72, w * 0.7, h * 0.82, w, h * 0.75);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Camping Tent
      ctx.fillStyle = '#e76f51';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(140, h * 0.82);
      ctx.lineTo(210, h * 0.62);
      ctx.lineTo(280, h * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tent Door flap
      ctx.fillStyle = '#264653';
      ctx.beginPath();
      ctx.moveTo(180, h * 0.82);
      ctx.lineTo(210, h * 0.67);
      ctx.lineTo(240, h * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Campfire Logs
      ctx.fillStyle = '#582f0e';
      ctx.strokeStyle = '#231f20';
      ctx.lineWidth = 3;
      ctx.fillRect(w * 0.55 - 40, h * 0.83, 80, 16);
      ctx.strokeRect(w * 0.55 - 40, h * 0.83, 80, 16);

      // Layered Paper Fire Flames
      const flameColors = ['#d00000', '#dc2f02', '#e85d04', '#f48c06', '#faa307', '#ffba08'];
      flameColors.forEach((fc, idx) => {
        ctx.fillStyle = fc;
        ctx.beginPath();
        const fSize = 45 - idx * 6;
        const fy = h * 0.83 - idx * 7;
        ctx.arc(w * 0.55, fy, fSize, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
};

window.SCENES = SCENES;
