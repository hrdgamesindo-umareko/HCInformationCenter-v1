/**
 * HC Information Center — motion background
 * Bola neon glossy "mengorbit" di zero gravity: morphing, glow additive,
 * parallax mengikuti pointer & scroll, ultra-smooth (lerp + rAF).
 *
 * Hemat baterai: jumlah bola berkurang di layar kecil, loop berhenti saat
 * tab tidak terlihat, dan pengguna dengan prefers-reduced-motion mendapat
 * frame statis.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // Palet: dominan cyan & purple, aksen coral & mint (dari referensi).
  var PALETTE = [
    { r: 34, g: 211, b: 238 },  // cyan
    { r: 34, g: 211, b: 238 },  // cyan
    { r: 168, g: 85, b: 247 },  // purple
    { r: 168, g: 85, b: 247 },  // purple
    { r: 255, g: 107, b: 139 }, // coral lembut
    { r: 78, g: 205, b: 196 }   // mint
  ];

  var orbs = [];
  var stars = [];
  var W = 0, H = 0, DPR = 1;
  var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }; // normalisasi 0..1
  var scrollEased = 0;
  var reduceMotion = false;
  var running = true;
  var t = 0;

  function isMobile() { return window.innerWidth < 640; }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeOrb(i) {
    var color = PALETTE[i % PALETTE.length];
    return {
      // pusat orbit ber-drift (zero gravity)
      cx: rand(0.08, 0.92), cy: rand(0.08, 0.92),
      dx: rand(0.00012, 0.00035) * (Math.random() < 0.5 ? 1 : -1),
      dy: rand(0.00010, 0.00028) * (Math.random() < 0.5 ? 1 : -1),
      // orbit lissajous di sekitar pusat
      orbA: rand(60, 190), orbB: rand(50, 160),
      wa: rand(0.00008, 0.00022), wb: rand(0.00006, 0.00018),
      pa: rand(0, Math.PI * 2), pb: rand(0, Math.PI * 2),
      // radius dasar + morph
      base: rand(26, 84),
      morphAmp: rand(0.10, 0.24),
      wm: rand(0.0003, 0.0008),
      pm: rand(0, Math.PI * 2),
      // squash-rotate untuk kesan "morphing blob"
      squash: rand(0.82, 0.97),
      rot: rand(0, Math.PI * 2),
      wrot: rand(0.00004, 0.00012),
      color: color,
      alpha: rand(0.55, 0.9),
      depth: rand(0.3, 1) // untuk parallax
    };
  }

  function makeStar() {
    return {
      x: Math.random(), y: Math.random(),
      size: rand(0.6, 1.6),
      tw: rand(0.0004, 0.0012),
      p: rand(0, Math.PI * 2),
      depth: rand(0.05, 0.25)
    };
  }

  function build() {
    var orbCount = isMobile() ? 4 : 7;
    var starCount = isMobile() ? 28 : 60;
    orbs = [];
    stars = [];
    for (var i = 0; i < orbCount; i++) orbs.push(makeOrb(i));
    for (var j = 0; j < starCount; j++) stars.push(makeStar());
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
    if (reduceMotion) drawFrame(performance.now());
  }

  /** Posisi orb pada waktu t (milidetik). */
  function orbState(orb, now) {
    var morph = 1 + orb.morphAmp * Math.sin(now * orb.wm + orb.pm);
    var r = orb.base * morph;
    var x = (orb.cx + orb.dx * now / 1000 + Math.sin(now * orb.wa + orb.pa) * orb.orbA / W) * W;
    var y = (orb.cy + orb.dy * now / 1000 + Math.sin(now * orb.wb + orb.pb) * orb.orbB / H) * H;
    return { x: x, y: y, r: r };
  }

  function drawOrb(orb, now) {
    var s = orbState(orb, now);
    // parallax pointer & scroll (diperhalus per depth)
    var px = (pointer.x - 0.5) * 46 * orb.depth;
    var py = (pointer.y - 0.5) * 30 * orb.depth + scrollEased * 60 * orb.depth;
    var x = s.x + px, y = s.y + py, r = s.r;
    var c = orb.color;

    // glow luar (halo besar, sangat lembut)
    var halo = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.6);
    halo.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.16 * orb.alpha) + ')');
    halo.addColorStop(0.5, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.05 * orb.alpha) + ')');
    halo.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // bola glossy dengan squash-rotate (kesan blob 3D)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(orb.rot + now * orb.wrot);
    ctx.scale(1, orb.squash);

    var body = ctx.createRadialGradient(
      -r * 0.35, -r * 0.4, r * 0.1, 0, 0, r
    );
    body.addColorStop(0, 'rgba(255,255,255,' + (0.28 * orb.alpha) + ')'); // spekular
    body.addColorStop(0.25, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.5 * orb.alpha) + ')');
    body.addColorStop(0.75, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.18 * orb.alpha) + ')');
    body.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStars(now) {
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(now * st.tw + st.p));
      var x = st.x * W + (pointer.x - 0.5) * 20 * st.depth;
      var y = st.y * H + scrollEased * 30 * st.depth;
      ctx.fillStyle = 'rgba(190,215,240,' + tw.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, st.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFrame(now) {
    ctx.clearRect(0, 0, W, H);

    // vignette dasar: matte gelap dengan sapuan cyan kiri-atas & purple kanan-bawah
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, 'rgba(10,16,26,0.35)');
    bg.addColorStop(0.5, 'rgba(6,9,15,0.5)');
    bg.addColorStop(1, 'rgba(13,10,24,0.35)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawStars(now);

    // glow additive supaya bola terasa "neon"
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < orbs.length; i++) drawOrb(orbs[i], now);
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(now) {
    if (!running) return;
    // gerak pointer diperhalus (lerp) — Apple-style smooth
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    scrollEased += ((window.scrollY || 0) / Math.max(H, 1) - scrollEased) * 0.06;
    drawFrame(now);
    requestAnimationFrame(loop);
  }

  function init() {
    reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resize();
    window.addEventListener('resize', resize, { passive: true });

    window.addEventListener('pointermove', function (e) {
      pointer.tx = e.clientX / Math.max(W, 1);
      pointer.ty = e.clientY / Math.max(H, 1);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
      } else if (!reduceMotion) {
        running = true;
        requestAnimationFrame(loop);
      }
    });

    if (reduceMotion) {
      drawFrame(0); // frame statis yang tetap indah
    } else {
      requestAnimationFrame(loop);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
