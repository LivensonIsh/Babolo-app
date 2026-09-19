(() => {
  'use strict';

  /* ===================== CONFIG ===================== */
  // 121 frames réelles extraites de la vidéo source (pas 180 — chiffre ajusté à la vraie durée
  // de la vidéo fournie : 5s à 24fps = 121 frames, jamais inventé).
  const FRAME_COUNT = 121;
  const FRAME_PATH = (i) => `assets/sequence/frame_${String(i).padStart(4, '0')}.webp`;

  const canvas = document.getElementById('sequence-canvas');
  const ctx = canvas.getContext('2d');
  const loadingScreen = document.getElementById('loading-screen');
  const loaderFill = document.getElementById('loader-fill');

  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let currentFrame = 0;
  let canvasW = window.innerWidth;
  let canvasH = window.innerHeight;

  /* ===================== PRÉCHARGEMENT ===================== */
  function preloadImages() {
    return new Promise((resolve) => {
      for (let i = 0; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.onload = img.onerror = () => {
          loadedCount++;
          const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
          loaderFill.style.width = `${pct}%`;
          if (loadedCount === FRAME_COUNT) resolve();
        };
        img.src = FRAME_PATH(i + 1);
        images[i] = img;
      }
    });
  }

  /* ===================== RENDU CANVAS (object-fit: cover) ===================== */
  function resizeCanvas() {
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    canvas.width = canvasW * (window.devicePixelRatio || 1);
    canvas.height = canvasH * (window.devicePixelRatio || 1);
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // Logique "object-fit: cover" manuelle : remplit tout le canvas sans déformer l'image.
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasW / canvasH;
    let drawW, drawH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawW = canvasW;
      drawH = canvasW / imgRatio;
      offsetX = 0;
      offsetY = (canvasH - drawH) / 2;
    } else {
      drawH = canvasH;
      drawW = canvasH * imgRatio;
      offsetX = (canvasW - drawW) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }

  /* ===================== SCROLL -> FRAME + CARTES ===================== */
  const cards = Array.from(document.querySelectorAll('[data-card]'));
  // Seuils en % de scroll global, correspondant aux 3 sections de la page.
  const CARD_THRESHOLDS = {
    1: [0.00, 0.30],
    2: [0.35, 0.65],
    3: [0.70, 1.00],
  };

  function getScrollProgress() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.min(1, Math.max(0, scrollTop / maxScroll));
  }

  function updateCards(progress) {
    cards.forEach((card) => {
      const key = card.getAttribute('data-card');
      const [start, end] = CARD_THRESHOLDS[key];
      const visible = progress >= start && progress <= end;
      card.classList.toggle('visible', visible);
    });
  }

  // Débounce via drapeau requestAnimationFrame — évite le layout thrashing sur scroll rapide.
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const progress = getScrollProgress();
      currentFrame = Math.min(FRAME_COUNT - 1, Math.round(progress * (FRAME_COUNT - 1)));
      updateCards(progress);
      ticking = false;
    });
  }

  /* ===================== BOUCLE DE RENDU ===================== */
  function renderLoop() {
    drawFrame(currentFrame);
    requestAnimationFrame(renderLoop);
  }

  /* ===================== NAVIGATION (boutons -> app principale) ===================== */
  function bindNav() {
    const appUrl = 'app.html'; // à ajuster une fois l'app principale déployée au même endroit
    ['nav-login', 'nav-signup', 'hero-cta', 'final-cta'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => { window.location.href = appUrl; });
    });
    const scrollHint = document.getElementById('hero-scroll-hint');
    if (scrollHint) {
      scrollHint.addEventListener('click', () => {
        document.getElementById('comment-ca-marche').scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  /* ===================== INIT ===================== */
  async function init() {
    resizeCanvas();
    bindNav();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', onScroll, { passive: true });

    await preloadImages();

    loadingScreen.classList.add('hidden');
    onScroll(); // applique l'état initial (frame 0, carte 1 visible) sans attendre un scroll
    renderLoop();
  }

  init();
})();
