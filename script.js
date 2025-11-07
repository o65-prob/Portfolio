const $ = id => document.getElementById(id);
const limit = (val, min, max) => Math.max(min, Math.min(max, val));

function updateTime() {
  const el = $('time');
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
updateTime();
setInterval(updateTime, 3e4);

(function setupCursorBlob() {
  const blob = $('blob');
  if (!blob) return;

  let goalX = innerWidth / 2, goalY = innerHeight / 2;
  let posX = goalX, posY = goalY;
  const SMOOTH = 0.13;

  onpointermove = e => {
    goalX = e.clientX;
    goalY = e.clientY;
    blob.style.opacity = 1;
  };
  onpointerleave = () => blob.style.opacity = 0;

  (function move() {
    posX += (goalX - posX) * SMOOTH;
    posY += (goalY - posY) * SMOOTH;
    const driftX = (posX - innerWidth / 2) * 0.2;
    const driftY = (posY - innerHeight / 2) * 0.13;
    blob.style.transform = `translate(${posX + driftX}px, ${posY + driftY}px) translate(-50%,-50%)`;
    requestAnimationFrame(move);
  })();
})();

(function setupThemeSwitch() {
  const root = document.documentElement;
  const btn = $('toggleMode');
  if (!btn) return;
  if (matchMedia('(prefers-color-scheme: light)').matches) root.classList.add('light');
  btn.onclick = () => {
    const light = root.classList.toggle('light');
    btn.setAttribute('aria-pressed', light);
  };
})();

const toast = $('toast');
function notify(msg, time = 1400) {
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), time);
  }
}

function setupStarfield() {
  const canvas = $('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let dpr = devicePixelRatio || 1;

  const TOTAL_STARS = 80;
  const DRIFT = 0.3;
  const BOND_RANGE = 110;
  const TILT_POWER = 0.002;
  const GLOW_BASE = 36;

  function fitCanvas() {
    const w = innerWidth, h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fitCanvas();
  addEventListener('resize', fitCanvas);

  let tiltX = 0, tiltY = 0;
  onpointermove = e => {
    tiltX = (e.clientX - innerWidth / 2) * TILT_POWER;
    tiltY = (e.clientY - innerHeight / 2) * TILT_POWER;
  };

  const points = Array.from({ length: TOTAL_STARS }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * DRIFT,
    vy: (Math.random() - 0.5) * DRIFT,
    r: Math.random() * 1.5 + 0.7,
    a: Math.random() * 0.6 + 0.4,
    ox: 0, oy: 0,
    glow: 0
  }));

  function movePoints() {
    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = innerWidth + 20;
      if (p.x > innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = innerHeight + 20;
      if (p.y > innerHeight + 20) p.y = -20;

      const depth = p.r + 0.3;
      p.ox += (tiltX * depth - p.ox) * 0.07;
      p.oy += (tiltY * depth - p.oy) * 0.07;

      let neighbors = 0;
      const px = p.x + p.ox * 32;
      const py = p.y + p.oy * 32;
      for (const other of points) {
        if (p === other) continue;
        const dx = px - (other.x + other.ox * 32);
        const dy = py - (other.y + other.oy * 32);
        if (Math.hypot(dx, dy) < BOND_RANGE) neighbors++;
      }
      const target = limit(neighbors / 5, 0, 1);
      p.glow += (target - p.glow) * 0.09;
    }
  }

  function drawGlows() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of points) {
      if (p.glow < 0.03) continue;
      const x = p.x + p.ox * 32;
      const y = p.y + p.oy * 32;
      const size = GLOW_BASE + p.glow * 130;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, `rgba(70,180,255,${0.07 * p.glow})`);
      grad.addColorStop(0.5, `rgba(70,180,255,${0.018 * p.glow})`);
      grad.addColorStop(1, 'rgba(70,180,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPoints() {
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x + p.ox * 32, p.y + p.oy * 32, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.fill();
    }
  }

  function drawBonds() {
    for (let i = 0; i < points.length; i++) {
      let links = 0;
      for (let j = i + 1; j < points.length && links < 3; j++) {
        const a = points[i], b = points[j];
        const ax = a.x + a.ox * 32, ay = a.y + a.oy * 32;
        const bx = b.x + b.ox * 32, by = b.y + b.oy * 32;
        const dist = Math.hypot(ax - bx, ay - by);
        if (dist < BOND_RANGE) {
          links++;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(255,255,255,${0.6 - dist / 190})`;
          ctx.lineWidth = 0.35;
          ctx.stroke();
        }
      }
    }
  }

  function clearSky() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  function animate() {
    clearSky();
    movePoints();
    drawGlows();
    drawPoints();
    drawBonds();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

setupStarfield();
