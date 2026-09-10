/* ═══════════ CLEOPOODLA — interactions ═══════════ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. THE GATE ───────────────────────────── */
  const gate = $('#gate');
  document.body.classList.add('locked');

  function enter() {
    CleoAudio.start();
    CleoAudio.play('gong');
    setTimeout(() => CleoAudio.play('woof'), 260);
    gate.classList.add('gone');
    document.body.classList.remove('locked');
    setTimeout(() => { gate.remove(); countUp(); }, 950);
  }
  $('#enterBtn').addEventListener('click', enter);

  /* ── 2. HUD ────────────────────────────────── */
  const musicBtn = $('#musicBtn'), sfxBtn = $('#sfxBtn');
  musicBtn.addEventListener('click', () => {
    musicBtn.classList.toggle('off', !CleoAudio.toggleMusic());
    CleoAudio.play('click');
  });
  sfxBtn.addEventListener('click', () => {
    const on = CleoAudio.toggleSfx();
    sfxBtn.classList.toggle('off', !on);
    sfxBtn.textContent = on ? '🔊' : '🔇';
    if (on) CleoAudio.play('ding');
  });

  /* ── 3. SFX WIRING ─────────────────────────── */
  $$('[data-sfx]').forEach(el => {
    el.addEventListener('mouseenter', () => CleoAudio.play('hover'));
    el.addEventListener('click', () => CleoAudio.play(el.dataset.sfx));
  });

  /* ── 4. COPY THE CONTRACT ──────────────────── */
  const caBox = $('#caBox'), caCopy = $('#caCopy');
  caBox.addEventListener('click', async () => {
    const txt = $('#caText').textContent.trim();
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    }
    CleoAudio.play('ding');
    caCopy.textContent = 'COPIED 𓂀';
    setTimeout(() => (caCopy.textContent = 'COPY'), 1600);
  });

  /* ── 5. COUNT-UP STATS ─────────────────────── */
  let counted = false;
  function countUp() {
    if (counted) return; counted = true;
    $$('[data-count]').forEach(el => {
      const target = +el.dataset.count, dur = 1500, t0 = performance.now();
      (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e).toLocaleString('en-US');
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* ── 6. SCROLL REVEALS (+ gong on each) ────── */
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      CleoAudio.play('riser');
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ── 7. PARALLAX ON THE QUEEN ──────────────── */
  const queen = $('#queen');
  if (!reduce) {
    addEventListener('mousemove', e => {
      const x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
      queen.style.setProperty('--px', (x * 18).toFixed(1) + 'px');
      queen.style.setProperty('--py', (y * 15).toFixed(1) + 'px');
    }, { passive: true });
    addEventListener('scroll', () => {
      const s = scrollY;
      if (s < innerHeight) $('.hero-art').style.opacity = Math.max(0, 1 - s / (innerHeight * .9));
    }, { passive: true });
  }

  /* ── 8. PET HER → PUMP MODE ────────────────── */
  const PUMP_AT = 10;
  let pets = 0;
  const petHint = $('#petHint'), petCount = $('#petCount');
  queen.addEventListener('click', () => {
    pets++;
    petHint.classList.add('hide');
    CleoAudio.play('woof');
    queen.classList.remove('shake'); void queen.offsetWidth; queen.classList.add('shake');
    spawnCoins(4, queen);
    if (pets < PUMP_AT) {
      petCount.textContent = `${PUMP_AT - pets} MORE…`;
    } else if (pets === PUMP_AT) {
      petCount.textContent = 'SHE IS PLEASED';
      pump();
    } else {
      petCount.textContent = `${pets} PETS`;
    }
  });

  /* ── 9. PUMP MODE ──────────────────────────── */
  const flash = $('#flashLayer');
  let pumping = false;
  function pump() {
    if (pumping) return; pumping = true;
    CleoAudio.duck(2600);
    CleoAudio.play('fanfare');
    CleoAudio.play('zap');
    document.body.classList.add('pump');
    flash.animate([{ opacity: .85 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
    let n = 0;
    const rain = setInterval(() => { spawnCoins(6); if (++n > 14) clearInterval(rain); }, 190);
    setTimeout(() => CleoAudio.play('woof'), 900);
    setTimeout(() => {
      document.body.classList.remove('pump');
      pumping = false;
      petCount.textContent = 'ASCENDED 𓂀';
    }, 5200);
  }

  /* ── 10. COIN PARTICLES ────────────────────── */
  const coinLayer = $('#coinLayer');
  const GLYPHS = ['🪙', '𓂀', '💰', '𓋹', '🐩', '𓊽'];
  function spawnCoins(n, from) {
    if (reduce) return;
    const r = from ? from.getBoundingClientRect() : null;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'coin';
      c.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      const x = r ? r.left + Math.random() * r.width : Math.random() * innerWidth;
      const y = r ? r.top + Math.random() * r.height : -50;
      c.style.left = x + 'px'; c.style.top = y + 'px';
      coinLayer.appendChild(c);
      const dx = (Math.random() - .5) * 420;
      const dy = r ? -160 - Math.random() * 220 : innerHeight + 120;
      c.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${(Math.random() - .5) * 900}deg)`, opacity: 0 }
      ], { duration: r ? 1200 : 2600, easing: r ? 'cubic-bezier(.2,.7,.4,1)' : 'linear' })
        .onfinish = () => c.remove();
    }
  }

  /* ── 11. SAND / DUST CANVAS ────────────────── */
  const cv = $('#sandCanvas'), cx = cv.getContext('2d');
  let W, H, dust = [];
  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    const count = Math.min(90, Math.round(W / 16));
    dust = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.9 + .4,
      vx: Math.random() * .35 + .06,
      vy: (Math.random() - .5) * .22,
      a: Math.random() * .45 + .12
    }));
  }
  function draw() {
    cx.clearRect(0, 0, W, H);
    for (const d of dust) {
      d.x += d.vx; d.y += d.vy;
      if (d.x > W + 5) { d.x = -5; d.y = Math.random() * H; }
      if (d.y < -5) d.y = H + 5; if (d.y > H + 5) d.y = -5;
      cx.beginPath();
      cx.fillStyle = `rgba(232,191,90,${d.a})`;
      cx.arc(d.x, d.y, d.r, 0, 7);
      cx.fill();
    }
    requestAnimationFrame(draw);
  }
  if (!reduce) { addEventListener('resize', resize); resize(); draw(); }

  /* ── 12. GALLERY ───────────────────────────── */
  const CAPS = ['THE CORONATION', 'THE ROMAN ERA', 'NILE BLUE', 'THE AFTERLIFE',
                'MAXIMUM PUMP', 'THE SPHINX SESSIONS'];
  $('#gal').innerHTML = CAPS.map((c, i) => `
    <div class="gframe gf-${i + 1}" data-sfx="woof">
      <img src="assets/cleopoodla.jpg" alt="${c}" loading="lazy">
      <div class="cap">${String(i + 1).padStart(2, '0')} · ${c}</div>
    </div>`).join('');
  $$('#gal .gframe').forEach(el => {
    el.addEventListener('mouseenter', () => CleoAudio.play('hover'));
    el.addEventListener('click', () => { CleoAudio.play('woof'); spawnCoins(5, el); });
  });

  /* ── 13. BIG BUY BUTTON ────────────────────── */
  $('#bigBuy').addEventListener('click', e => { e.preventDefault(); pump(); });

  /* ── 14. KONAMI: type "cleo" ───────────────── */
  let seq = '';
  addEventListener('keydown', e => {
    seq = (seq + e.key.toLowerCase()).slice(-4);
    if (seq === 'cleo') { pump(); seq = ''; }
  });

  /* ── 15. WORDMARK AUTOFIT ──────────────────
     Cinzel's swashes overhang their advance width, and the gold fill is painted
     with background-clip:text — anything past the box loses its fill and reads
     as a cut letter. Measure the real text box and shrink until it fits. */
  function fitWordmark() {
    const box = $('.hero-copy');
    if (!box) return;
    const avail = box.clientWidth;
    $$('.mega .line').forEach(el => {
      el.style.fontSize = '';
      const r = document.createRange();
      r.selectNodeContents(el);
      const w = r.getBoundingClientRect().width;
      if (w > avail) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = (size * (avail / w) * .97).toFixed(2) + 'px';
      }
    });
  }
  fitWordmark();
  addEventListener('resize', fitWordmark, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmark);

  $('#year').textContent = new Date().getFullYear();
})();
