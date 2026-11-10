/**
 * SPIDEY NS160 — main.js  (v2 — smoothed & audited)
 * ─────────────────────────────────────────────────────────────────────────────
 * Vanilla JS only. No libraries. No frameworks.
 *
 *  1. Utils & helpers
 *  2. Frame loader  (batched, nearest-frame fallback)
 *  3. Canvas scroller  (hero + dismantle)
 *  4. Preloader
 *  5. Film grain
 *  6. Custom cursor
 *  7. Nav (scroll hide / show)
 *  8. Hero text chapters + HUD
 *  9. Statement word reveal
 * 10. Dismantle callouts
 * 11. Lineup accordion
 * 12. Scroll reveal (non-pinned line-inners)
 * 13. Reduced-motion handler
 * 14. Main init
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  1. UTILS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const lerp    = (a, b, t) => a + (b - a) * t;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const padNum  = (n, len = 4) => String(n).padStart(len, '0');

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile      = () => window.innerWidth < CONFIG.mobileBreak;
const isFinePointer = () => window.matchMedia('(pointer: fine)').matches;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  2. FRAME LOADER                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

class FrameLoader {
  constructor(basePath, ext, count, padLen = 4) {
    this.basePath = basePath;
    this.ext      = ext;
    this.count    = count;
    this.padLen   = padLen;
    this.frames   = new Array(count).fill(null);
    this.loaded   = new Array(count).fill(false);
    this.loadedCount = 0;
  }

  url(i) {
    return `${this.basePath}${padNum(i + 1, this.padLen)}${this.ext}`;
  }

  /**
   * Load frames start→end in parallel batches of `batchSize`.
   * Keeps browser connections manageable — avoids tab stall.
   */
  async loadRange(start, end, onProgress, batchSize = 12) {
    for (let b = start; b <= end; b += batchSize) {
      const bEnd = Math.min(b + batchSize - 1, end);
      const promises = [];
      for (let i = b; i <= bEnd; i++) {
        if (this.loaded[i]) continue;
        const idx = i;
        promises.push(new Promise(resolve => {
          const img = new Image();
          // Set src first, then decode() — avoids double-fetch in some browsers
          img.src = this.url(idx);
          img.decode()
            .then(() => {
              this.frames[idx] = img;
              this.loaded[idx] = true;
              this.loadedCount++;
              if (onProgress) onProgress(this.loadedCount, this.count);
            })
            .catch(() => {
              // Still mark loaded so we don't loop forever
              this.loaded[idx] = true;
              this.loadedCount++;
            })
            .finally(resolve);
        }));
      }
      await Promise.all(promises);
    }
  }

  /** Return the nearest already-loaded frame to index i */
  nearest(i) {
    const clamped = clamp(i, 0, this.count - 1);
    if (this.loaded[clamped] && this.frames[clamped]) return this.frames[clamped];
    for (let d = 1; d < this.count; d++) {
      const lo = clamped - d, hi = clamped + d;
      if (lo >= 0 && this.loaded[lo] && this.frames[lo])             return this.frames[lo];
      if (hi < this.count && this.loaded[hi] && this.frames[hi])     return this.frames[hi];
    }
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  3. CANVAS SCROLLER                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

class CanvasScroller {
  constructor(canvas, wrapper, loader, onProgress) {
    this.canvas      = canvas;
    this.ctx         = canvas.getContext('2d');
    this.wrapper     = wrapper;
    this.loader      = loader;
    this.onProgress  = onProgress || (() => {});

    this.currentF    = 0;
    this.targetF     = 0;
    this.lastDrawF   = -1;
    this.dpr         = Math.min(window.devicePixelRatio || 1, 2);
    this.portrait    = false;

    this._applySize();
    window.addEventListener('resize', () => this._applySize(), { passive: true });
  }

  _applySize() {
    this.dpr      = Math.min(window.devicePixelRatio || 1, 2);
    this.portrait = window.innerHeight > window.innerWidth;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const pw = Math.round(w * this.dpr);
    const ph = Math.round(h * this.dpr);

    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width  = pw;
      this.canvas.height = ph;
    }
    this.lastDrawF = -1; // force redraw on next tick
  }

  tick() {
    const rect   = this.wrapper.getBoundingClientRect();
    const travel = this.wrapper.offsetHeight - window.innerHeight;
    const raw    = travel > 0 ? -rect.top / travel : 0;
    const prog   = clamp(raw, 0, 1);

    this.targetF = Math.round(prog * (this.loader.count - 1));
    this.currentF += (this.targetF - this.currentF) * 0.15;

    const frameIdx = Math.round(this.currentF);
    if (frameIdx !== this.lastDrawF) {
      this._draw(frameIdx);
      this.lastDrawF = frameIdx;
    }

    this.onProgress(prog, frameIdx);
    return prog;
  }

  _draw(idx) {
    const img = this.loader.nearest(idx);
    if (!img) return;

    const ctx = this.ctx;
    const dpr = this.dpr;
    // Canvas pixel dimensions ÷ dpr = CSS (logical) dimensions
    const cW  = this.canvas.width  / dpr;
    const cH  = this.canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    const iW = img.naturalWidth  || 1600;
    const iH = img.naturalHeight || 900;

    if (!this.portrait) {
      // Cover-fit: fill the canvas, crop edges
      const scale = Math.max(cW / iW, cH / iH);
      const dW = iW * scale;
      const dH = iH * scale;
      ctx.drawImage(img, (cW - dW) / 2, (cH - dH) / 2, dW, dH);
    } else {
      // Contain-fit: show full frame, pad with asphalt
      const scale = Math.min(cW / iW, cH / iH);
      const dW = iW * scale;
      const dH = iH * scale;
      ctx.fillStyle = '#07080A';
      ctx.fillRect(0, 0, cW, cH);
      ctx.drawImage(img, (cW - dW) / 2, (cH - dH) / 2, dW, dH);
    }

    ctx.restore();
  }

  drawStatic(idx) {
    this._applySize();
    this._draw(idx);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  4. PRELOADER                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

class Preloader {
  constructor(heroLoader) {
    this.heroLoader = heroLoader;
    this.el      = document.getElementById('preloader');
    this.bar     = document.getElementById('preloader-bar');
    this.counter = document.getElementById('preloader-counter');
  }

  setProgress(pct) {
    const p = clamp(pct, 0, 100);
    this.bar.style.width = p + '%';
    this.counter.textContent = String(Math.floor(p)).padStart(3, '0');
  }

  async exit() {
    this.bar.classList.add('bright');
    await delay(320);
    this.bar.classList.remove('bright');
    this.el.classList.add('hidden');
    await delay(900);
    this.el.style.display = 'none';
  }

  async run(onReveal) {
    const total   = CONFIG.frames.hero.count;
    const initial = CONFIG.preloader.initialBatch;
    const loader  = this.heroLoader;

    this.setProgress(0);

    await loader.loadRange(0, initial - 1, (done) => {
      this.setProgress((done / initial) * 100);
    });

    this.setProgress(100);
    await delay(200);
    await this.exit();

    onReveal();

    // Background-load rest of hero, then dismantle
    if (initial < total) {
      loader.loadRange(initial, total - 1);
    }
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  5. FILM GRAIN                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initGrain() {
  const cfg       = CONFIG.grain;
  const tileSize  = cfg.tileSize;
  const grain     = document.getElementById('grain');
  if (!grain) return;

  // Build a static noise tile once
  const tile  = document.createElement('canvas');
  tile.width  = tileSize;
  tile.height = tileSize;
  const tCtx  = tile.getContext('2d');
  const imgD  = tCtx.createImageData(tileSize, tileSize);
  const buf   = imgD.data;
  for (let i = 0; i < buf.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    buf[i] = buf[i + 1] = buf[i + 2] = v;
    buf[i + 3] = 255;
  }
  tCtx.putImageData(imgD, 0, 0);

  // Grain canvas — CSS opacity is NOT set; we paint at cfg.opacity globalAlpha
  grain.style.opacity = '';  // clear any CSS opacity
  const ctx = grain.getContext('2d');

  let lastTs    = 0;
  let needSize  = true;
  const interval = 1000 / cfg.fps;

  function resize() {
    grain.width  = window.innerWidth;
    grain.height = window.innerHeight;
    needSize = false;
  }

  window.addEventListener('resize', () => { needSize = true; }, { passive: true });
  resize();

  function shiftGrain(ts) {
    if (needSize) resize();

    if (ts - lastTs >= interval) {
      lastTs = ts;
      const ox = (Math.random() * tileSize) | 0;
      const oy = (Math.random() * tileSize) | 0;

      ctx.clearRect(0, 0, grain.width, grain.height);
      const pat = ctx.createPattern(tile, 'repeat');
      if (pat) {
        pat.setTransform(new DOMMatrix().translate(ox, oy));
        ctx.globalAlpha = cfg.opacity;
        ctx.fillStyle   = pat;
        ctx.fillRect(0, 0, grain.width, grain.height);
        ctx.globalAlpha = 1;
      }
    }
    requestAnimationFrame(shiftGrain);
  }

  requestAnimationFrame(shiftGrain);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  6. CUSTOM CURSOR  (desktop / fine-pointer only)                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initCursor() {
  if (!isFinePointer() || reducedMotion()) return;

  const el  = document.getElementById('cursor');
  const cfg = CONFIG.cursor;

  // Canvas for the dot/ring/bar
  const size  = cfg.ring + 8;
  const half  = size / 2;
  const c     = document.createElement('canvas');
  c.width     = size * 2;   // ×2 for HiDPI
  c.height    = size * 2;
  c.style.cssText = `width:${size}px;height:${size}px;display:block;`;
  el.appendChild(c);

  const ctx = c.getContext('2d');
  const DPR = 2;
  const XENON = '#CFE3FF';

  // Label beside bar
  const label = document.createElement('span');
  label.style.cssText = `
    position:absolute;font-family:'JetBrains Mono',monospace;
    font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
    color:${XENON};pointer-events:none;white-space:nowrap;
    top:50%;left:${cfg.barW + 10}px;transform:translateY(-50%);opacity:0;
  `;
  el.appendChild(label);

  let mx = -200, my = -200, cx = -200, cy = -200;
  let mode = 'default', barLabel = '', bright = false;

  function setMode(m, lbl = '') { mode = m; barLabel = lbl; }

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    const hw = half * DPR;

    if (mode === 'bar') {
      const bw = cfg.barW * DPR;
      const bh = cfg.barH * DPR;
      ctx.fillStyle = bright ? '#ffffff' : XENON;
      ctx.fillRect(hw - bw / 2, hw - bh / 2, bw, bh);
      label.textContent = barLabel;
      label.style.opacity = '1';
    } else {
      label.style.opacity = '0';
      // Ring
      ctx.beginPath();
      ctx.arc(hw, hw, (cfg.ring / 2) * DPR, 0, Math.PI * 2);
      ctx.strokeStyle = XENON;
      ctx.lineWidth   = DPR;
      ctx.stroke();
      // Centre dot
      ctx.beginPath();
      ctx.arc(hw, hw, (cfg.dot / 2) * DPR, 0, Math.PI * 2);
      ctx.fillStyle = XENON;
      ctx.fill();
    }
  }

  function rafTick() {
    cx = lerp(cx, mx, cfg.lerpSpeed);
    cy = lerp(cy, my, cfg.lerpSpeed);
    el.style.transform = `translate(${cx - half}px,${cy - half}px)`;
    draw();
    requestAnimationFrame(rafTick);
  }

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  document.addEventListener('mouseover', e => {
    const t = e.target;
    if (t.closest('.lineup-slide[aria-expanded="false"]'))      setMode('bar', 'OPEN');
    else if (t.closest('.lineup-slide[aria-expanded="true"]'))  setMode('bar', 'CONFIGURE');
    else if (t.closest('a,button,[role="button"]')) {
      const a = t.closest('a,button,[role="button"]');
      const lbl = (a && a.dataset.cursorLabel) || 'VIEW';
      setMode('bar', lbl);
    } else setMode('default');
  });

  document.addEventListener('mousedown', () => {
    bright = true;
    setTimeout(() => { bright = false; }, cfg.clickMs);
  });

  draw();
  rafTick();
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  7. NAV                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initNav() {
  const nav  = document.getElementById('nav');
  let lastY  = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        nav.classList.toggle('hidden', y > lastY && y > 100);
        lastY   = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  8. HERO CHAPTERS + HUD                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initHeroChapters() {
  const chapters   = document.querySelectorAll('.hero-chapter');
  const hudChs     = document.querySelectorAll('.hud-chapter');
  const speedEl    = document.getElementById('hud-speed-val');
  const distEl     = document.getElementById('hud-dist-val');
  const fadeEl     = document.getElementById('hero-fade');
  const progEl     = document.getElementById('hero-progress-line');
  const cfg        = CONFIG.hero;
  let lastChIdx    = -1;

  function revealLines(chEl) {
    chEl.querySelectorAll('.line-inner').forEach((l, i) => {
      setTimeout(() => l.classList.add('revealed'), i * 80);
    });
  }
  function hideLines(chEl) {
    chEl.querySelectorAll('.line-inner').forEach(l => l.classList.remove('revealed'));
  }

  return function onHeroProgress(prog) {
    if (progEl) progEl.style.width = (prog * 100) + '%';

    cfg.chapters.forEach((ch, idx) => {
      const el  = chapters[idx];
      const hud = hudChs[idx];
      if (!el) return;

      const inRange = prog >= ch.fadeIn && prog <= ch.fadeOut;

      el.classList.toggle('active', inRange);
      if (hud) {
        hud.classList.toggle('active', inRange);
        hud.querySelector('.hud-tick').classList.toggle('active', inRange);
      }

      if (inRange && lastChIdx !== idx) {
        revealLines(el);
        lastChIdx = idx;
      }
      if (!inRange && lastChIdx === idx) {
        hideLines(el);
        lastChIdx = -1;
      }
    });

    if (speedEl) speedEl.textContent = String(Math.round(prog * cfg.hudSpeed.max)).padStart(3, '0');
    if (distEl)  distEl.textContent  = (prog * cfg.hudDistance.max).toFixed(1);

    if (fadeEl) {
      const fs = cfg.fadeToBlackStart;
      fadeEl.style.opacity = prog >= fs ? clamp((prog - fs) / (1 - fs), 0, 1) : 0;
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  9. STATEMENT WORD REVEAL                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initStatement() {
  const section = document.getElementById('statement');
  const textEl  = document.getElementById('statement-text');
  if (!section || !textEl) return;

  const words = textEl.textContent.trim().split(/\s+/);
  textEl.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
  const wordEls = Array.from(textEl.querySelectorAll('.word'));
  const total   = wordEls.length;

  // Wait until section enters viewport, then drive by scroll
  const io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    function update() {
      const rect = section.getBoundingClientRect();
      const prog = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      wordEls.forEach((el, i) => el.classList.toggle('lit', prog >= i / total));
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }, { threshold: 0.1 });
  io.observe(section);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 10. DISMANTLE CALLOUTS                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initDismantleCallouts() {
  const progEl   = document.getElementById('dismantle-progress-line');
  const callouts = CONFIG.dismantle.callouts;
  const els      = callouts.map(c => document.getElementById(`callout-${c.id}`));

  return function onDismantleProgress(prog) {
    if (progEl) progEl.style.width = (prog * 100) + '%';

    callouts.forEach((c, i) => {
      const el = els[i];
      if (!el) return;
      // Stagger each callout 0.15 apart after threshold
      const localProg = clamp((prog - CONFIG.dismantle.calloutsAfter - i * 0.08) / 0.08, 0, 1);
      el.classList.toggle('visible', localProg > 0);
    });
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 11. LINEUP ACCORDION                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initLineup() {
  const container = document.getElementById('lineup-slides');
  if (!container) return;
  const slides    = Array.from(container.querySelectorAll('.lineup-slide'));
  const cfg       = CONFIG.lineup;
  const N         = slides.length;

  // flex-grow values: open slide gets most of the space
  const OPEN_GROW   = 4.0;
  const CLOSED_GROW = 0.6;

  let openIdx    = cfg.defaultOpen;
  let hoverTimer = null;

  function applyState(idx) {
    slides.forEach((s, i) => {
      const isOpen = i === idx;
      s.setAttribute('aria-expanded', String(isOpen));
      s.setAttribute('aria-selected', String(isOpen));
      s.tabIndex = isOpen ? 0 : -1;

      if (!isMobile()) {
        s.style.flexGrow = isOpen ? OPEN_GROW : CLOSED_GROW;
      }

      if (isOpen) {
        const lines = s.querySelectorAll('.line-inner');
        lines.forEach(l => l.classList.remove('revealed'));
        requestAnimationFrame(() => {
          lines.forEach((l, li) => setTimeout(() => l.classList.add('revealed'), li * 60));
        });
      }
    });
  }

  function openSlide(idx) {
    if (idx === openIdx) return;
    openIdx = idx;
    applyState(idx);
  }

  slides.forEach((slide, i) => {
    // Hover with debounce
    slide.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => openSlide(i), cfg.hoverDebounce);
    });
    slide.addEventListener('mouseleave', () => clearTimeout(hoverTimer));

    // Click / tap
    slide.addEventListener('click', () => openSlide(i));

    // Keyboard arrows
    slide.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (i + 1) % N;
        slides[next].focus(); openSlide(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (i - 1 + N) % N;
        slides[prev].focus(); openSlide(prev);
      }
    });

    // Colour swatches
    slide.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', e => {
        e.stopPropagation();
        slide.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
      });
    });
  });

  // Set initial state
  applyState(openIdx);

  // Entrance animation on scroll-into-view
  const io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    slides.forEach((s, i) => setTimeout(() => s.classList.add('in-view'), i * 80));
    io.disconnect();
  }, { threshold: 0.1 });
  io.observe(container);

  // Mobile vs desktop sizing
  function handleResize() {
    if (isMobile()) {
      slides.forEach(s => { s.style.flexGrow = ''; });
    } else {
      slides.forEach((s, i) => { s.style.flexGrow = i === openIdx ? OPEN_GROW : CLOSED_GROW; });
    }
  }
  window.addEventListener('resize', handleResize, { passive: true });
  handleResize();
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 12. SCROLL REVEAL — non-pinned .line-inner elements                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

function initScrollReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const siblings = Array.from(
        (el.parentElement && el.parentElement.parentElement)
          ? el.parentElement.parentElement.querySelectorAll('.line-inner')
          : [el]
      );
      const idx = Math.max(siblings.indexOf(el), 0);
      setTimeout(() => el.classList.add('revealed'), idx * 80);
      io.unobserve(el);
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('.line-inner').forEach(el => {
    if (!el.closest('.pinned-wrapper')) io.observe(el);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 13. REDUCED-MOTION HANDLER                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function handleReducedMotion(heroLoader, dismantleLoader, heroCanvas, dismantleCanvas) {
  // Hero: 4 static frames at 0 / 35 / 65 / 100%
  const heroChapters = document.querySelectorAll('.hero-chapter');
  heroChapters.forEach(el => {
    el.style.opacity = '1';
    el.style.display = 'block';
    el.querySelectorAll('.line-inner').forEach(l => l.classList.add('revealed'));
  });

  const heroWrapper = document.getElementById('hero-wrapper');
  const staticFrame = Math.round(0.65 * (heroLoader.count - 1));
  heroLoader.loadRange(0, heroLoader.count - 1).then(() => {
    const s = new CanvasScroller(heroCanvas, heroWrapper, heroLoader, () => {});
    s.drawStatic(staticFrame);
  });

  const dismantleWrapper = document.getElementById('dismantle-wrapper');
  dismantleLoader.loadRange(0, dismantleLoader.count - 1).then(() => {
    const s = new CanvasScroller(dismantleCanvas, dismantleWrapper, dismantleLoader, () => {});
    s.drawStatic(0);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 14. MAIN INIT                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

(function main() {
  const heroCfg      = CONFIG.frames.hero;
  const dismantleCfg = CONFIG.frames.dismantle;
  const mobile       = isMobile();

  // Choose frame set based on viewport
  const heroLoader = new FrameLoader(
    mobile ? heroCfg.mobile     : heroCfg.desktop,
    heroCfg.ext, heroCfg.count, heroCfg.pad
  );
  const dismantleLoader = new FrameLoader(
    mobile ? dismantleCfg.mobile   : dismantleCfg.desktop,
    dismantleCfg.ext, dismantleCfg.count, dismantleCfg.pad
  );

  const heroCanvas       = document.getElementById('hero-canvas');
  const heroWrapper      = document.getElementById('hero-wrapper');
  const dismantleCanvas  = document.getElementById('dismantle-canvas');
  const dismantleWrapper = document.getElementById('dismantle-wrapper');

  // Set section heights from config
  if (heroWrapper)      heroWrapper.style.height      = CONFIG.sections.hero      + 'vh';
  if (dismantleWrapper) dismantleWrapper.style.height  = CONFIG.sections.dismantle + 'vh';

  /* ── Reduced-motion path ── */
  if (reducedMotion()) {
    document.body.style.visibility = 'visible';
    document.getElementById('preloader').style.display = 'none';
    handleReducedMotion(heroLoader, dismantleLoader, heroCanvas, dismantleCanvas);
    initNav();
    initStatement();
    initLineup();
    initScrollReveal();
    return;
  }

  /* ── Full experience ── */
  const heroScroller     = new CanvasScroller(heroCanvas,     heroWrapper,      heroLoader,     () => {});
  const dismantleScroller= new CanvasScroller(dismantleCanvas, dismantleWrapper, dismantleLoader, () => {});

  const onHeroProgress      = initHeroChapters();
  const onDismantleProgress = initDismantleCallouts();

  /* ── Single rAF loop — runs only when sections are on screen ── */
  function rafLoop() {
    if (heroWrapper) {
      const r = heroWrapper.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        onHeroProgress(heroScroller.tick());
      }
    }
    if (dismantleWrapper) {
      const r = dismantleWrapper.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        onDismantleProgress(dismantleScroller.tick());
      }
    }
    requestAnimationFrame(rafLoop);
  }

  /* ── Preloader → reveal ── */
  const preloader = new Preloader(heroLoader);
  preloader.run(() => {
    document.body.style.visibility = 'visible';
    initGrain();
    initCursor();
    initNav();
    initStatement();
    initLineup();
    initScrollReveal();
    rafLoop();

    // Background-load dismantle after hero frames queued
    dismantleLoader.loadRange(0, dismantleLoader.count - 1);
  });

})();
