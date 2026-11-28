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

  function initFooterWriting() {
    const svg = document.querySelector(".footer-write-svg");
    if (!svg) return null;

    if (!footerStrokeCache || !footerStrokeCache.svg.isConnected) {
      const paths = Array.from(svg.querySelectorAll(".write-stroke"));
      const nib = svg.querySelector(".footer-pen-nib");
      if (paths.length === 0 || !nib) return null;

      const items = paths.map((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        return { path: p, len };
      });
      const totalLen = items.reduce((s, it) => s + it.len, 0);
      footerStrokeCache = { svg, items, totalLen, nib };
    }

    return footerStrokeCache;
  }

  function updateFooterWriting() {
    const cache = initFooterWriting();
    if (!cache) return;

    const { svg, items, totalLen, nib } = cache;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const it of items) it.path.style.strokeDashoffset = "0";
      return;
    }

    const vh = window.innerHeight || 800;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    const rect = svg.getBoundingClientRect();
    const span = Math.max(180, rect.height * 1.4);
    const startScroll = Math.max(0, maxScroll - span);
    const progress = Math.min(1, Math.max(0, (window.scrollY - startScroll) / Math.max(80, maxScroll - startScroll)));

    let remaining = progress * totalLen;
    let tipPoint = items[0].path.getPointAtLength(0);

    for (const it of items) {
      if (remaining >= it.len) {
        it.path.style.strokeDashoffset = "0";
        tipPoint = it.path.getPointAtLength(it.len);
        remaining -= it.len;
      } else if (remaining > 0) {
        it.path.style.strokeDashoffset = `${(it.len - remaining).toFixed(2)}`;
        tipPoint = it.path.getPointAtLength(remaining);
        remaining = 0;
      } else {
        it.path.style.strokeDashoffset = `${it.len.toFixed(2)}`;
      }
    }

    nib.setAttribute("transform", `translate(${(tipPoint.x - 12).toFixed(1)} ${(tipPoint.y - 52).toFixed(1)})`);
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
