/**
 * SPIDEY NS160 — Global Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * All tunable values live here. Edit freely without touching the site logic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CONFIG = {

  // ── FRAME PATHS ─────────────────────────────────────────────────────────────
  frames: {
    hero: {
      desktop: 'assets/frames/hero/frame_',       // + 0001.webp
      mobile:  'assets/frames/hero-mobile/frame_', // + 0001.webp
      ext: '.webp',
      pad: 4,         // zero-pad length
      count: 297,     // confirmed by convert-frames.js (clip1:99 + clip2:99 + clip3:99)
    },
    dismantle: {
      desktop: 'assets/frames/dismantle/frame_',
      mobile:  'assets/frames/dismantle-mobile/frame_',
      ext: '.webp',
      pad: 4,
      count: 99,      // confirmed by convert-frames.js (flow clip frame: 99)
    },
  },

  // ── PRELOADER ────────────────────────────────────────────────────────────────
  preloader: {
    // How many hero frames to load before revealing the page
    initialBatch: 40,
  },

  // ── SECTION HEIGHTS ──────────────────────────────────────────────────────────
  sections: {
    hero:      600,   // vh — tall wrapper for pinned hero scrub
    dismantle: 350,   // vh — tall wrapper for pinned dismantle scrub
  },

  // ── HERO CHAPTERS ────────────────────────────────────────────────────────────
  // Each chapter defines the scroll progress range [start, end] (0–1).
  // Text is fully visible between fadeIn end and fadeOut start.
  hero: {
    chapters: [
      { id: 0, range: [0.00, 0.12], fadeIn: 0.00, fadeOut: 0.12 },
      { id: 1, range: [0.22, 0.40], fadeIn: 0.22, fadeOut: 0.40 },
      { id: 2, range: [0.50, 0.68], fadeIn: 0.50, fadeOut: 0.68 },
      { id: 3, range: [0.80, 1.00], fadeIn: 0.80, fadeOut: 1.00 },
    ],
    // HUD speed counter: 0 → maxSpeed (km/h) across scroll progress
    hudSpeed:    { max: 118 },
    // HUD distance counter: 0.0 → maxDist (km) across scroll progress
    hudDistance: { max: 4.2 },
    // Canvas fades to black over last N% of progress
    fadeToBlackStart: 0.95,
  },

  // ── DISMANTLE CALLOUTS ───────────────────────────────────────────────────────
  // Callouts appear when dismantle progress > triggerProgress.
  // x/y are percentage coordinates from top-left of the canvas stage.
  dismantle: {
    calloutsAfter: 0.70,   // progress threshold before callouts appear
    callouts: [
      {
        id:    'body',
        label: 'BODY',
        text:  'Carbon composite monocoque',
        x:     38,   // % from left — tweak in config.js
        y:     32,   // % from top
        side:  'right',  // which side the line extends to
      },
      {
        id:    'battery',
        label: 'BATTERY',
        text:  '110 kWh structural pack',
        x:     50,
        y:     55,
        side:  'right',
      },
      {
        id:    'drive',
        label: 'DRIVE',
        text:  'Dual axial-flux motors, 680 kW',
        x:     72,
        y:     68,
        side:  'right',
      },
      {
        id:    'light',
        label: 'LIGHT',
        text:  'Single-line LED signature',
        x:     25,
        y:     42,
        side:  'left',
      },
    ],
  },

  // ── LINEUP ───────────────────────────────────────────────────────────────────
  lineup: {
    defaultOpen: 0,   // index of slide open by default (0 = NS160)
    hoverDebounce: 80, // ms
    slides: [
      {
        num:    '01',
        id:     'ns160',
        name:   'NS160',
        tagline:'The grand tourer.',
        body:   'Silence engineered at 640 km range. One continuous line of light.',
        specs:  { range: '640 KM', accel: '3.1 S', power: '680 KW' },
        colors: ['#2C2E33', '#EDEAE4', '#E1251B', '#CFE3FF'],
        img:    'assets/bikes/gt-e.webp',
        alt:    'NS160 GT·E — matte graphite grand tourer, side profile',
      },
      {
        num:    '02',
        id:     's',
        name:   'S',
        tagline:'No compromise.',
        body:   'Four doors. Zero hesitation. 600 km of uninterrupted momentum.',
        specs:  { range: '600 KM', accel: '3.6 S', power: '520 KW' },
        colors: ['#EDEAE4', '#07080A', '#8A8F98', '#E1251B'],
        img:    'assets/bikes/s.webp',
        alt:    'NS160 S — satin bone white sport sedan, side profile',
      },
      {
        num:    '03',
        id:     'x',
        name:   'X',
        tagline:'Higher, never heavier.',
        body:   'Coupe roofline. SUV ground clearance. 560 km of elevated silence.',
        specs:  { range: '560 KM', accel: '4.2 S', power: '480 KW' },
        colors: ['#1A2340', '#2C2E33', '#8A8F98', '#EDEAE4'],
        img:    'assets/bikes/x.webp',
        alt:    'NS160 X — midnight blue SUV coupe, side profile',
      },
      {
        num:    '04',
        id:     'r',
        name:   'R',
        tagline:'Built for the track.',
        body:   'Fixed rear wing. Satin black. 900 kW of track-tuned aggression.',
        specs:  { range: '420 KM', accel: '2.4 S', power: '900 KW' },
        colors: ['#121418', '#E1251B', '#2C2E33', '#8A8F98'],
        img:    'assets/bikes/r.webp',
        alt:    'NS160 R — satin black track coupe with rear wing, side profile',
      },
      {
        num:    '05',
        id:     'one',
        name:   'ONE',
        tagline:'The future, early.',
        body:   'Concept. Extremely low. Liquid silver. The shape of what comes next.',
        specs:  { range: 'CONCEPT', accel: '—', power: '—' },
        colors: ['#C0C0C0', '#EDEAE4', '#07080A', '#8A8F98'],
        img:    'assets/bikes/one.webp',
        alt:    'NS160 ONE — concept hyperbike in liquid silver, side profile',
      },
    ],
  },

  // ── MOBILE BREAKPOINT ────────────────────────────────────────────────────────
  mobileBreak: 768,

  // ── FILM GRAIN ───────────────────────────────────────────────────────────────
  grain: {
    tileSize:  256,       // px — offscreen canvas tile size
    opacity:   0.035,     // 3.5%
    fps:       8,         // shifts per second
  },

  // ── CURSOR (desktop only) ────────────────────────────────────────────────────
  cursor: {
    dot:     6,    // px — inner dot diameter
    ring:    28,   // px — outer ring diameter
    lerpSpeed: 0.18,
    barW:    44,   // px — hover light bar width
    barH:    2,    // px
    clickMs: 120,  // duration of click brightness flash
  },

  // ── ANIMATION EASING ─────────────────────────────────────────────────────────
  // CSS string — used in all transitions
  easing: 'cubic-bezier(0.16,1,0.3,1)',

};

// Export for use by all modules
if (typeof module !== 'undefined') module.exports = CONFIG;
