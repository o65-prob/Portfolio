const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function tick() {
  const el = $('time');
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 3e4);

(function initBlob() {
  const blob = $('blob');
  if (!blob) return;

  let targetX = innerWidth / 2;
  let targetY = innerHeight / 2;
  let curX = targetX;
  let curY = targetY;
  const ease = 0.02;

  const moveBlob = e => {
    targetX = e.clientX;
    targetY = e.clientY;
    blob.style.opacity = 1;
  };
  const hideBlob = () => blob.style.opacity = 0;

  addEventListener('pointermove', moveBlob);
  addEventListener('pointerleave', hideBlob);

  (function loop() {
    curX += (targetX - curX) * ease;
    curY += (targetY - curY) * ease;

    const offsetX = (curX - innerWidth / 2) * 0.2;
    const offsetY = (curY - innerHeight / 2) * 0.13;

    blob.style.transform = `translate(${curX + offsetX}px, ${curY + offsetY}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
})();

(function initTheme() {
  const root = document.documentElement;
  const btn = $('toggleMode');
  if (!btn) return;

  if (matchMedia('(prefers-color-scheme: light)').matches) root.classList.add('light');

  btn.onclick = () => {
    const isLight = root.classList.toggle('light');
    btn.setAttribute('aria-pressed', isLight);
  };
})();

const toastEl = $('toast');
function showToast(msg, ms = 1400) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), ms);
}

function initStars() {
  const canvas = $('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let dpr = devicePixelRatio || 1;

  const STAR_COUNT = 80;
  const SPEED = 0.3;
  const LINK_DIST = 110;
  const TILT = 0.002;
  const GLOW_BASE = 36;

  function resize() {
    const w = innerWidth, h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  let tiltX = 0, tiltY = 0;
  addEventListener('pointermove', e => {
    tiltX = (e.clientX - innerWidth / 2) * TILT;
    tiltY = (e.clientY - innerHeight / 2) * TILT;
  });

  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * SPEED,
    vy: (Math.random() - 0.5) * SPEED,
    r: Math.random() * 1.5 + 0.7,
    a: Math.random() * 0.6 + 0.4,
    ox: 0, oy: 0,
    glow: 0
  }));

  function update() {
    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -20) s.x = innerWidth + 20;
      if (s.x > innerWidth + 20) s.x = -20;
      if (s.y < -20) s.y = innerHeight + 20;
      if (s.y > innerHeight + 20) s.y = -20;

      const depth = s.r + 0.3;
      s.ox += (tiltX * depth - s.ox) * 0.07;
      s.oy += (tiltY * depth - s.oy) * 0.07;

      let near = 0;
      const px = s.x + s.ox * 32;
      const py = s.y + s.oy * 32;
      for (const o of stars) {
        if (s === o) continue;
        const dx = px - (o.x + o.ox * 32);
        const dy = py - (o.y + o.oy * 32);
        if (Math.hypot(dx, dy) < LINK_DIST) near++;
      }
      const target = clamp(near / 5, 0, 1);
      s.glow += (target - s.glow) * 0.09;
    }
  }

  function drawGlow() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of stars) {
      if (s.glow < 0.03) continue;
      const x = s.x + s.ox * 32;
      const y = s.y + s.oy * 32;
      const sz = GLOW_BASE + s.glow * 130;
      const g = ctx.createRadialGradient(x, y, 0, x, y, sz);
      g.addColorStop(0, `rgba(70,180,255,${0.07 * s.glow})`);
      g.addColorStop(0.5, `rgba(70,180,255,${0.018 * s.glow})`);
      g.addColorStop(1, 'rgba(70,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStars() {
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x + s.ox * 32, s.y + s.oy * 32, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }
  }

  function drawLinks() {
    for (let i = 0; i < stars.length; i++) {
      let cnt = 0;
      for (let j = i + 1; j < stars.length && cnt < 3; j++) {
        const a = stars[i], b = stars[j];
        const ax = a.x + a.ox * 32, ay = a.y + a.oy * 32;
        const bx = b.x + b.ox * 32, by = b.y + b.oy * 32;
        const d = Math.hypot(ax - bx, ay - by);
        if (d < LINK_DIST) {
          cnt++;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(255,255,255,${0.6 - d / 190})`;
          ctx.lineWidth = 0.35;
          ctx.stroke();
        }
      }
    }
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  function frame() {
    clear();
    update();
    drawGlow();
    drawStars();
    drawLinks();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

initStars();
