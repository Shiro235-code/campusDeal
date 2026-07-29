// Fond animé "espace fluide" : étoiles qui défilent, nébuleuses, et petites bulles
// lumineuses qui réagissent au curseur. Ce script crée lui-même son <canvas> et
// l'ajoute derrière tout le contenu de la page — un seul <script> à inclure,
// aucun HTML à modifier sur chaque page.
(function () {
  "use strict";

  // Respecte les personnes sensibles au mouvement : pas d'animation pour elles
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var canvas = document.createElement("canvas");
  canvas.id = "space-bg-canvas";
  canvas.style.cssText =
    "position:fixed; inset:0; width:100vw; height:100vh; z-index:-6; pointer-events:none; display:block;";
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext("2d", { alpha: false });

  var W, H, DPR;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  var PALETTE = [{ core: "255,255,255", mid: "255,255,255", edge: "255,255,255" }];

  var STAR_LAYERS = [
    { count: 140, speed: 0.8, size: [0.4, 1.1], twinkle: 0.4 },
    { count: 90, speed: 2.2, size: [0.7, 1.6], twinkle: 0.7 },
    { count: 45, speed: 5, size: [1.0, 2.2], twinkle: 1.0 },
  ];
  var stars = [];
  function initStars() {
    stars = [];
    STAR_LAYERS.forEach(function (layer, li) {
      for (var i = 0; i < layer.count; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H, layer: li,
          r: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
          phase: Math.random() * Math.PI * 2, tw: layer.twinkle,
        });
      }
    });
  }

  var nebulae = [];
  function initNebulae() {
    nebulae = [
      { x: 0.2, y: 0.3, r: 0.55, hue: "rgba(70,40,140,", vx: 0.00002, vy: 0.00001 },
      { x: 0.8, y: 0.65, r: 0.5, hue: "rgba(10,80,120,", vx: -0.000015, vy: 0.00002 },
      { x: 0.5, y: 0.85, r: 0.45, hue: "rgba(120,30,90,", vx: 0.00001, vy: -0.000018 },
    ];
  }

  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false, radius: 160 };
  window.addEventListener("mousemove", function (e) {
    mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.active = true;
  });
  window.addEventListener("mouseleave", function () { mouse.active = false; });
  window.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches[0]) {
      mouse.tx = e.touches[0].clientX; mouse.ty = e.touches[0].clientY; mouse.active = true;
    }
  }, { passive: true });
  window.addEventListener("touchend", function () { mouse.active = false; });

  var PARTICLE_COUNT = 50; // un peu moins que l'original : le fond tourne sur TOUTES les pages en continu
  var particles = [];
  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawnParticle() {
    var pal = PALETTE[0];
    var r = rand(1.5, 4.5);
    return {
      x: rand(r, W - r), y: rand(r, H - r),
      vx: rand(-0.14, 0.14), vy: rand(-0.14, 0.14),
      r: r, mass: r * r, pal: pal, pulse: Math.random() * Math.PI * 2, glow: 0,
    };
  }
  function initParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle());
  }

  var ripples = [];

  function collide(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var dist = Math.hypot(dx, dy) || 0.001;
    var minDist = a.r + b.r;
    if (dist >= minDist) return;

    var overlap = (minDist - dist) / 2;
    var nx = dx / dist, ny = dy / dist;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;

    var kx = a.vx - b.vx, ky = a.vy - b.vy;
    var p = (2 * (nx * kx + ny * ky)) / (a.mass + b.mass);
    a.vx -= p * b.mass * nx; a.vy -= p * b.mass * ny;
    b.vx += p * a.mass * nx; b.vy += p * a.mass * ny;

    a.vx *= 0.985; a.vy *= 0.985;
    b.vx *= 0.985; b.vy *= 0.985;

    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ripples.push({
      x: mx, y: my, r: (a.r + b.r) * 0.4, maxR: (a.r + b.r) * 3.2,
      alpha: 0.4, pal: Math.random() < 0.5 ? a.pal : b.pal,
    });
  }

  function updateParticles(dt) {
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, 0.18 * dt);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, 0.18 * dt);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.pulse += 0.02 * dt;

      p.vx += Math.sin(p.pulse * 0.5 + p.y * 0.002) * 0.001 * dt;
      p.vy += Math.cos(p.pulse * 0.4 + p.x * 0.002) * 0.001 * dt;

      var targetGlow = 0;
      if (mouse.active) {
        var dx = mouse.x - p.x, dy = mouse.y - p.y;
        var d = Math.hypot(dx, dy) || 0.001;
        if (d < mouse.radius) {
          var strength = 1 - d / mouse.radius;
          targetGlow = strength;
          var nx = dx / d, ny = dy / d;
          var tx = -ny, ty = nx;
          var pull = strength * strength * 0.045 * dt;
          p.vx += nx * pull + tx * pull * 0.6;
          p.vy += ny * pull + ty * pull * 0.6;
        }
      }
      p.glow += (targetGlow - p.glow) * Math.min(1, 0.15 * dt);

      if (p.x - p.r < 0) { p.x = p.r; p.vx *= -1; }
      if (p.x + p.r > W) { p.x = W - p.r; p.vx *= -1; }
      if (p.y - p.r < 0) { p.y = p.r; p.vy *= -1; }
      if (p.y + p.r > H) { p.y = H - p.r; p.vy *= -1; }

      var sp = Math.hypot(p.vx, p.vy);
      var maxSp = 0.7 + p.glow * 0.7;
      if (sp > maxSp) { p.vx = (p.vx / sp) * maxSp; p.vy = (p.vy / sp) * maxSp; }
    }

    for (var a = 0; a < particles.length; a++) {
      for (var b = a + 1; b < particles.length; b++) collide(particles[a], particles[b]);
    }
  }

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#05060f");
    g.addColorStop(0.55, "#070912");
    g.addColorStop(1, "#02030a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawNebulae(t) {
    ctx.save();
    for (var i = 0; i < nebulae.length; i++) {
      var n = nebulae[i];
      n.x += n.vx * t; n.y += n.vy * t;
      var cx = n.x * W, cy = n.y * H, rad = n.r * Math.max(W, H);
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, n.hue + "0.14)");
      grad.addColorStop(0.5, n.hue + "0.05)");
      grad.addColorStop(1, n.hue + "0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function drawStars(t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x -= STAR_LAYERS[s.layer].speed * 0.001 * 16.67;
      if (s.x < -2) s.x = W + 2;
      var flicker = 0.55 + 0.45 * Math.sin(t * 0.001 * (1 + s.tw) + s.phase);
      ctx.globalAlpha = flicker;
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLinks() {
    ctx.lineWidth = 1;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var a = particles[i], b = particles[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.hypot(dx, dy);
        var maxD = 55;
        if (d < maxD) {
          var boost = 1 + (a.glow + b.glow) * 3;
          var alpha = (1 - d / maxD) * 0.06 * boost;
          ctx.strokeStyle = "rgba(" + a.pal.mid + "," + Math.min(alpha, 0.5) + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var pulseR = p.r * (1 + 0.06 * Math.sin(p.pulse * 2)) * (1 + p.glow * 0.9);
      var g = p.glow;

      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseR * (1.8 + g * 2.2));
      grad.addColorStop(0, "rgba(" + p.pal.core + "," + (0.35 + g * 0.5) + ")");
      grad.addColorStop(0.4, "rgba(" + p.pal.mid + "," + (0.14 + g * 0.35) + ")");
      grad.addColorStop(1, "rgba(" + p.pal.edge + ",0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseR * (1.8 + g * 2.2), 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(" + p.pal.mid + "," + (0.10 + g * 0.15) + ")";
      ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(" + p.pal.core + "," + (0.55 + g * 0.45) + ")";
      ctx.lineWidth = 0.6 + g * 0.6;
      ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = "rgba(" + p.pal.core + "," + (0.6 + g * 0.4) + ")";
      ctx.arc(p.x - pulseR * 0.35, p.y - pulseR * 0.35, Math.max(0.4, pulseR * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCursorGlow(now) {
    if (!mouse.active) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var pulse = 0.85 + 0.15 * Math.sin(now * 0.006);
    var rad = mouse.radius * 0.75 * pulse;
    var grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, rad);
    grad.addColorStop(0, "rgba(255,255,255,0.10)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.035)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRipples(dt) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ripples = ripples.filter(function (r) { return r.alpha > 0.01; });
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      r.r += (r.maxR - r.r) * 0.12 * dt * 0.06;
      r.alpha *= Math.pow(0.90, dt * 0.06);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(" + r.pal.core + "," + (r.alpha * 0.35) + ")";
      ctx.lineWidth = 0.8;
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  var lastT = performance.now();
  function frame(now) {
    var dt = Math.min(3, (now - lastT) / 16.67);
    lastT = now;

    drawBackground();
    drawNebulae(now);
    drawStars(now);
    updateParticles(dt);
    drawLinks();
    drawCursorGlow(now);
    drawRipples(dt);
    drawParticles();

    requestAnimationFrame(frame);
  }

  initStars();
  initNebulae();
  initParticles();
  requestAnimationFrame(frame);

  window.addEventListener("resize", function () { initStars(); });
})();
