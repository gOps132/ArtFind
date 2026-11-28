(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const BAND_HEIGHT = 340;
  const MAX_BANDS = 40;

  // Hand-drawn SVG path generators centered around (0, 0) in ~[-28, 28] space
  const DOODLES = [
    // 1. Sketchy 5-point star
    () => [
      "M 0 -22 L 6 -7 L 22 -6 L 9 4 L 14 20 L 0 11 L -14 20 L -9 4 L -22 -6 L -6 -7 Z"
    ],
    // 2. Ink spiral
    () => [
      "M 0 0 C 4 -4 8 0 6 5 C 3 11 -7 10 -10 2 C -13 -8 -2 -17 9 -14 C 21 -10 24 6 16 17 C 7 26 -11 24 -19 13"
    ],
    // 3. Wavy squiggle
    () => [
      "M -24 4 Q -16 -10 -8 4 T 8 4 T 24 4"
    ],
    // 4. Pen nib
    () => [
      "M 0 -22 L 12 4 L 6 18 L -6 18 L -12 4 Z",
      "M 0 -22 L 0 -2",
      "M -6 18 L 6 18"
    ],
    // 5. Little crescent moon
    () => [
      "M 8 -18 A 18 18 0 1 0 8 18 A 13 13 0 1 1 8 -18 Z"
    ],
    // 6. Sketchy cloud
    () => [
      "M -18 8 C -24 8 -26 -2 -18 -4 C -16 -14 -2 -16 4 -8 C 12 -14 24 -6 20 4 C 24 10 18 14 12 12 L -16 12 Z"
    ],
    // 7. Curved margin arrow
    () => [
      "M -18 14 Q -4 -12 18 -6",
      "M 10 -13 L 19 -6 L 11 2"
    ],
    // 8. Tiny framed sketch / polaroid
    () => [
      "M -16 -18 L 17 -16 L 15 18 L -18 16 Z",
      "M -11 -11 L 11 -10 L 10 6 L -12 5 Z",
      "M -8 12 L 6 12"
    ],
    // 9. Asterisk / sparkle burst
    () => [
      "M 0 -18 L 0 18",
      "M -16 -9 L 16 9",
      "M -16 9 L 16 -9"
    ],
    // 10. Small artist palette
    () => [
      "M -18 2 C -20 -12 -4 -20 10 -14 C 22 -8 22 10 10 16 C 2 20 -4 14 -2 8 C 0 4 -16 12 -18 2 Z",
      "M -6 -8 A 2 2 0 1 0 -2 -8 A 2 2 0 1 0 -6 -8",
      "M 6 -6 A 2 2 0 1 0 10 -6 A 2 2 0 1 0 6 -6",
      "M 8 5 A 2 2 0 1 0 12 5 A 2 2 0 1 0 8 5"
    ],
    // 11. Tiny heart doodle
    () => [
      "M 0 16 C -16 4 -22 -10 -11 -16 C -4 -19 0 -12 0 -8 C 0 -12 4 -19 11 -16 C 22 -10 16 4 0 16 Z"
    ],
    // 12. Looped ribbon
    () => [
      "M -22 8 C -12 -14 0 14 -6 14 C -12 14 0 -14 10 8 C 16 18 24 -4 22 -10"
    ]
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
  let rafPending = false;

  function pickX(vw, index) {
    // Bias doodles toward the left/right sketchbook margins on wide screens,
    // while keeping some scattered across the sheet.
    if (vw > 1100 && index % 3 !== 2) {
      const marginWidth = Math.max(80, (vw - 1220) / 2 + 70);
      return index % 2 === 0
        ? 24 + Math.random() * marginWidth
        : vw - 24 - Math.random() * marginWidth;
    }
    return 28 + Math.random() * Math.max(120, vw - 56);
  }

  function appendBand(svg, bandIndex) {
    const vw = window.innerWidth || 1200;
    const count = vw < 640 ? 3 : 5;
    const yStart = bandIndex * BAND_HEIGHT + 40;

    for (let i = 0; i < count; i++) {
      const fn = DOODLES[Math.floor(Math.random() * DOODLES.length)];
      const paths = fn();
      const x = pickX(vw, i + bandIndex);
      const y = yStart + Math.random() * (BAND_HEIGHT - 70);
      const rot = (Math.random() * 44 - 22).toFixed(1);
      const scale = (0.72 + Math.random() * 0.55).toFixed(2);
      const isBlueInk = Math.random() < 0.28;

      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${scale})`);
      g.setAttribute("class", isBlueInk ? "doodle-group doodle-ink-accent" : "doodle-group");

      for (const d of paths) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        path.setAttribute("class", "doodle-stroke");
        g.appendChild(path);
      }

      svg.appendChild(g);
    }
  }

  function syncDoodles() {
    rafPending = false;
    const svg = createLayer();
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      window.innerHeight + window.scrollY + BAND_HEIGHT
    );

    svg.setAttribute("width", String(window.innerWidth));
    svg.setAttribute("height", String(docHeight));

    const targetBands = Math.min(MAX_BANDS, Math.ceil(docHeight / BAND_HEIGHT));
    while (generatedBands < targetBands) {
      appendBand(svg, generatedBands);
      generatedBands++;
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
