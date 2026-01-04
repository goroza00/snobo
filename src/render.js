import { drawRoundedRect, clamp } from './utils.js';

export function createRenderer(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function drawSlope() {
    const { laneLeft, laneRight, laneWidth } = state.world;

    ctx.fillStyle = 'rgba(40, 110, 210, 0.08)';
    ctx.fillRect(0, 0, laneLeft, H);
    ctx.fillRect(laneRight, 0, W - laneRight, H);

    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(255,255,255,0.98)');
    grd.addColorStop(1, 'rgba(220,245,255,0.98)');
    ctx.fillStyle = grd;

    ctx.beginPath();
    ctx.moveTo(laneLeft, 0);
    ctx.lineTo(laneRight, 0);
    ctx.lineTo(laneRight + 120, H);
    ctx.lineTo(laneLeft - 120, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(laneLeft, 0);  ctx.lineTo(laneLeft - 120, H);
    ctx.moveTo(laneRight, 0); ctx.lineTo(laneRight + 120, H);
    ctx.stroke();

    // snow streaks
    const s = state.game.speed;
    ctx.strokeStyle = 'rgba(80, 160, 255, 0.10)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const x = laneLeft + (i / 23) * laneWidth;
      const offset = (state.game.time * (0.6 + i * 0.015) * s) % H;
      ctx.beginPath();
      ctx.moveTo(x, -40 + offset);
      ctx.lineTo(x + 18, 20 + offset);
      ctx.stroke();
    }
  }

  function drawObstacle(o) {
    if (o.type === 'tree') {
      ctx.fillStyle = 'rgba(120, 70, 30, 0.9)';
      drawRoundedRect(ctx, o.x - o.size * 0.12, o.y + o.size * 0.15, o.size * 0.24, o.size * 0.42, 6);
      ctx.fill();

      ctx.fillStyle = o.hit ? 'rgba(80, 160, 90, 0.45)' : 'rgba(40, 140, 80, 0.95)';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size * 0.55);
      ctx.lineTo(o.x - o.size * 0.55, o.y + o.size * 0.2);
      ctx.lineTo(o.x + o.size * 0.55, o.y + o.size * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size * 0.2);
      ctx.lineTo(o.x - o.size * 0.45, o.y + o.size * 0.5);
      ctx.lineTo(o.x + o.size * 0.45, o.y + o.size * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (o.type === 'rock') {
      ctx.fillStyle = o.hit ? 'rgba(120,120,130,0.55)' : 'rgba(90,90,105,0.95)';
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, o.size * 0.52, o.size * 0.38, o.drift * 0.02, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(o.x - o.size*0.12, o.y - o.size*0.1, o.size*0.18, o.size*0.12, 0, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(40,40,50,0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size*0.6);
      ctx.lineTo(o.x, o.y + o.size*0.6);
      ctx.stroke();

      ctx.fillStyle = o.hit ? 'rgba(255, 180, 60, 0.35)' : 'rgba(255, 120, 20, 0.95)';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size*0.55);
      ctx.lineTo(o.x + o.size*0.65, o.y - o.size*0.35);
      ctx.lineTo(o.x, o.y - o.size*0.15);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(o.x, o.y + o.size*0.55, o.size*0.4, o.size*0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer() {
    const p = state.player;
    const blink = p.invuln > 0 && (Math.floor(state.game.time * 16) % 2 === 0);
    if (blink) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);

    ctx.fillStyle = 'rgba(20, 60, 120, 0.95)';
    drawRoundedRect(ctx, -42, 10, 84, 16, 10);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    drawRoundedRect(ctx, -34, 13, 68, 4, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(40, 40, 50, 0.92)';
    ctx.beginPath();
    ctx.arc(0, -12, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-6, -16, 3, 0, Math.PI * 2);
    ctx.arc(6, -16, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(18, 6);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 28, 42, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles(dt) {
    let ps = state.particles;
    for (const p of ps) {
      p.t += dt;
      const a = 1 - (p.t / p.life);
      if (a <= 0) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.01, dt);
      p.vy += 620 * dt;

      ctx.fillStyle = `rgba(255,255,255,${0.65 * a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    state.particles = ps.filter(p => p.t < p.life);
  }

  function drawBanner(text, sub) {
    const W = canvas.width, H = canvas.height;
    const bw = W * 0.72, bh = 140;
    const bx = (W - bw) / 2, by = H * 0.18;

    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    drawRoundedRect(ctx, bx + 6, by + 8, bw, bh, 22);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    drawRoundedRect(ctx, bx, by, bw, bh, 22);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(10,20,40,0.92)';
    ctx.font = '900 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W/2, by + 52);

    ctx.fillStyle = 'rgba(10,20,40,0.70)';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText(sub, W/2, by + 104);
  }

  function drawGoalGate() {
    const { GOAL_DISTANCE } = state.game;
    const progress = clamp(state.game.distance / GOAL_DISTANCE, 0, 1);
    if (progress <= 0.82 || state.game.gameOver) return;

    const t = (progress - 0.82) / 0.18;
    const gy = H * (0.10 + (1 - t) * 0.05);
    const gx = W / 2;
    const gw = state.world.laneWidth * (0.45 + t * 0.25);
    const gh = 26;

    ctx.fillStyle = 'rgba(255, 210, 60, 0.85)';
    drawRoundedRect(ctx, gx - gw/2, gy, gw, gh, 14);
    ctx.fill();

    ctx.fillStyle = 'rgba(20,20,30,0.75)';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', gx, gy + gh/2);
  }

  function drawProgressBar() {
    const px = 24, py = 24, pw = W - 48, ph = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    drawRoundedRect(ctx, px, py, pw, ph, 10);
    ctx.fill();

    const prog = clamp(state.game.distance / state.game.GOAL_DISTANCE, 0, 1);
    ctx.fillStyle = 'rgba(20,110,255,0.35)';
    drawRoundedRect(ctx, px, py, pw * prog, ph, 10);
    ctx.fill();
  }

  function render(dt) {
    ctx.clearRect(0, 0, W, H);

    drawSlope();
    drawGoalGate();

    for (const o of state.obstacles) drawObstacle(o);
    drawPlayer();
    if (dt > 0) drawParticles(dt);

    drawProgressBar();

    if (!state.game.running) {
      drawBanner('Snow Dodge', 'スタートボタンで開始');
    } else if (state.game.paused) {
      drawBanner('PAUSED', 'P か 一時停止ボタンで再開');
    } else if (state.game.finished) {
      drawBanner('GOAL!', 'スタートでリスタート');
    } else if (state.game.gameOver) {
      drawBanner('GAME OVER', 'スタートでリスタート');
    }
  }

  return { render };
}
