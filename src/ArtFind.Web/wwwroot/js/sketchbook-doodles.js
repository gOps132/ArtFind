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

  function pickX(vw, index) {
    if (vw > 1120 && index % 4 !== 3) {
      const marginWidth = Math.max(70, (vw - 1240) / 2 + 65);
      return index % 2 === 0
        ? 22 + Math.random() * marginWidth
        : vw - 22 - Math.random() * marginWidth;
    }
    return 24 + Math.random() * Math.max(120, vw - 48);
  }

  function spawnDoodle(svg, x, y, isLive) {
    const spec = DOODLES[Math.floor(Math.random() * DOODLES.length)]();
    const rot = (Math.random() * 54 - 27).toFixed(1);
    const scale = (0.62 + Math.random() * 1.05).toFixed(2);
    const color = pickColor();

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${scale})`);
    g.setAttribute("class", isLive ? "doodle-group doodle-live" : "doodle-group");
    g.style.color = color;

    for (const d of spec.paths) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", spec.dashed ? "doodle-stroke doodle-dashed" : "doodle-stroke");
      path.style.strokeWidth = `${spec.strokeWidth.toFixed(1)}px`;
      if (isLive) {
        path.style.animationDuration = `${(700 + Math.random() * 600).toFixed(0)}ms`;
      }
      g.appendChild(path);
    }

    svg.appendChild(g);
  }

  function appendBand(svg, bandIndex) {
    const vw = document.documentElement.clientWidth || window.innerWidth || 1200;
    const count = vw < 640 ? 5 : 8;
    const yStart = bandIndex * BAND_HEIGHT + 36;

    for (let i = 0; i < count; i++) {
      const x = pickX(vw, i + bandIndex);
      const y = yStart + Math.random() * (BAND_HEIGHT - 60);
      spawnDoodle(svg, x, y, false);
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

    const x = pickX(vw, liveCount);
    const y = Math.min(maxH - 40, scrollY + 70 + Math.random() * Math.max(180, vh - 120));

    spawnDoodle(svg, x, y, true);
    liveCount++;

    if (liveCount > MAX_LIVE_DOODLES) {
      const oldest = svg.querySelector(".doodle-live");
      if (oldest) oldest.remove();
    }
  }

  function scheduleSync() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(syncDoodles);
  }

  function init() {
    syncDoodles();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(scheduleSync);
      ro.observe(document.body);
    }

    setInterval(spawnLiveDoodle, 2100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
