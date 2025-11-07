/* ---------- Utilities ---------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Clock (local, respects user locale) ---------- */
function updateClock() {
  const el = $('time');
  if (!el) return;
  const now = new Date();
  const opts = { hour: '2-digit', minute: '2-digit' };
  el.textContent = now.toLocaleTimeString([], opts);
}
updateClock();
setInterval(updateClock, 30 * 1000);

/* ---------- Blob / subtle follow effect ---------- */
(function initBlobFollow() {
  const blob = $('blob');
  if (!blob) return;

  // position smoothing
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  const EASE = 0.12;

  window.addEventListener('pointermove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    blob.style.opacity = '1';
  });
  window.addEventListener('pointerleave', () => { blob.style.opacity = '0'; });

  function tick() {
    currentX += (targetX - currentX) * EASE;
    currentY += (targetY - currentY) * EASE;
    // small parallax offset to make movement feel organic
    const offsetX = (currentX - window.innerWidth / 2) * 0.18;
    const offsetY = (currentY - window.innerHeight / 2) * 0.12;
    blob.style.transform = `translate(${currentX + offsetX}px, ${currentY + offsetY}px) translate(-50%,-50%)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* ---------- Theme toggle (keeps existing behavior) ---------- */
(function initThemeToggle() {
  const htmlRoot = document.documentElement;
  const toggle = $('toggleMode');
  if (!toggle) return;
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  if (prefersLight) htmlRoot.classList.add('light');
  toggle.addEventListener('click', () => {
    const isLight = htmlRoot.classList.toggle('light');
    toggle.setAttribute('aria-pressed', String(isLight));
  });
})();

/* ---------- Toast helper (for small feedback) ---------- */
const toastEl = $('toast');
function showToast(message, ms = 1400) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), ms);
}

/* ---------- Starfield with faint constellation glows ---------- */
(function initStarfield() {
  const canvas = $('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Configurable constants
  const NUM_STARS = 70;
  const STAR_SPEED = 0.25;        // max velocity magnitude
  const PARALLAX_FACTOR = 0.002;  // pointer parallax sensitivity
  const CLUSTER_RADIUS = 110;     // distance to consider neighbors
  const WEIGHT_SMOOTH = 0.08;     // smoothing for per-star weight (fade)
  const MIN_WEIGHT_VISIBLE = 0.02;

  // sizing / DPR handling
  let DPR = Math.max(1, window.devicePixelRatio || 1);
  function resizeCanvas() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    // Use setTransform instead of scale to avoid accumulating scale calls
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Parallax values updated on pointer move
  let parallaxX = 0, parallaxY = 0;
  window.addEventListener('pointermove', (e) => {
    parallaxX = (e.clientX - window.innerWidth / 2) * PARALLAX_FACTOR;
    parallaxY = (e.clientY - window.innerHeight / 2) * PARALLAX_FACTOR;
  });

  // Generate stars
  const stars = [];
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      ox: 0, oy: 0,                 // parallax offsets
      vx: (Math.random() - 0.5) * STAR_SPEED,
      vy: (Math.random() - 0.5) * STAR_SPEED,
      radius: Math.random() * 1.6 + 0.6,
      alpha: Math.random() * 0.7 + 0.3,
      w: 0                          // per-star dynamic "weight" for glow
    });
  }

  // Update positions, handle wrapping, and compute neighbor count -> target weight
  function updateStars() {
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];

      // Movement + wrap-around
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -10) s.x = window.innerWidth + 10;
      if (s.x > window.innerWidth + 10) s.x = -10;
      if (s.y < -10) s.y = window.innerHeight + 10;
      if (s.y > window.innerHeight + 10) s.y = -10;

      // Smooth parallax offsets (so they don't snap)
      s.ox += (parallaxX * (s.radius + 0.2) - s.ox) * 0.06;
      s.oy += (parallaxY * (s.radius + 0.2) - s.oy) * 0.06;

      // Count neighbors within CLUSTER_RADIUS (cheap O(n^2) is fine for ~70)
      let neighborCount = 0;
      const px = s.x + s.ox * 30;
      const py = s.y + s.oy * 30;
      for (let j = 0; j < stars.length; j++) {
        if (i === j) continue;
        const other = stars[j];
        const dx = px - (other.x + other.ox * 30);
        const dy = py - (other.y + other.oy * 30);
        if (Math.hypot(dx, dy) < CLUSTER_RADIUS) neighborCount++;
      }

      // Map neighborCount to a 0..1 target weight (keeps glow subtle)
      const targetWeight = clamp(neighborCount / 6, 0, 1);
      s.w += (targetWeight - s.w) * WEIGHT_SMOOTH; // smooth transition = fade
    }
  }

  // Draw per-star faint glows (overlapping creates constellation-like patches)
  function drawGlows() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // additive blending for soft glows
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const weight = s.w || 0;
      if (weight < MIN_WEIGHT_VISIBLE) continue; // skip ultra-faint
      const x = s.x + s.ox * 30;
      const y = s.y + s.oy * 30;
      const glowRadius = 36 + weight * 120; // scale glow by cluster density
      const g = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      // Very faint colors so glows remain background ambience
      g.addColorStop(0, `rgba(57,166,255,${0.06 * weight})`);
      g.addColorStop(0.45, `rgba(57,166,255,${0.02 * weight})`);
      g.addColorStop(1, 'rgba(57,166,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw the tiny star points
  function drawStars() {
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      ctx.beginPath();
      ctx.arc(s.x + s.ox * 30, s.y + s.oy * 30, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.fill();
    }
  }

  // Draw short connection lines between nearby stars (limits per star)
  function drawConnections() {
    for (let i = 0; i < stars.length; i++) {
      let connections = 0;
      for (let j = i + 1; j < stars.length && connections < 3; j++) {
        const aX = stars[i].x + stars[i].ox * 30;
        const aY = stars[i].y + stars[i].oy * 30;
        const bX = stars[j].x + stars[j].ox * 30;
        const bY = stars[j].y + stars[j].oy * 30;
        const dist = Math.hypot(aX - bX, aY - bY);
        if (dist < CLUSTER_RADIUS) {
          connections++;
          ctx.beginPath();
          ctx.moveTo(aX, aY);
          ctx.lineTo(bX, bY);
          ctx.strokeStyle = `rgba(255,255,255,${0.55 - dist / 200})`;
          ctx.lineWidth = 0.3;
          ctx.stroke();
        }
      }
    }
  }

  // Single animation frame: update then render
  function frame() {
    // clear drawing surface (accounting for DPR via setTransform earlier)
    ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    updateStars();
    drawGlows();       // draw faint, overlapping glows first (lighter blending)
    drawStars();       // then draw star points above glows
    drawConnections(); // then subtle lines

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})(); /* end starfield */
