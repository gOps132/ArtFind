(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const BAND_HEIGHT = 260;
  const MAX_BANDS = 45;
  const MAX_LIVE_DOODLES = 36;

  // Colorful studio palette (charcoal, cobalt pen, coral marker, sunflower crayon, sage gouache, plum ink)
  const PALETTE = [
    { color: "oklch(0.22 0.02 55 / 0.34)", weight: 3 },
    { color: "oklch(0.49 0.17 258 / 0.36)", weight: 3 },
    { color: "oklch(0.60 0.19 28 / 0.36)", weight: 2 },
    { color: "oklch(0.76 0.16 88 / 0.42)", weight: 2 },
    { color: "oklch(0.56 0.14 162 / 0.34)", weight: 2 },
    { color: "oklch(0.52 0.17 325 / 0.32)", weight: 1 }
  ];

  function pickColor() {
    const total = PALETTE.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of PALETTE) {
      r -= p.weight;
      if (r <= 0) return p.color;
    }
    return PALETTE[0].color;
  }

  // Childlike doodles + chunky paintbrush strokes
  const DOODLES = [
    // 1. Wide gouache paintbrush swoosh (thick stroke)
    () => ({
      strokeWidth: 7 + Math.random() * 6,
      paths: [
        "M -32 8 C -14 -14 8 18 30 -6",
        "M -26 14 C -8 -6 12 22 28 2"
      ]
    }),
    // 2. Childlike smiley face
    () => ({
      strokeWidth: 2.2 + Math.random() * 1.4,
      paths: [
        "M -16 -4 C -18 -18 16 -20 18 -2 C 20 16 -14 20 -16 -4 Z",
        "M -6 -6 L -6 -2",
        "M 6 -7 L 6 -3",
        "M -8 5 Q 0 13 9 4"
      ]
    }),
    // 3. Crooked 5-point star
    () => ({
      strokeWidth: 2 + Math.random() * 2,
      paths: [
        "M 0 -22 L 7 -6 L 24 -5 L 10 5 L 15 22 L 0 12 L -15 21 L -10 5 L -23 -6 L -6 -7 Z"
      ]
    }),
    // 4. Childlike sun with uneven rays
    () => ({
      strokeWidth: 2.2 + Math.random() * 1.5,
      paths: [
        "M -10 0 A 10 10 0 1 0 10 0 A 10 10 0 1 0 -10 0",
        "M 0 -15 L 1 -24",
        "M 0 15 L -1 23",
        "M -15 0 L -24 2",
        "M 15 0 L 23 -2",
        "M -11 -11 L -18 -17",
        "M 11 -11 L 17 -18",
        "M -11 11 L -17 18",
        "M 11 11 L 18 17"
      ]
    }),
    // 5. Little cat face doodle
    () => ({
      strokeWidth: 2.2 + Math.random() * 1.2,
      paths: [
        "M -16 10 L -18 -14 L -7 -5 L 7 -5 L 18 -14 L 16 10 C 12 18 -12 18 -16 10 Z",
        "M -6 2 L -6 4",
        "M 6 2 L 6 4",
        "M -3 8 Q 0 11 3 8",
        "M -22 6 L -12 7",
        "M 12 7 L 22 6"
      ]
    }),
    // 6. Paper airplane
    () => ({
      strokeWidth: 2 + Math.random() * 1.5,
      paths: [
        "M -22 4 L 22 -12 L 4 18 L -2 5 Z",
        "M 22 -12 L -2 5"
      ]
    }),
    // 7. Messy crayon scribble
    () => ({
      strokeWidth: 3.5 + Math.random() * 3,
      paths: [
        "M -24 6 C -16 -18 -10 18 -2 -14 C 6 16 12 -16 20 12 C 24 0 26 -10 28 -4"
      ]
    }),
    // 8. Childlike flower
    () => ({
      strokeWidth: 2 + Math.random() * 1.4,
      paths: [
        "M -5 -4 A 5 5 0 1 0 5 -4 A 5 5 0 1 0 -5 -4",
        "M 0 -9 C -6 -20 6 -20 0 -9",
        "M 5 -4 C 16 -10 16 2 5 -4",
        "M 0 1 C 6 12 -6 12 0 1",
        "M -5 -4 C -16 2 -16 -10 -5 -4",
        "M 0 10 L 0 24"
      ]
    }),
    // 9. Thick marker zig-zag / lightning
    () => ({
      strokeWidth: 3.2 + Math.random() * 3.5,
      paths: [
        "M -14 -20 L 6 -4 L -8 2 L 14 22"
      ]
    }),
    // 10. Ink spiral
    () => ({
      strokeWidth: 2 + Math.random() * 1.8,
      paths: [
        "M 0 0 C 5 -5 10 0 7 7 C 3 14 -9 12 -12 2 C -15 -10 -2 -20 11 -16 C 24 -12 27 8 18 20"
      ]
    }),
    // 11. Paintbrush double-stroke arc
    () => ({
      strokeWidth: 5.5 + Math.random() * 5,
      paths: [
        "M -26 12 Q 0 -18 26 8"
      ]
    }),
    // 12. Little house doodle
    () => ({
      strokeWidth: 2 + Math.random() * 1.4,
      paths: [
        "M -16 0 L 0 -16 L 16 0",
        "M -12 -2 L -12 16 L 12 16 L 12 -2",
        "M -4 16 L -4 6 L 4 6 L 4 16"
      ]
    }),
    // 13. Musical eighth notes
    () => ({
      strokeWidth: 2.4 + Math.random() * 1.4,
      paths: [
        "M -10 12 L -10 -12 L 10 -16 L 10 8",
        "M -16 12 A 5 4 0 1 0 -8 12 A 5 4 0 1 0 -16 12",
        "M 4 8 A 5 4 0 1 0 12 8 A 5 4 0 1 0 4 8"
      ]
    }),
    // 14. Heart + sparkle
    () => ({
      strokeWidth: 2.4 + Math.random() * 2,
      paths: [
        "M 0 16 C -16 4 -22 -10 -11 -16 C -4 -19 0 -12 0 -8 C 0 -12 4 -19 11 -16 C 22 -10 16 4 0 16 Z"
      ]
    }),
    // 15. Dashed loopy arrow
    () => ({
      strokeWidth: 2.2 + Math.random() * 1.4,
      dashed: true,
      paths: [
        "M -22 12 C -10 -14 8 14 20 -8",
        "M 12 -12 L 21 -9 L 17 1"
      ]
    })
  ];

  // Cute die-cut stickers (vector SVG with cream die-cut outline)
  const STICKERS = [
    // 1. Cat paw sticker
    () => `
      <g class="sticker-diecut">
        <ellipse cx="0" cy="8" rx="13" ry="10" fill="oklch(0.76 0.14 15)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <circle cx="-12" cy="-6" r="4.5" fill="oklch(0.76 0.14 15)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <circle cx="-4" cy="-12" r="4.5" fill="oklch(0.76 0.14 15)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <circle cx="5" cy="-12" r="4.5" fill="oklch(0.76 0.14 15)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <circle cx="12" cy="-5" r="4.5" fill="oklch(0.76 0.14 15)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
      </g>`,
    // 2. Sunflower star sticker
    () => `
      <g class="sticker-diecut">
        <path d="M 0 -22 L 6 -7 L 22 -6 L 9 4 L 14 20 L 0 11 L -14 20 L -9 4 L -22 -6 L -6 -7 Z"
              fill="oklch(0.86 0.16 90)" stroke="oklch(0.2 0.018 55)" stroke-width="2.2" stroke-linejoin="round" />
        <circle cx="-4" cy="-2" r="1.6" fill="oklch(0.2 0.018 55)" />
        <circle cx="4" cy="-2" r="1.6" fill="oklch(0.2 0.018 55)" />
        <path d="M -3 3 Q 0 6 3 3" fill="none" stroke="oklch(0.2 0.018 55)" stroke-width="1.6" stroke-linecap="round" />
      </g>`,
    // 3. Cute bear face sticker
    () => `
      <g class="sticker-diecut">
        <circle cx="-13" cy="-12" r="6" fill="oklch(0.78 0.08 65)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <circle cx="13" cy="-12" r="6" fill="oklch(0.78 0.08 65)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <ellipse cx="0" cy="2" rx="17" ry="15" fill="oklch(0.82 0.07 65)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <ellipse cx="0" cy="5" rx="6" ry="4.5" fill="oklch(0.95 0.02 85)" />
        <circle cx="-6" cy="-1" r="1.8" fill="oklch(0.2 0.018 55)" />
        <circle cx="6" cy="-1" r="1.8" fill="oklch(0.2 0.018 55)" />
        <circle cx="0" cy="4" r="2" fill="oklch(0.2 0.018 55)" />
      </g>`,
    // 4. Paint tube sticker
    () => `
      <g class="sticker-diecut">
        <rect x="-9" y="-14" width="18" height="26" rx="3" fill="oklch(0.62 0.16 255)" stroke="oklch(0.2 0.018 55)" stroke-width="2" />
        <rect x="-5" y="12" width="10" height="6" rx="1" fill="oklch(0.92 0.02 85)" stroke="oklch(0.2 0.018 55)" stroke-width="1.8" />
        <rect x="-11" y="-18" width="22" height="5" rx="1" fill="oklch(0.86 0.16 90)" stroke="oklch(0.2 0.018 55)" stroke-width="1.8" />
        <line x1="-5" y1="-2" x2="5" y2="-2" stroke="oklch(0.98 0.01 85)" stroke-width="2.5" stroke-linecap="round" />
      </g>`,
    // 5. Washi tape strip
    () => `
      <g opacity="0.72">
        <path d="M -32 -9 L 30 -10 L 28 10 L -34 9 Z" fill="oklch(0.75 0.12 162 / 0.65)" stroke="oklch(0.2 0.018 55 / 0.35)" stroke-width="1.2" />
        <circle cx="-18" cy="0" r="2.2" fill="oklch(0.98 0.01 85 / 0.8)" />
        <circle cx="-4" cy="-2" r="2.2" fill="oklch(0.98 0.01 85 / 0.8)" />
        <circle cx="10" cy="2" r="2.2" fill="oklch(0.98 0.01 85 / 0.8)" />
        <circle cx="22" cy="-1" r="2.2" fill="oklch(0.98 0.01 85 / 0.8)" />
      </g>`
  ];

  // Cute ink stamps
  const STAMPS = [
    () => ({
      color: "oklch(0.55 0.18 28 / 0.45)",
      svg: `
        <rect x="-44" y="-14" width="88" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="5 2" />
        <text x="0" y="4" text-anchor="middle" class="stamp-text">HAND-DRAWN</text>`
    }),
    () => ({
      color: "oklch(0.49 0.17 258 / 0.45)",
      svg: `
        <circle cx="0" cy="0" r="26" fill="none" stroke="currentColor" stroke-width="2" />
        <circle cx="0" cy="0" r="21" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" />
        <text x="0" y="-2" text-anchor="middle" class="stamp-text-sm">OPEN</text>
        <text x="0" y="9" text-anchor="middle" class="stamp-text-sm">ARTIST ★</text>`
    }),
    () => ({
      color: "oklch(0.48 0.14 162 / 0.48)",
      svg: `
        <rect x="-38" y="-13" width="76" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2" />
        <text x="0" y="4" text-anchor="middle" class="stamp-text">SKETCH ✓</text>`
    }),
    () => ({
      color: "oklch(0.22 0.02 55 / 0.4)",
      svg: `
        <path d="M -38 -10 Q -26 -16 -14 -10 T 10 -10 T 34 -10" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path d="M -38 0 Q -26 -6 -14 0 T 10 0 T 34 0" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path d="M -38 10 Q -26 4 -14 10 T 10 10 T 34 10" fill="none" stroke="currentColor" stroke-width="1.6" />`
    })
  ];

  function createLayer() {
    let svg = document.getElementById("sketchbook-doodles");
    if (svg) return svg;

    svg = document.createElementNS(SVG_NS, "svg");
    svg.id = "sketchbook-doodles";
    svg.setAttribute("class", "sketchbook-doodles");
    svg.setAttribute("aria-hidden", "true");
    document.body.prepend(svg);
    return svg;
  }

  let generatedBands = 0;
  let liveCount = 0;
  let rafPending = false;
  // Spatial record of placed points { x, y, r } for blue-noise / Poisson-like spacing
  const placedPoints = [];
  const placedGiants = [];

  function pickX(vw, index) {
    if (vw > 1120 && index % 4 !== 3) {
      const marginWidth = Math.max(70, (vw - 1240) / 2 + 65);
      return index % 2 === 0
        ? 28 + Math.random() * marginWidth
        : vw - 28 - Math.random() * marginWidth;
    }
    return 32 + Math.random() * Math.max(120, vw - 64);
  }

  function nearestDistSq(x, y, points) {
    let minSq = Infinity;
    // Only check points within a vertical window for speed
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      const dy = y - p.y;
      if (Math.abs(dy) > 420) continue;
      const dx = x - p.x;
      const dSq = dx * dx + dy * dy;
      if (dSq < minSq) minSq = dSq;
    }
    return minSq;
  }

  // Mitchell's Best-Candidate sampling: organic Voronoi-like blue-noise distribution
  // that prevents clumping while keeping natural variation in spacing.
  function pickBlueNoisePoint(vw, yMin, yMax, minDist, indexSeed, candidates = 14) {
    let bestX = pickX(vw, indexSeed);
    let bestY = yMin + Math.random() * (yMax - yMin);
    let bestScore = -1;
    const minDistSq = minDist * minDist;

    for (let c = 0; c < candidates; c++) {
      const cx = pickX(vw, indexSeed + c);
      const cy = yMin + Math.random() * (yMax - yMin);
      const dSq = nearestDistSq(cx, cy, placedPoints);

      // Accept immediately if comfortably spaced, with slight jitter so spacing stays organic
      if (dSq >= minDistSq * (0.9 + Math.random() * 0.4)) {
        return { x: cx, y: cy };
      }

      if (dSq > bestScore) {
        bestScore = dSq;
        bestX = cx;
        bestY = cy;
      }
    }

    return { x: bestX, y: bestY };
  }

  function spawnDoodle(svg, x, y, isLive, isGiant = false) {
    const spec = DOODLES[Math.floor(Math.random() * DOODLES.length)]();
    const rot = (Math.random() * 54 - 27).toFixed(1);
    const scale = isGiant
      ? (4.8 + Math.random() * 2.4).toFixed(2)
      : (0.62 + Math.random() * 1.05).toFixed(2);
    const color = pickColor();

    const g = document.createElementNS(SVG_NS, "g");
    const shiftDur = (480 + Math.random() * 260).toFixed(0);
    const shiftDelay = (-Math.random() * 600).toFixed(0);
    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${scale})`);
    g.setAttribute(
      "class",
      [
        "doodle-group",
        isLive ? "doodle-live" : "",
        isGiant ? "doodle-giant" : ""
      ].filter(Boolean).join(" ")
    );
    g.style.color = color;

    const inner = document.createElementNS(SVG_NS, "g");
    inner.setAttribute("class", "doodle-shift");
    inner.style.animationDuration = `${shiftDur}ms`;
    inner.style.animationDelay = `${shiftDelay}ms`;

    for (const d of spec.paths) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", spec.dashed ? "doodle-stroke doodle-dashed" : "doodle-stroke");
      path.style.strokeWidth = isGiant
        ? `${Math.max(1.4, spec.strokeWidth * 0.55).toFixed(1)}px`
        : `${spec.strokeWidth.toFixed(1)}px`;
      if (isLive) {
        path.style.animationDuration = `${(700 + Math.random() * 600).toFixed(0)}ms`;
      }
      inner.appendChild(path);
    }

    g.appendChild(inner);
    svg.appendChild(g);
  }

  function spawnStickerOrStamp(svg, x, y, isSticker) {
    const rot = (Math.random() * 44 - 22).toFixed(1);
    const scale = (0.75 + Math.random() * 0.55).toFixed(2);
    const g = document.createElementNS(SVG_NS, "g");
    const shiftDur = (520 + Math.random() * 240).toFixed(0);
    const shiftDelay = (-Math.random() * 600).toFixed(0);

    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${scale})`);
    g.setAttribute("class", isSticker ? "doodle-group doodle-sticker" : "doodle-group doodle-stamp");

    const inner = document.createElementNS(SVG_NS, "g");
    inner.setAttribute("class", "doodle-shift");
    inner.style.animationDuration = `${shiftDur}ms`;
    inner.style.animationDelay = `${shiftDelay}ms`;

    if (isSticker) {
      inner.innerHTML = STICKERS[Math.floor(Math.random() * STICKERS.length)]();
    } else {
      const stamp = STAMPS[Math.floor(Math.random() * STAMPS.length)]();
      g.style.color = stamp.color;
      inner.innerHTML = stamp.svg;
    }

    g.appendChild(inner);
    svg.appendChild(g);
  }

  function appendBand(svg, bandIndex) {
    const vw = document.documentElement.clientWidth || window.innerWidth || 1200;
    const count = vw < 640 ? 4 : 7;
    const yMin = bandIndex * BAND_HEIGHT + 34;
    const yMax = yMin + BAND_HEIGHT - 56;
    const minDist = vw < 640 ? 92 : 108;

    for (let i = 0; i < count; i++) {
      const { x, y } = pickBlueNoisePoint(vw, yMin, yMax, minDist, i + bandIndex);
      placedPoints.push({ x, y });

      const roll = Math.random();
      if (roll < 0.16) {
        spawnStickerOrStamp(svg, x, y, true);
      } else if (roll < 0.28) {
        spawnStickerOrStamp(svg, x, y, false);
      } else {
        spawnDoodle(svg, x, y, false, false);
      }
    }

    // Occasionally spawn one oversized half-page doodle (every ~5 scroll bands)
    if (bandIndex % 5 === 2) {
      const gx = vw * (0.22 + Math.random() * 0.56);
      const gy = yMin + BAND_HEIGHT * 0.45;
      const giantTooClose = placedGiants.some((p) => Math.hypot(gx - p.x, gy - p.y) < 360);
      if (!giantTooClose) {
        placedGiants.push({ x: gx, y: gy });
        spawnDoodle(svg, gx, gy, false, true);
      }
    }
  }

  function syncDoodles() {
    rafPending = false;
    const svg = createLayer();
    const shell = document.querySelector(".shell");
    const docHeight = shell
      ? Math.max(shell.scrollHeight, window.innerHeight)
      : document.documentElement.scrollHeight;

    svg.style.height = `${docHeight}px`;

    const targetBands = Math.min(MAX_BANDS, Math.ceil(docHeight / BAND_HEIGHT));
    while (generatedBands < targetBands) {
      appendBand(svg, generatedBands);
      generatedBands++;
    }
  }

  function spawnLiveDoodle() {
    if (document.hidden) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const svg = createLayer();
    const vw = document.documentElement.clientWidth || window.innerWidth || 1200;
    const vh = window.innerHeight || 800;
    const scrollY = window.scrollY || 0;
    const maxH = parseFloat(svg.style.height || String(vh));

    const yMin = scrollY + 70;
    const yMax = Math.min(maxH - 40, scrollY + Math.max(250, vh - 60));
    const { x, y } = pickBlueNoisePoint(vw, yMin, Math.max(yMin + 40, yMax), 96, liveCount, 10);
    placedPoints.push({ x, y });

    spawnDoodle(svg, x, y, true);
    liveCount++;

    if (liveCount > MAX_LIVE_DOODLES) {
      const oldest = svg.querySelector(".doodle-live");
      if (oldest) oldest.remove();
    }
  }

  function syncHeaderSpacer() {
    const bar = document.querySelector(".bar");
    const shell = document.querySelector(".shell");
    if (!bar || !shell) return;

    // Measure unfolded header height at rest so fixed .bar never changes scrollHeight
    const y = window.scrollY || 0;
    if (y < 4) {
      const h = bar.getBoundingClientRect().height;
      if (h > 80) {
        shell.style.setProperty("--bar-open-h", `${Math.ceil(h + 18)}px`);
      }
    }
  }

  function syncHeaderState() {
    const bar = document.querySelector(".bar");
    if (!bar) return;

    syncHeaderSpacer();

    const y = window.scrollY || 0;
    const hasTagBrowser = Boolean(bar.querySelector(".tag-browser-wrap"));

    let foldHero = 0;
    let foldTags = 0;
    if (hasTagBrowser) {
      // Bottom-to-up fold: Hero (bottom) folds first (0..90px), Tag Search folds second (90..175px)
      foldHero = Math.min(1, Math.max(0, y / 90));
      foldTags = Math.min(1, Math.max(0, (y - 90) / 85));
    } else {
      foldHero = Math.min(1, Math.max(0, y / 110));
    }

    bar.style.setProperty("--fold-hero", foldHero.toFixed(3));
    bar.style.setProperty("--fold-tags", foldTags.toFixed(3));
    bar.style.setProperty("--fold", (hasTagBrowser ? foldTags : foldHero).toFixed(3));

    const fullyFolded = hasTagBrowser ? foldTags >= 0.98 : foldHero >= 0.98;
    bar.classList.toggle("is-hero-folded", foldHero >= 0.98);
    bar.classList.toggle("is-compact", fullyFolded);
  }

  let footerStrokeCache = null;
  let footerAnimRaf = null;
  let footerAnimStart = 0;
  let footerAtBottom = false;
  let footerTimeline = null;
  let lastScenarioKey = null;
  let lastStyleKey = null;

  const SKETCH_E_PATH = "M 31.582031 115.429688 Q 43.613281 115.429688 67.812500 104.492188 Q 69.316406 104.492188 70.273438 105.517578 Q 71.230469 106.542969 71.230469 107.910156 Q 65.761719 117.207031 50.312500 122.402344 Q 34.863281 127.597656 21.464844 124.179688 Q 6.289062 120.214844 3.007812 107.089844 Q 2.734375 104.492188 2.734375 100.117188 Q 2.734375 95.742188 4.990234 88.564453 Q 7.246094 81.386719 12.714844 74.960938 Q 18.183594 68.535156 25.566406 64.843750 Q 32.949219 61.152344 41.289062 61.152344 Q 49.218750 61.152344 59.062500 66.621094 Q 63.710938 69.218750 66.445312 72.500000 Q 69.179688 75.781250 69.1796875 79.199219 Q 69.179688 80.156250 69.042969 81.113281 Q 68.769531 89.453125 60.976562 91.640625 Q 57.558594 92.597656 53.046875 92.597656 L 33.359375 91.777344 Q 23.515625 91.777344 18.320312 96.015625 Q 15.312500 98.339844 14.082031 102.988281 Q 17.500000 115.429688 31.582031 115.429688 Z M 28.300781 73.730469 Q 18.867188 78.105469 18.867188 82.890625 Q 29.804688 83.847656 35.273438 83.847656 Q 50.449219 83.847656 55.781250 81.250000 Q 59.062500 79.882812 59.062500 77.832031 Q 59.062500 75.371094 55.986328 73.183594 Q 52.910156 70.996094 49.628906 70.039062 Q 46.347656 69.082031 44.160156 69.082031 Q 41.972656 69.082031 37.050781 70.517578 Q 32.128906 71.953125 28.300781 73.730469 Z";
  const SKETCH_ADVS = [89.6875, 77.2461, 56.6016, 96.9336, 21.1914, 70.0, 71.7773];
  const STAR_PATH = "M 492 18 L 496 29 L 507 30 L 498 37 L 501 48 L 492 41 L 483 48 L 486 37 L 477 30 L 488 29 Z";
  const SWOOSH_PATH = "M 10 138 Q 160 128 310 137 T 482 132";

  const FOOTER_STYLES = [
    { key: "fountain-sketch", font: "sketch", tool: "fountain", color: "oklch(0.2 0.018 55 / 0.36)", maxFill: 1.0, speed: 1.0 },
    { key: "fountain-cursive", font: "cursive", tool: "fountain", color: "oklch(0.32 0.12 268 / 0.42)", maxFill: 1.0, speed: 0.9 },
    { key: "crayon-coral", font: "marker", tool: "crayon", color: "oklch(0.56 0.18 28 / 0.48)", maxFill: 0.88, speed: 0.85 },
    { key: "crayon-cobalt", font: "cursive", tool: "crayon", color: "oklch(0.46 0.16 258 / 0.46)", maxFill: 0.88, speed: 0.9 },
    { key: "brush-sage", font: "cursive", tool: "brush", color: "oklch(0.45 0.12 162 / 0.45)", maxFill: 0.92, speed: 0.92 },
    { key: "pencil-sketch", font: "sketch", tool: "pencil", color: "oklch(0.28 0.012 60 / 0.38)", maxFill: 0.48, speed: 1.05 }
  ];

  function easeInOutSine(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function createStrokeItem(path, dx = 0) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len.toFixed(2)}`;
    const p0 = path.getPointAtLength(0);
    const p1 = path.getPointAtLength(len);
    return {
      path,
      len,
      dx,
      startPt: { x: p0.x + dx, y: p0.y },
      endPt: { x: p1.x + dx, y: p1.y }
    };
  }

  function appendExtraPath(group, d, dx = 0) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("class", "write-stroke");
    p.setAttribute("d", d);
    if (dx !== 0) p.setAttribute("transform", `translate(${dx} 0)`);
    group.appendChild(p);
    return createStrokeItem(p, dx);
  }

  function initFooterWriting() {
    const svg = document.querySelector(".footer-write-svg");
    if (!svg) return null;

    if (!footerStrokeCache || !footerStrokeCache.svg.isConnected) {
      const mainPaths = Array.from(svg.querySelectorAll(".footer-write-paths .write-stroke"));
      const typoGroup = svg.querySelector(".footer-typo-paths");
      const flourishGroup = svg.querySelector(".footer-flourish-paths");
      const nib = svg.querySelector(".footer-pen-nib");
      const eraser = svg.querySelector(".footer-eraser");
      if (mainPaths.length < 7 || !typoGroup || !flourishGroup || !nib || !eraser) return null;

      const sketchPaths = mainPaths.map((p) => p.getAttribute("d"));
      const mainItems = mainPaths.map((p) => createStrokeItem(p, 0));
      footerStrokeCache = {
        svg,
        mainPaths,
        sketchPaths,
        mainItems,
        typoGroup,
        flourishGroup,
        nib,
        eraser,
        maxFill: 1.0
      };
    }

    return footerStrokeCache;
  }

  function applyFooterStyle(cache, style) {
    const extraFonts = window.ARTFIND_FOOTER_FONTS || {};
    const usePreset = style.font !== "sketch" && extraFonts[style.font];
    const paths = usePreset ? usePreset.paths : cache.sketchPaths;
    const advs = usePreset ? usePreset.advs : SKETCH_ADVS;
    const ePath = usePreset ? usePreset.ePath : SKETCH_E_PATH;
    const eX = usePreset
      ? usePreset.startX + advs[0] + advs[1] + advs[2] + advs[3] + advs[4] + advs[5]
      : 411.6602;
    const eAdv = usePreset ? usePreset.eAdv : 75.7422;

    for (let idx = 0; idx < 7; idx++) {
      cache.mainPaths[idx].setAttribute("d", paths[idx]);
    }
    cache.mainItems = cache.mainPaths.map((p) => createStrokeItem(p, 0));
    cache.maxFill = style.maxFill;

    cache.svg.classList.remove("is-fountain", "is-crayon", "is-brush", "is-pencil");
    cache.svg.classList.add(`is-${style.tool}`);
    cache.svg.style.color = style.color;

    for (const tName of ["fountain", "crayon", "brush", "pencil"]) {
      const g = cache.nib.querySelector(`.tool-${tName}`);
      if (g) g.setAttribute("opacity", tName === style.tool ? "1" : "0");
    }

    return { advs, ePath, eX, eAdv };
  }

  let sharedAudioCtx = null;

  function unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
      if (sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume().catch(() => {});
      }
    } catch {
      // Ignore audio errors when blocked
    }
  }

  function playPaperRipSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
      if (sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume().catch(() => {});
      }
      const ctx = sharedAudioCtx;
      if (ctx.state !== "running") return;

      const duration = 0.62;
      const sampleRate = ctx.sampleRate;
      const length = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      // Synthesize crisp paper fiber-snap bursts modulated over a tear envelope
      let env = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        if (i % 160 === 0) {
          env = 0.35 + Math.random() * 0.65;
        } else {
          env *= 0.992;
        }
        const tearCurve = Math.sin(Math.min(1, t * 1.15) * Math.PI) * (0.65 + 0.55 * t);
        data[i] = (Math.random() * 2 - 1) * env * tearCurve;
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(1750, ctx.currentTime);
      bandpass.frequency.exponentialRampToValueAtTime(3400, ctx.currentTime + duration);
      bandpass.Q.value = 1.05;

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 850;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      src.connect(bandpass);
      bandpass.connect(highpass);
      highpass.connect(gain);
      gain.connect(ctx.destination);

      src.start();
    } catch {
      // Ignore audio errors
    }
  }

  function resetFooterPaths(cache) {
    const footer = cache.svg.closest(".footer");
    const sheet = cache.svg.closest(".footer-sheet");
    if (footer) footer.classList.remove("is-ripping");
    if (sheet) {
      sheet.style.transform = "";
      sheet.style.opacity = "";
      sheet.style.clipPath = "";
      sheet.style.filter = "";
    }
    for (const it of cache.mainItems) {
      it.path.style.strokeDashoffset = `${it.len.toFixed(2)}`;
      it.path.style.fillOpacity = "0";
      it.path.style.opacity = "1";
    }
    cache.typoGroup.replaceChildren();
    cache.flourishGroup.replaceChildren();
    cache.nib.style.opacity = "1";
    cache.eraser.style.opacity = "0";
    const start = cache.mainItems[0].startPt;
    cache.nib.setAttribute("transform", `translate(${(start.x - 12).toFixed(1)} ${(start.y - 52).toFixed(1)})`);
  }

  function buildFooterScenario(cache) {
    const extraFonts = window.ARTFIND_FOOTER_FONTS || {};
    const availableStyles = FOOTER_STYLES.filter(
      (s) => s.font === "sketch" || Boolean(extraFonts[s.font])
    );
    const stylePool = availableStyles.filter((s) => s.key !== lastStyleKey);
    const style = stylePool[Math.floor(Math.random() * stylePool.length)] || availableStyles[0];
    lastStyleKey = style.key;

    const metrics = applyFooterStyle(cache, style);
    resetFooterPaths(cache);
    const [A, r, t, F, i, n, d] = cache.mainItems;
    const { advs, ePath, eX, eAdv } = metrics;

    const scenarios = ["artFnd", "artFined", "atrFind", "flourish"];
    const pool = scenarios.filter((k) => k !== lastScenarioKey);
    const key = pool[Math.floor(Math.random() * pool.length)];
    lastScenarioKey = key;

    const steps = [];
    let cursor = 0;
    let lastPt = A.startPt;

    function pushMove(toPt) {
      const dist = Math.hypot(toPt.x - lastPt.x, toPt.y - lastPt.y);
      if (dist < 2) return;
      const dur = 75;
      steps.push({ kind: "move", from: lastPt, to: toPt, startMs: cursor, endMs: cursor + dur });
      cursor += dur;
      lastPt = toPt;
    }

    function pushDraw(item, speed = 1) {
      pushMove(item.startPt);
      const dur = Math.max(140, Math.round(item.len * 1.05 * speed * style.speed));
      steps.push({ kind: "draw", item, startMs: cursor, endMs: cursor + dur });
      cursor += dur;
      lastPt = item.endPt;
    }

    function pushPause(ms) {
      steps.push({ kind: "pause", at: lastPt, startMs: cursor, endMs: cursor + ms });
      cursor += ms;
    }

    function pushErase(targets, ms) {
      const reversed = [...targets].reverse();
      steps.push({ kind: "erase", targets: reversed, startMs: cursor, endMs: cursor + ms });
      cursor += ms;
      lastPt = targets[0].startPt;
    }

    function pushRip(ms) {
      steps.push({ kind: "rip", startMs: cursor, endMs: cursor + ms });
      cursor += ms;
      lastPt = A.startPt;
    }

    const canErase = style.tool === "crayon" || style.tool === "pencil";

    if (key === "artFnd") {
      const nTypo = appendExtraPath(cache.typoGroup, n.path.getAttribute("d"), -advs[4]);
      const dTypo = appendExtraPath(cache.typoGroup, d.path.getAttribute("d"), -advs[4]);
      [A, r, t, F, nTypo, dTypo].forEach((it) => pushDraw(it));
      pushPause(380);
      if (canErase) {
        pushErase([nTypo, dTypo], 700);
        [i, n, d].forEach((it) => pushDraw(it, 0.92));
      } else {
        pushRip(720);
        pushPause(140);
        [A, r, t, F, i, n, d].forEach((it) => pushDraw(it, 0.9));
      }
    } else if (key === "artFined") {
      const eTypo = appendExtraPath(cache.typoGroup, ePath, eX);
      const dTypo = appendExtraPath(cache.typoGroup, d.path.getAttribute("d"), eAdv);
      [A, r, t, F, i, n, eTypo, dTypo].forEach((it) => pushDraw(it));
      pushPause(380);
      if (canErase) {
        pushErase([eTypo, dTypo], 720);
        pushDraw(d, 0.92);
      } else {
        pushRip(720);
        pushPause(140);
        [A, r, t, F, i, n, d].forEach((it) => pushDraw(it, 0.9));
      }
    } else if (key === "atrFind") {
      const tTypo = appendExtraPath(cache.typoGroup, t.path.getAttribute("d"), -advs[1]);
      const rTypo = appendExtraPath(cache.typoGroup, r.path.getAttribute("d"), advs[2]);
      [A, tTypo, rTypo].forEach((it) => pushDraw(it));
      pushPause(340);
      if (canErase) {
        pushErase([tTypo, rTypo], 640);
        [r, t, F, i, n, d].forEach((it) => pushDraw(it, 0.95));
      } else {
        pushRip(720);
        pushPause(140);
        [A, r, t, F, i, n, d].forEach((it) => pushDraw(it, 0.9));
      }
    } else {
      const star = appendExtraPath(cache.flourishGroup, STAR_PATH, 0);
      const swoosh = appendExtraPath(cache.flourishGroup, SWOOSH_PATH, 0);
      [A, r, t, F, i, n, d].forEach((it) => pushDraw(it));
      pushPause(220);
      pushDraw(star, 0.85);
      pushDraw(swoosh, 0.45);
    }

    return { steps, totalMs: cursor };
  }

  function renderFooterTimeline(cache, timeline, elapsedMs) {
    const footer = cache.svg.closest(".footer");
    const sheet = cache.svg.closest(".footer-sheet");
    let tipPoint = cache.mainItems[0].startPt;
    let usingEraser = false;
    let isRipping = false;
    let eraserPoint = tipPoint;
    const maxFill = cache.maxFill ?? 1.0;

    let startIdx = 0;
    for (let s = 0; s < timeline.steps.length; s++) {
      if (timeline.steps[s].kind === "rip" && elapsedMs >= timeline.steps[s].endMs) {
        startIdx = s + 1;
      }
    }

    if (startIdx > 0) {
      for (const it of cache.mainItems) {
        it.path.style.strokeDashoffset = `${it.len.toFixed(2)}`;
        it.path.style.fillOpacity = "0";
      }
      for (const p of cache.typoGroup.children) {
        p.style.opacity = "0";
      }
    }

    for (let s = startIdx; s < timeline.steps.length; s++) {
      const step = timeline.steps[s];
      if (elapsedMs < step.startMs) break;

      if (step.kind === "draw") {
        if (elapsedMs >= step.endMs) {
          step.item.path.style.strokeDashoffset = "0";
          step.item.path.style.fillOpacity = maxFill.toFixed(2);
          tipPoint = step.item.endPt;
        } else {
          const localT = (elapsedMs - step.startMs) / (step.endMs - step.startMs);
          const eased = easeInOutCubic(localT);
          const drawn = eased * step.item.len;
          step.item.path.style.strokeDashoffset = `${(step.item.len - drawn).toFixed(2)}`;
          const fillT = Math.min(1, Math.max(0, (localT - 0.65) / 0.35)) * maxFill;
          step.item.path.style.fillOpacity = fillT.toFixed(2);
          const pt = step.item.path.getPointAtLength(drawn);
          tipPoint = { x: pt.x + step.item.dx, y: pt.y };
        }
      } else if (step.kind === "move") {
        if (elapsedMs < step.endMs) {
          const localT = (elapsedMs - step.startMs) / (step.endMs - step.startMs);
          const eased = easeInOutSine(localT);
          tipPoint = {
            x: step.from.x + (step.to.x - step.from.x) * eased,
            y: step.from.y + (step.to.y - step.from.y) * eased - Math.sin(Math.PI * localT) * 6
          };
        } else {
          tipPoint = step.to;
        }
      } else if (step.kind === "pause") {
        if (elapsedMs < step.endMs) {
          const localT = (elapsedMs - step.startMs) / (step.endMs - step.startMs);
          tipPoint = {
            x: step.at.x + Math.sin(localT * Math.PI * 2) * 1.5,
            y: step.at.y - 4
          };
        } else {
          tipPoint = step.at;
        }
      } else if (step.kind === "erase") {
        if (elapsedMs >= step.endMs) {
          for (const tgt of step.targets) {
            tgt.path.style.strokeDashoffset = `${tgt.len.toFixed(2)}`;
            tgt.path.style.fillOpacity = "0";
            tgt.path.style.opacity = "0";
          }
          tipPoint = step.targets[step.targets.length - 1].startPt;
        } else {
          usingEraser = true;
          const localT = (elapsedMs - step.startMs) / (step.endMs - step.startMs);
          const count = step.targets.length;
          const seg = Math.min(count - 1, Math.floor(localT * count));
          const segT = localT * count - seg;

          for (let idx = 0; idx < count; idx++) {
            const tgt = step.targets[idx];
            if (idx < seg) {
              tgt.path.style.strokeDashoffset = `${tgt.len.toFixed(2)}`;
              tgt.path.style.fillOpacity = "0";
              tgt.path.style.opacity = "0";
            } else if (idx === seg) {
              const remain = (1 - easeInOutSine(segT)) * tgt.len;
              tgt.path.style.strokeDashoffset = `${(tgt.len - remain).toFixed(2)}`;
              tgt.path.style.fillOpacity = (Math.max(0, 1 - segT * 2.5) * maxFill).toFixed(2);
              const pt = tgt.path.getPointAtLength(remain);
              const scrubX = Math.sin(localT * Math.PI * 10) * 12;
              const scrubY = Math.cos(localT * Math.PI * 10) * 4;
              eraserPoint = { x: pt.x + tgt.dx + scrubX, y: pt.y + scrubY };
            }
          }
        }
      } else if (step.kind === "rip") {
        if (elapsedMs < step.endMs) {
          isRipping = true;
          if (!step.soundPlayed) {
            step.soundPlayed = true;
            playPaperRipSound();
          }
          const localT = (elapsedMs - step.startMs) / (step.endMs - step.startMs);
          if (footer) footer.classList.add("is-ripping");
          if (sheet) {
            // Phase 1 (0..0.40): curved tear sweeps across; Phase 2 (0.40..1): curls outward & rips off-screen (no fade)
            const tearFrac = Math.min(1, localT / 0.40);
            const peelT = Math.max(0, (localT - 0.28) / 0.72);
            const peelEase = peelT * peelT * (1.2 - 0.2 * peelT);

            if (tearFrac < 0.995) {
              const pts = [];
              const steps = 16;
              for (let k = 0; k <= steps; k++) {
                const u = k / steps;
                const xPct = (u * 100).toFixed(1);
                const tornProgress = Math.max(0, Math.min(1, (tearFrac * 1.15 - u) / 0.25));
                const arc = Math.sin(u * Math.PI) * 18 * tornProgress;
                const tooth = ((k % 2 === 0 ? 1.8 : -1.4) + Math.sin(k * 2.7) * 1.2) * tornProgress;
                const yPct = Math.max(0, Math.min(35, arc + tooth + (1 - u) * 10 * tornProgress));
                pts.push(`${xPct}% ${yPct.toFixed(1)}%`);
              }
              pts.push("100% 100%", "0% 100%");
              sheet.style.clipPath = `polygon(${pts.join(", ")})`;
            } else {
              sheet.style.clipPath =
                "polygon(0% 8%, 12% 13%, 25% 17%, 38% 19%, 50% 20%, 62% 19%, 75% 16%, 88% 11%, 100% 4%, 100% 100%, 0% 100%)";
            }

            const vw = window.innerWidth || 1200;
            const tx = peelEase * (vw * 1.15);
            const ty = -localT * 18 - peelEase * 140;
            const rotZ = -localT * 4 - peelEase * 24;
            const rotX = peelEase * 28;
            const rotY = -peelEase * 26;
            const skewY = -peelEase * 8;
            const sc = 1 + Math.sin(peelT * Math.PI) * 0.06;

            sheet.style.transform = `perspective(1000px) translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) skewY(${skewY.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
            sheet.style.filter = `drop-shadow(${(-10 - peelEase * 18).toFixed(1)}px ${(14 + peelEase * 20).toFixed(1)}px ${(16 + peelEase * 16).toFixed(1)}px rgba(38, 30, 22, 0.34))`;
            sheet.style.opacity = "1";
          }
        }
      }
    }

    if (!isRipping) {
      if (footer) footer.classList.remove("is-ripping");
      if (sheet) {
        sheet.style.transform = "";
        sheet.style.opacity = "";
        sheet.style.clipPath = "";
        sheet.style.filter = "";
      }
    }

    if (usingEraser) {
      cache.nib.style.opacity = "0";
      cache.eraser.style.opacity = "1";
      cache.eraser.setAttribute("transform", `translate(${(eraserPoint.x - 16).toFixed(1)} ${(eraserPoint.y - 26).toFixed(1)})`);
    } else {
      cache.eraser.style.opacity = "0";
      cache.nib.style.opacity = "1";
      cache.nib.setAttribute("transform", `translate(${(tipPoint.x - 12).toFixed(1)} ${(tipPoint.y - 52).toFixed(1)})`);
    }
  }

  function stepFooterAnimation(now) {
    if (!footerAtBottom || !footerTimeline) {
      footerAnimRaf = null;
      return;
    }

    const cache = initFooterWriting();
    if (!cache) {
      footerAnimRaf = null;
      return;
    }

    const elapsedMs = Math.min(footerTimeline.totalMs, Math.max(0, now - footerAnimStart));
    renderFooterTimeline(cache, footerTimeline, elapsedMs);

    if (elapsedMs < footerTimeline.totalMs) {
      footerAnimRaf = requestAnimationFrame(stepFooterAnimation);
    } else {
      footerAnimRaf = null;
    }
  }

  function updateFooterWriting() {
    const cache = initFooterWriting();
    if (!cache) return;

    const footer = cache.svg.closest(".footer");
    const vh = window.innerHeight || 800;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const scrollY = window.scrollY || 0;
    const footerRect = footer ? footer.getBoundingClientRect() : cache.svg.getBoundingClientRect();
    const outOfView = footerRect.top >= vh;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (footer) footer.style.setProperty("--fold-footer", outOfView ? "1" : "0");
      for (const it of cache.mainItems) {
        it.path.style.strokeDashoffset = "0";
        it.path.style.fillOpacity = "1";
        it.path.style.opacity = "1";
      }
      return;
    }

    // Folded (1) when completely out of view below the viewport; unfolds (1 -> 0) as it enters
    if (footer) {
      const unfoldSpan = Math.max(120, Math.min(footerRect.height * 0.85, vh * 0.55));
      const unfoldProgress = outOfView
        ? 0
        : Math.min(1, Math.max(0, (vh - footerRect.top) / unfoldSpan));
      footer.style.setProperty("--fold-footer", (1 - unfoldProgress).toFixed(4));
    }

    const reachedBottom = scrollY >= maxScroll - 4;

    if (reachedBottom && !footerAtBottom) {
      footerAtBottom = true;
      footerTimeline = buildFooterScenario(cache);
      footerAnimStart = performance.now();
      if (footerAnimRaf) cancelAnimationFrame(footerAnimRaf);
      footerAnimRaf = requestAnimationFrame(stepFooterAnimation);
    } else if (outOfView && footerAtBottom) {
      // Only reset once the footer has gone completely out of view
      footerAtBottom = false;
      footerTimeline = null;
      if (footerAnimRaf) {
        cancelAnimationFrame(footerAnimRaf);
        footerAnimRaf = null;
      }
      resetFooterPaths(cache);
    } else if (!footerAtBottom) {
      resetFooterPaths(cache);
    }
  }

  function scheduleSync() {
    updateFooterWriting();
    syncHeaderState();
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(syncDoodles);
  }

  function rotateShiftingDoodles() {
    if (!document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const svg = createLayer();
      const all = Array.from(svg.querySelectorAll(".doodle-group"));
      for (const el of all) {
        if (el.classList.contains("is-shifting") && Math.random() < 0.7) {
          el.classList.remove("is-shifting");
        }
      }

      const scrollY = window.scrollY || 0;
      const vh = window.innerHeight || 800;
      const bandTop = scrollY - BAND_HEIGHT;
      const bandBottom = scrollY + vh + BAND_HEIGHT;

      const nearby = all.filter((el) => {
        const m = /translate\([^ ]+ ([^)]+)\)/.exec(el.getAttribute("transform") || "");
        if (!m) return false;
        const y = parseFloat(m[1]);
        return y >= bandTop && y <= bandBottom;
      });

      const pool = nearby.length > 0 ? nearby : all;
      const targetCount = Math.min(8, Math.max(2, Math.round(pool.length * 0.2)));
      for (let i = 0; i < targetCount; i++) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) pick.classList.add("is-shifting");
      }
    }

    setTimeout(rotateShiftingDoodles, 1800 + Math.random() * 1800);
  }

  function init() {
    syncHeaderState();
    syncDoodles();
    updateFooterWriting();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("pointerdown", unlockAudio, { passive: true, once: true });
    window.addEventListener("wheel", unlockAudio, { passive: true, once: true });
    window.addEventListener("touchstart", unlockAudio, { passive: true, once: true });
    window.addEventListener("keydown", unlockAudio, { passive: true, once: true });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(scheduleSync);
      ro.observe(document.body);
    }

    setInterval(spawnLiveDoodle, 2100);
    setTimeout(rotateShiftingDoodles, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
