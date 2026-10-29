/* AntarSvara — prototype
   A fixed starfield sits behind the whole page: parallax layers, twinkling, shooting stars,
   constellations that join up around the cursor, and stardust left by the pointer. */
(function () {
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------------- the sky ---------------- */
const sky = (function () {
  const c = $('#sky'), x = c.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, stars = [], meteors = [], dust = [], drawnOnce = false;
  const mouse = { x: -999, y: -999, tx: -999, ty: -999, active: false };
  const TINTS = ['255,246,220', '255,255,255', '214,222,255', '245,223,176', '243,198,201'];

  function build() {
    W = innerWidth; H = innerHeight;
    c.width = W * DPR; c.height = H * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.min(420, Math.round(W * H / 3200));
    stars = Array.from({ length: n }, () => {
      const depth = Math.random();                  // 0 = far, 1 = near
      return {
        x: Math.random() * W, y: Math.random() * H * 1.6,
        r: depth > .92 ? 1.4 + Math.random() * 1.2 : depth > .6 ? .9 + Math.random() * .6 : .4 + Math.random() * .5,
        d: .15 + depth * .85, a: .35 + Math.random() * .65,
        tw: .6 + Math.random() * 2.2, ph: Math.random() * 6.28, tint: TINTS[(Math.random() * TINTS.length) | 0],
      };
    });
  }
  build();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });

  addEventListener('pointermove', e => {
    mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.active = true;
    if (FINE && !REDUCED && Math.random() < .55) dust.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5) * .6, vy: Math.random() * .6 + .1, life: 1, r: Math.random() * 1.6 + .6 });
  });
  document.addEventListener('pointerleave', () => { mouse.active = false; });

  function meteor() {
    if (!document.hidden && !REDUCED) meteors.push({ x: W * (.3 + Math.random() * .8), y: -20 + Math.random() * H * .3, vx: -(7 + Math.random() * 5), vy: 3.5 + Math.random() * 2.5, life: 1 });
    setTimeout(meteor, 2600 + Math.random() * 4200);
  }
  setTimeout(meteor, 1500);

  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    // while the hero photo fills the screen the stars behind it are hidden: skip the work
    const heroEl = document.querySelector('.hero');
    if (drawnOnce && heroEl && heroEl.getBoundingClientRect().bottom > H * 1.02) { dust.length = 0; return; }
    drawnOnce = true;
    const time = t / 1000;
    mouse.x += (mouse.tx - mouse.x) * .3; mouse.y += (mouse.ty - mouse.y) * .3;
    const sy = scrollY, px = mouse.active ? (mouse.x - W / 2) : 0, py = mouse.active ? (mouse.y - H / 2) : 0;
    x.clearRect(0, 0, W, H);

    const near = [];
    const span = H * 1.6;
    for (const s of stars) {
      // parallax: near stars move more with scroll and with the pointer
      let yy = (s.y - sy * s.d * .35) % span; if (yy < 0) yy += span;
      if (yy > H + 4) continue;
      const xx = s.x - px * s.d * .025, yv = yy - py * s.d * .025;
      const tw = REDUCED ? s.a : s.a * (.55 + .45 * Math.sin(time * s.tw + s.ph));
      let glow = 0;
      if (mouse.active) {
        const dist = Math.hypot(xx - mouse.x, yv - mouse.y);
        if (dist < 170) { glow = 1 - dist / 170; if (s.r > .8) near.push({ x: xx, y: yv, g: glow }); }
      }
      const alpha = Math.min(1, tw + glow * .6);
      x.fillStyle = `rgba(${s.tint},${alpha})`;
      if (s.r < 1) x.fillRect(xx, yv, s.r * 1.6, s.r * 1.6);
      else {
        x.beginPath(); x.arc(xx, yv, s.r + glow * 1.2, 0, 6.283); x.fill();
        if (s.r > 1.6) { // a soft cross-flare on the brightest stars
          x.fillStyle = `rgba(${s.tint},${alpha * .35})`;
          x.fillRect(xx - s.r * 3, yv - .4, s.r * 6, .8); x.fillRect(xx - .4, yv - s.r * 3, .8, s.r * 6);
        }
      }
    }

    // constellations: join the bright stars that sit around the cursor
    if (near.length > 1) {
      x.lineWidth = .8;
      for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
        const a = near[i], b = near[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          x.strokeStyle = `rgba(232,194,122,${Math.min(a.g, b.g) * (1 - d / 120) * .9})`;
          x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
        }
      }
    }

    // shooting stars
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.x += m.vx; m.y += m.vy; m.life -= .012;
      if (m.life <= 0 || m.x < -100) { meteors.splice(i, 1); continue; }
      const g = x.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
      g.addColorStop(0, `rgba(255,248,225,${m.life})`); g.addColorStop(1, 'rgba(255,248,225,0)');
      x.strokeStyle = g; x.lineWidth = 1.6; x.beginPath(); x.moveTo(m.x, m.y); x.lineTo(m.x - m.vx * 14, m.y - m.vy * 14); x.stroke();
      x.fillStyle = `rgba(255,250,235,${m.life})`; x.beginPath(); x.arc(m.x, m.y, 1.6, 0, 6.283); x.fill();
    }

    // stardust left behind by the pointer
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i]; p.x += p.vx; p.y += p.vy; p.life -= .022;
      if (p.life <= 0) { dust.splice(i, 1); continue; }
      x.fillStyle = `rgba(245,223,176,${p.life})`; x.beginPath(); x.arc(p.x, p.y, p.r * p.life, 0, 6.283); x.fill();
    }
    if (dust.length > 140) dust.splice(0, dust.length - 140);
  }
  requestAnimationFrame(frame);
  return { burst(px, py, n = 26) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 1 + Math.random() * 3; dust.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, r: 1 + Math.random() * 1.8 }); } } };
})();

/* ---------------- nav ---------------- */
const nav = $('#nav');
const onNav = () => nav.classList.toggle('solid', scrollY > 30);
addEventListener('scroll', onNav, { passive: true }); onNav();

/* ---------------- split headings into letters ---------------- */
function split(el) {
  let i = 0;
  (function walk(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.append(' '); return; }
          const word = document.createElement('span'); word.style.whiteSpace = 'nowrap'; word.style.display = 'inline-block';
          [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'l'; s.style.setProperty('--d', i++); s.textContent = ch; word.append(s); });
          frag.append(word);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  })(el);
}
$$('.split').forEach(split);
requestAnimationFrame(() => $('.hero .split').classList.add('go'));

/* ---------------- reveal on scroll ---------------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  $$('.split', e.target).forEach(s => s.classList.add('go'));
  if (e.target.classList.contains('split')) e.target.classList.add('go');
  io.unobserve(e.target);
}), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
$$('.reveal').forEach(el => io.observe(el));

/* ---------------- drifting words ---------------- */
const words = ['clarity', 'intuition', 'healing', 'calm', 'courage', 'hope', 'release', 'balance', 'trust'];
$('#driftTrack').innerHTML = (words.map(w => `<span>${w}</span><i>✦</i>`).join('')).repeat(4);

/* ---------------- cosmos tilts toward the pointer ---------------- */
const cosmos = $('.cosmos'), hero = $('.hero');
if (FINE && !REDUCED) hero.addEventListener('pointermove', e => {
  const r = hero.getBoundingClientRect();
  cosmos.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 16 + 'deg');
  cosmos.style.setProperty('--rx', -((e.clientY - r.top) / r.height - .5) * 16 + 'deg');
});

/* ---------------- hero reveal, ported from the Spider-Man demo ----------------
   Bottom image: tarot cards face-up on a dark cloth. Top image: the Orion nebula.
   A trail of circles is drawn into an off-screen mask and the nebula is composited
   'source-in', so it shows only where the cursor (the crystal ball) has passed. */
(function reveal() {
  const cv = $('#reveal'), ctx = cv.getContext('2d'), hint = $('#revealHint');
  const DPR = 1, TRAIL = 30, EASE = .38;   // soft photos look the same at 1x and cost far less to composite
  let W = 0, H = 0, R = 150, ready = false, visible = true, lastMove = 0, spin = 0;
  const t0 = performance.now(), mouse = { x: -9999, y: -9999 }, smooth = { x: -9999, y: -9999 };
  let trail = [], sparks = [];
  const bottom = new Image(), top = new Image();
  bottom.src = 'https://images.unsplash.com/photo-1671013033034-5ea58e9c5008?w=2000&q=75&auto=format';
  top.src = 'https://images.unsplash.com/photo-1608178398319-48f814d0750c?w=2000&q=78&auto=format';
  const mask = document.createElement('canvas'), mx = mask.getContext('2d');
  const baseC = document.createElement('canvas'), bx = baseC.getContext('2d');
  const topC = document.createElement('canvas'), tx = topC.getContext('2d');

  function cover(img, cw, ch) {
    const ir = img.width / img.height, cr = cw / ch;
    return ir > cr ? [(cw - ch * ir) / 2, 0, ch * ir, ch] : [0, (ch - cw / ir) / 2, cw, cw / ir];
  }
  // scale, crop and tint both photos once per resize; frames then only blit them
  function bake() {
    if (!bottom.naturalWidth || !top.naturalWidth) return;
    [baseC, topC].forEach(c => { c.width = W * DPR; c.height = H * DPR; });
    bx.setTransform(DPR, 0, 0, DPR, 0, 0); tx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const b = cover(bottom, W, H); bx.drawImage(bottom, b[0], b[1], b[2], b[3]);
    bx.fillStyle = 'rgba(11,10,31,.62)'; bx.fillRect(0, 0, W, H);
    let g = bx.createLinearGradient(0, 0, W * .6, 0);          // darker behind the headline
    g.addColorStop(0, 'rgba(11,10,31,.55)'); g.addColorStop(1, 'rgba(11,10,31,0)');
    bx.fillStyle = g; bx.fillRect(0, 0, W, H);
    const t = cover(top, W, H); tx.drawImage(top, t[0], t[1], t[2], t[3]);
    tx.fillStyle = 'rgba(30,10,60,.12)'; tx.fillRect(0, 0, W, H);
    // fade both photos into the starfield here, once, instead of a CSS mask recomputed every frame
    [bx, tx].forEach(c => {
      const f = c.createLinearGradient(0, H * .76, 0, H);
      f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = f; c.fillRect(0, H * .76, W, H * .24);
      c.globalCompositeOperation = 'source-over';
    });
    ready = true;
  }
  function resize() {
    W = cv.offsetWidth; H = cv.offsetHeight;
    cv.width = mask.width = W * DPR; cv.height = mask.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); mx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = Math.max(90, Math.min(W, H) * .2);
    bake();
  }
  let loaded = 0;
  const go = () => { if (++loaded === 2) { resize(); requestAnimationFrame(frame); } };
  bottom.onload = go; top.onload = go;
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

  function setPoint(cx, cy) {
    const r = cv.getBoundingClientRect(), nx = cx - r.left, ny = cy - r.top;
    const speed = Math.hypot(nx - mouse.x, ny - mouse.y);
    mouse.x = nx; mouse.y = ny; lastMove = performance.now(); hint.style.opacity = 0;
    if (speed > 18 && speed < 400 && sparks.length < 60) sparks.push({ x: nx, y: ny, vx: (Math.random() - .5) * 1.6, vy: (Math.random() - .5) * 1.6, life: 1, s: 2 + Math.random() * 4 });
  }
  hero.addEventListener('mousemove', e => setPoint(e.clientX, e.clientY));
  hero.addEventListener('touchmove', e => setPoint(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !ready || document.hidden) return;
    if (now - lastMove > 2600) {             // idle: drift in a figure-8 so it shows on phones too
      const t = (now - t0) / 1700;
      mouse.x = W * (.5 + .3 * Math.sin(t)); mouse.y = H * (.48 + .22 * Math.sin(2 * t));
    }
    if (smooth.x < -9000) { smooth.x = mouse.x; smooth.y = mouse.y; }
    smooth.x += (mouse.x - smooth.x) * EASE; smooth.y += (mouse.y - smooth.y) * EASE;
    trail.unshift({ x: smooth.x, y: smooth.y }); if (trail.length > TRAIL) trail.length = TRAIL;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(baseC, 0, 0, W, H);
    mx.globalCompositeOperation = 'source-over'; mx.clearRect(0, 0, W, H);
    for (let i = 0; i < trail.length; i++) {
      const k = 1 - i / trail.length; mx.globalAlpha = k * k;
      mx.beginPath(); mx.arc(trail[i].x, trail[i].y, R * (.25 + .75 * k), 0, 6.283); mx.fill();
    }
    mx.globalAlpha = 1; mx.globalCompositeOperation = 'source-in';
    mx.drawImage(topC, 0, 0, W, H);
    ctx.drawImage(mask, 0, 0, W, H);

    // the crystal ball: a gold rim, a glassy highlight and three orbiting sparks
    const h = trail[0];
    if (h) {
      const glass = ctx.createRadialGradient(h.x - R * .35, h.y - R * .4, 0, h.x, h.y, R);
      glass.addColorStop(0, 'rgba(255,255,255,.22)'); glass.addColorStop(.35, 'rgba(255,255,255,.04)'); glass.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(h.x, h.y, R, 0, 6.283); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(245,223,176,.85)';
      ctx.beginPath(); ctx.arc(h.x, h.y, R, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(245,223,176,.35)'; ctx.setLineDash([3, 7]);
      spin += .01; ctx.lineDashOffset = -spin * 40;
      ctx.beginPath(); ctx.arc(h.x, h.y, R + 12, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const a = spin * (1.4 + i * .3) + i * 2.09;
        ctx.fillStyle = i === 1 ? '#f3c6c9' : '#f5dfb0';
        ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * (R + 12), h.y + Math.sin(a) * (R + 12), 3 - i * .5, 0, 6.283); ctx.fill();
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.life -= .02;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      const s = p.s * p.life; ctx.fillStyle = `rgba(255,246,220,${p.life})`;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * .3, p.y - s * .3); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x + s * .3, p.y + s * .3);
      ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * .3, p.y + s * .3); ctx.lineTo(p.x - s, p.y); ctx.lineTo(p.x - s * .3, p.y - s * .3); ctx.fill();
    }
  }
})();

/* ---------------- tarot: the 22 Major Arcana ---------------- */
const MAJOR = [
  ['0', 'The Fool', 'mountain', ['new beginnings', 'trust', 'freedom'], 'Take the first step, even if you can’t see the whole path. Curiosity is your compass today.'],
  ['I', 'The Magician', 'infinity', ['willpower', 'skill', 'focus'], 'You already have the tools you need. Pick one, and begin.'],
  ['II', 'The High Priestess', 'moon', ['intuition', 'mystery', 'inner voice'], 'Get quiet. The answer you’re looking for is already whispering.'],
  ['III', 'The Empress', 'sprout', ['nurture', 'abundance', 'creativity'], 'Be gentle with what you’re growing, and that includes yourself.'],
  ['IV', 'The Emperor', 'crown', ['structure', 'stability', 'leadership'], 'A little structure will set you free. Make a plan you can keep.'],
  ['V', 'The Hierophant', 'key', ['tradition', 'learning', 'guidance'], 'Look for a teacher, a ritual or a wisdom that has stood the test of time.'],
  ['VI', 'The Lovers', 'heart', ['love', 'choice', 'harmony'], 'Choose with your heart and your values in the same room.'],
  ['VII', 'The Chariot', 'arrow', ['determination', 'direction', 'victory'], 'Hold the reins steady. Your momentum is real.'],
  ['VIII', 'Strength', 'flame', ['courage', 'patience', 'compassion'], 'Soft strength is still strength. Be kind, and stand your ground.'],
  ['IX', 'The Hermit', 'lantern', ['reflection', 'solitude', 'wisdom'], 'Step back for a while. Your own light is enough to see by.'],
  ['X', 'Wheel of Fortune', 'wheel', ['cycles', 'change', 'luck'], 'Things are turning. Stay open; what goes around is coming round.'],
  ['XI', 'Justice', 'scales', ['fairness', 'truth', 'balance'], 'Be honest with yourself first, and the right choice becomes clear.'],
  ['XII', 'The Hanged Man', 'drop', ['pause', 'surrender', 'new perspective'], 'Pause. Seeing this from another angle changes everything.'],
  ['XIII', 'Death', 'butterfly', ['endings', 'transformation', 'release'], 'Something is ending so something truer can begin. Let it.'],
  ['XIV', 'Temperance', 'hourglass', ['balance', 'patience', 'healing'], 'Slow and steady. Blend, don’t force.'],
  ['XV', 'The Devil', 'chain', ['attachment', 'habits', 'freedom'], 'Notice what’s holding you. Most chains are lighter than they look.'],
  ['XVI', 'The Tower', 'tower', ['sudden change', 'truth', 'breakthrough'], 'When things shake, what’s real stays standing. Rebuild on that.'],
  ['XVII', 'The Star', 'star', ['hope', 'renewal', 'healing'], 'Hope is returning. Let yourself believe in good things again.'],
  ['XVIII', 'The Moon', 'fullmoon', ['dreams', 'intuition', 'uncertainty'], 'Not everything needs to be clear tonight. Trust your feelings through the fog.'],
  ['XIX', 'The Sun', 'sun', ['joy', 'success', 'warmth'], 'Let yourself shine. Joy is allowed, and it’s on its way.'],
  ['XX', 'Judgement', 'sunrise', ['awakening', 'calling', 'renewal'], 'Listen to the call you keep hearing. You’re ready to rise.'],
  ['XXI', 'The World', 'wreath', ['completion', 'wholeness', 'journeys'], 'A chapter is complete. Celebrate how far you’ve come.'],
];

/* line-art motifs drawn in a 120×150 box */
function motif(kind) {
  const star = (cx, cy, r, cls = 'f') => `<path class="${cls}" d="M${cx} ${cy - r}L${cx + r * .28} ${cy - r * .28}L${cx + r} ${cy}L${cx + r * .28} ${cy + r * .28}L${cx} ${cy + r}L${cx - r * .28} ${cy + r * .28}L${cx - r} ${cy}L${cx - r * .28} ${cy - r * .28}Z"/>`;
  let s = '';
  switch (kind) {
    case 'sun': s = `<circle cx="60" cy="72" r="22"/><circle class="f" cx="60" cy="72" r="9"/>`;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; s += `<path class="g" d="M${60 + Math.cos(a) * 29} ${72 + Math.sin(a) * 29}L${60 + Math.cos(a) * (i % 2 ? 38 : 44)} ${72 + Math.sin(a) * (i % 2 ? 38 : 44)}"/>`; } break;
    case 'moon': s = `<path d="M70 42a32 32 0 1 0 0 62a26 26 0 1 1 0-62z"/>${star(88, 50, 6)}${star(94, 92, 4)}<path class="g" d="M30 122h60"/>`; break;
    case 'fullmoon': s = `<circle cx="60" cy="62" r="28"/><path class="g" d="M48 54a5 5 0 1 0 0.1 0M68 70a7 7 0 1 0 .1 0"/><path d="M40 112q10-10 20 0t20 0"/><path class="g" d="M46 124q7-7 14 0t14 0"/>${star(98, 34, 4)}`; break;
    case 'star': s = star(60, 72, 34, '') + star(60, 72, 10) + star(26, 40, 5) + star(96, 44, 6) + star(30, 112, 4) + star(92, 114, 5); break;
    case 'infinity': s = `<path d="M60 80c-12-16-36-16-36 0s24 16 36 0 36-16 36 0-24 16-36 0"/><path class="g" d="M60 30v28"/>${star(60, 26, 6)}<path class="g" d="M34 118h52"/>`; break;
    case 'sprout': s = `<path d="M60 120V64"/><path d="M60 92c-18 0-26-12-26-24 14 0 26 8 26 24zM60 76c16 0 24-12 24-24-14 0-24 8-24 24z"/><path class="g" d="M28 122q32-12 64 0"/><circle class="f" cx="60" cy="56" r="5"/>`; break;
    case 'crown': s = `<path d="M30 96L34 56l14 18 12-26 12 26 14-18 4 40z"/><path d="M30 106h60"/><circle class="f" cx="60" cy="44" r="5"/><circle class="f" cx="34" cy="52" r="4"/><circle class="f" cx="86" cy="52" r="4"/>`; break;
    case 'key': s = `<circle cx="60" cy="48" r="16"/><circle class="g" cx="60" cy="48" r="6"/><path d="M60 64v58M60 100h14M60 112h10"/>`; break;
    case 'heart': s = `<path d="M60 112C30 92 24 74 30 62c6-12 22-14 30 0 8-14 24-12 30 0 6 12 0 30-30 50z"/>${star(60, 36, 7)}${star(30, 40, 4)}${star(90, 40, 4)}`; break;
    case 'arrow': s = `<path d="M60 120V36M60 36l-16 18M60 36l16 18"/><path class="g" d="M40 92l20-14 20 14M40 108l20-14 20 14"/>`; break;
    case 'flame': s = `<path d="M60 122c-22 0-30-18-24-34 4-10 12-14 12-28 10 6 14 14 14 22 4-4 6-10 6-16 12 10 18 22 16 34-2 14-12 22-24 22z"/><path class="g" d="M60 114c-8 0-12-8-8-16 2-4 6-6 6-12 8 6 12 12 10 20-1 5-4 8-8 8z"/>`; break;
    case 'lantern': s = `<path d="M60 28v10M50 38h20"/><path d="M44 46h32l-4 56H48z"/><path d="M42 102h36"/>${star(60, 74, 9)}<path class="g" d="M60 108v14"/>`; break;
    case 'wheel': s = `<circle cx="60" cy="74" r="38"/><circle cx="60" cy="74" r="14"/><circle class="f" cx="60" cy="74" r="5"/>`;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += `<path class="g" d="M${60 + Math.cos(a) * 14} ${74 + Math.sin(a) * 14}L${60 + Math.cos(a) * 38} ${74 + Math.sin(a) * 38}"/>`; } break;
    case 'scales': s = `<path d="M60 30v88M40 118h40M26 50h68"/><path class="g" d="M26 50l-12 30h24zM94 50l-12 30h24z"/><path d="M14 80q12 10 24 0M82 80q12 10 24 0"/>${star(60, 26, 5)}`; break;
    case 'drop': s = `<path d="M60 38c14 22 24 36 24 50a24 24 0 0 1-48 0c0-14 10-28 24-50z"/><path class="g" d="M48 92a12 12 0 0 0 12 12"/><path d="M30 30h60"/>`; break;
    case 'butterfly': s = `<path d="M60 52v52"/><path d="M60 64c-10-22-34-26-36-10-2 14 18 22 36 14zM60 64c10-22 34-26 36-10 2 14-18 22-36 14z"/><path class="g" d="M60 82c-8 6-26 18-20 28 6 8 16-4 20-14zM60 82c8 6 26 18 20 28-6 8-16-4-20-14z"/><path class="g" d="M60 52l-6-10M60 52l6-10"/>`; break;
    case 'hourglass': s = `<path d="M38 30h44M38 120h44M42 30c0 30 36 30 36 45s-36 15-36 45M78 30c0 30-36 30-36 45s36 15 36 45"/><path class="f" d="M48 116h24l-12-14z"/>`; break;
    case 'chain': s = `<ellipse cx="40" cy="60" rx="16" ry="10"/><ellipse class="g" cx="60" cy="75" rx="16" ry="10"/><ellipse cx="80" cy="90" rx="16" ry="10"/>${star(30, 112, 5)}${star(92, 40, 5)}`; break;
    case 'tower': s = `<path d="M46 122V56h28v66M42 56h36l-4-10H46z"/><path d="M54 76h12v12H54z"/><path class="g" d="M96 24L80 50h12L76 78"/>`; break;
    case 'sunrise': s = `<path d="M24 100h72"/><path d="M36 100a24 24 0 0 1 48 0"/>`;
      for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; s += `<path class="g" d="M${60 + Math.cos(a) * 32} ${100 + Math.sin(a) * 32}L${60 + Math.cos(a) * 46} ${100 + Math.sin(a) * 46}"/>`; }
      s += `<path d="M30 116h60M40 126h40"/>`; break;
    case 'wreath': s = `<ellipse cx="60" cy="75" rx="32" ry="44"/>${star(60, 75, 12)}`;
      for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; const px = 60 + Math.cos(a) * 32, py = 75 + Math.sin(a) * 44; s += `<path class="g" d="M${px} ${py}l${Math.cos(a + 1) * 7} ${Math.sin(a + 1) * 7}"/>`; } break;
    default: s = `<path d="M18 112l26-40 14 20 18-32 26 52z"/><circle class="f" cx="88" cy="40" r="9"/><path class="g" d="M44 112q10-10 30-6"/>`;
  }
  return `<svg viewBox="0 0 120 150" aria-hidden="true">${s}</svg>`;
}

const deck = $('#deck'), slot = $('#slot'), meaning = $('#meaning'), again = $('#again');
let order = MAJOR.map((_, i) => i);
let picked = false;

function layout() {
  const cards = $$('.tcard', deck), n = cards.length, spread = innerWidth < 600 ? 80 : 104;
  cards.forEach((c, i) => c.style.setProperty('--a', (-spread / 2 + spread * i / (n - 1)).toFixed(2) + 'deg'));
}
function buildDeck() {
  deck.innerHTML = order.map((m, i) => `<button class="tcard" type="button" role="listitem" data-i="${m}" style="z-index:${i}" aria-label="Card ${i + 1}"><span class="back"></span></button>`).join('');
  layout();
}
buildDeck();
addEventListener('resize', layout);

$('#shuffle').addEventListener('click', () => {
  if (picked) reset();
  deck.classList.add('gather');
  setTimeout(() => {
    for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    buildDeck(); deck.classList.add('gather');
    requestAnimationFrame(() => requestAnimationFrame(() => deck.classList.remove('gather')));
    toast('Deck shuffled. Pick the card that calls to you.');
  }, 480);
});

deck.addEventListener('click', e => {
  const card = e.target.closest('.tcard'); if (!card || picked) return;
  picked = true;
  const [num, name, kind, keys, msg] = MAJOR[+card.dataset.i];
  const from = card.getBoundingClientRect(), to = slot.getBoundingClientRect();
  card.classList.add('chosen'); deck.classList.add('picked');

  slot.innerHTML = `<div class="mover"><div class="flip"><span class="back"></span>
    <div class="face"><span class="num">${num}</span>${motif(kind)}<span class="name">${name}</span></div></div></div>`;
  const mover = $('.mover', slot), flip = $('.flip', slot);
  mover.style.cssText = 'position:absolute;inset:0';
  const dx = (from.left + from.width / 2) - (to.left + to.width / 2), dy = (from.top + from.height / 2) - (to.top + to.height / 2);
  const s = from.width / to.width;
  const FLY = REDUCED ? 0 : 800;
  mover.animate([{ transform: `translate(${dx}px,${dy}px) scale(${s})` }, { transform: 'none' }], { duration: FLY, easing: 'cubic-bezier(.2,.8,.2,1)' });
  // a timer rather than onfinish, so the reveal still happens if the tab's animations are throttled
  setTimeout(() => {
    mover.getAnimations().forEach(a => a.finish());
    flip.classList.add('flipped');
    setTimeout(() => {
      const r = slot.getBoundingClientRect(); sky.burst(r.left + r.width / 2, r.top + r.height / 2, 40);
      meaning.innerHTML = `<p class="eyebrow">Your card · ${num}</p><h3>${name}</h3>
        <div class="keys">${keys.map(k => `<span>${k}</span>`).join('')}</div>
        <p class="msg">“${msg}”</p>
        <p style="margin-top:14px">Want the full story behind this card and your question? Book a reading below.</p>`;
      meaning.classList.remove('show'); void meaning.offsetWidth; meaning.classList.add('show');
      again.hidden = false;
    }, REDUCED ? 0 : 700);
  }, FLY + 20);
});
function reset() {
  picked = false; slot.innerHTML = ''; again.hidden = true;
  deck.classList.remove('picked'); $$('.tcard', deck).forEach(c => c.classList.remove('chosen'));
  meaning.innerHTML = `<p class="eyebrow">Waiting for your card</p><h3>The stars are listening</h3><p>Your card's meaning will appear here.</p>`;
}
again.addEventListener('click', () => { reset(); $('#draw').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); });

/* ---------------- readings: glow follows the pointer ---------------- */
$$('.offer').forEach(o => o.addEventListener('pointermove', e => {
  const r = o.getBoundingClientRect();
  o.style.setProperty('--mx', e.clientX - r.left + 'px'); o.style.setProperty('--my', e.clientY - r.top + 'px');
}));

/* ---------------- steps: the constellation path draws itself ---------------- */
const stepPath = $('#stepPath'), steps = $('#steps');
if (stepPath) {
  const L = stepPath.getTotalLength();
  stepPath.style.strokeDasharray = L; stepPath.style.strokeDashoffset = L;
  const draw = () => {
    const r = steps.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .8)));
    stepPath.style.strokeDashoffset = L * (1 - p);
  };
  addEventListener('scroll', draw, { passive: true }); draw();
}

/* ---------------- singing bowl (Web Audio, nothing to download) ---------------- */
let audio;
const bowl = $('#bowl'), waves = $('#waves'), bowlLabel = $('#bowlLabel');
bowl.addEventListener('click', () => {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const now = audio.currentTime, master = audio.createGain();
    master.gain.setValueAtTime(.0001, now); master.gain.exponentialRampToValueAtTime(.32, now + .03); master.gain.exponentialRampToValueAtTime(.0001, now + 9);
    master.connect(audio.destination);
    // a bowl's partials are inharmonic; slightly detuned pairs give it that slow "wah-wah" beating
    [[1, .55], [2.71, .25], [5.15, .1], [8.4, .04]].forEach(([mul, g]) => {
      [0, 1.6].forEach(det => {
        const o = audio.createOscillator(), og = audio.createGain();
        o.type = 'sine'; o.frequency.value = 216 * mul + det;
        og.gain.value = g / 2; o.connect(og); og.connect(master);
        o.start(now); o.stop(now + 9.2);
      });
    });
  } catch (e) { /* no audio: the visuals still play */ }
  for (let i = 0; i < 3; i++) setTimeout(() => {
    const w = document.createElement('i'); waves.append(w); setTimeout(() => w.remove(), 3300);
  }, i * 380);
  const r = bowl.getBoundingClientRect(); sky.burst(r.left + r.width / 2, r.top + r.height * .45, 30);
  bowlLabel.textContent = 'Breathe in…';
  clearTimeout(bowl._t); bowl._t = setTimeout(() => { bowlLabel.textContent = '…and slowly out'; bowl._t = setTimeout(() => { bowlLabel.textContent = 'Tap to ring again'; }, 4000); }, 4000);
});

/* ---------------- tonight's moon ---------------- */
(function moon() {
  const SYN = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
  const days = (Date.now() - ref) / 864e5;
  const p = ((days / SYN) % 1 + 1) % 1;
  const phases = [
    [.03, 'New Moon', 'A blank page. Set one small, honest intention and say it out loud.'],
    [.22, 'Waxing Crescent', 'Something is beginning. Nurture it quietly and don’t rush it.'],
    [.28, 'First Quarter', 'A moment to act. Make the choice you’ve been circling, then commit.'],
    [.47, 'Waxing Gibbous', 'Refine and adjust. You’re closer than you think.'],
    [.53, 'Full Moon', 'Feel everything, then release what you’re done carrying.'],
    [.72, 'Waning Gibbous', 'Share what you’ve learned. Gratitude grows here.'],
    [.78, 'Last Quarter', 'Clear some space. Forgive, declutter and rest.'],
    [.97, 'Waning Crescent', 'Slow down and recharge before the next beginning.'],
    [1.01, 'New Moon', 'A blank page. Set one small, honest intention and say it out loud.'],
  ];
  const [, name, text] = phases.find(ph => p < ph[0]);
  const illum = Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100);
  const toFull = ((.5 - p + 1) % 1) * SYN;
  const full = new Date(Date.now() + toFull * 864e5).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  $('#moonName').innerHTML = `${name.split(' ')[0]} <em>${name.split(' ').slice(1).join(' ')}</em>`;
  $('#moonText').textContent = text;
  $('#moonMeta').textContent = `${illum}% lit · next full moon ${toFull < .5 ? 'tonight' : full}`;
  // lit shape: outer limb plus an elliptical terminator
  const r = 50, cx = 60, cy = 60, rx = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  let d;
  if (p < .5) d = `M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}A${rx} ${r} 0 0 ${p < .25 ? 0 : 1} ${cx} ${cy - r}Z`;
  else d = `M${cx} ${cy - r}A${r} ${r} 0 0 0 ${cx} ${cy + r}A${rx} ${r} 0 0 ${p > .75 ? 1 : 0} ${cx} ${cy - r}Z`;
  $('#moonLit').setAttribute('d', d);
})();

/* ---------------- kind words (sample) ---------------- */
const NOTES = [
  ['I came in anxious about a career move and left feeling calm and clear. The reading was so gentle.', 'Tanvi'],
  ['The sound healing before my reading made me cry in the best way. I felt lighter for days.', 'Ananya'],
  ['Honest, kind and scarily accurate. The follow-up chat helped me actually act on it.', 'Meher'],
];
$('#notes').innerHTML = NOTES.map(([q, n]) => `<div class="note reveal"><div class="stars">✦✦✦✦✦</div><p>“${q}”</p><b>${n}</b></div>`).join('');
$$('#notes .note').forEach(n => io.observe(n));

/* ---------------- toast ---------------- */
let tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }

/* ---------------- star cursor ---------------- */
if (FINE) {
  const cur = $('#cursor');
  document.body.classList.add('has-cursor');
  addEventListener('pointermove', e => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; cur.classList.add('on'); });
  document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a,button')));
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
  addEventListener('pointerdown', () => cur.classList.add('down'));
  addEventListener('pointerup', () => cur.classList.remove('down'));
}
})();
