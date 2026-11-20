(() => {
  const scene = document.querySelector('.lifestyle-sand');
  const canvas = scene.querySelector('canvas');
  const photo = scene.querySelector('img');
  const ink = canvas.getContext('2d');
  if (!ink) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const grains = Array.from({length: 360}, (_, i) => ({
    phase: i / 360,
    life: 0.65 + Math.random() * 0.80,
    drift: Math.random() - 0.5,
    spread: Math.random() - 0.5,
    size: 0.28 + Math.random() * 0.63,
    light: Math.random() * 0.56 + 0.18
  }));
  let frame, visible = false, width, height, originX, originY, imageHeight;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!photo.naturalWidth) return;
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
    const imageWidth = photo.naturalWidth * scale;
    imageHeight = photo.naturalHeight * scale;
    originX = (width - imageWidth) / 2 + imageWidth * 0.532;
    originY = (height - imageHeight) / 2 + imageHeight * 0.585;
  }

  function draw(now) {
    ink.clearRect(0, 0, width, height);
    if (imageHeight) {
      ink.fillStyle = '#f9cf8a';
      for (const grain of grains) {
        const age = (now / (1000 * grain.life) + grain.phase) % 1;
        const y = originY + imageHeight * (0.025 * age + 0.22 * age * age);
        const x = originX + imageHeight * (grain.spread * 0.012 - 0.035 * age * age + grain.drift * 0.07 * age * age);
        ink.globalAlpha = grain.light * Math.min(age * 20, 1) * (1 - age);
        ink.fillRect(x, y, grain.size, grain.size * (1 + age));
      }
    }
    frame = requestAnimationFrame(draw);
  }

  function sync() {
    cancelAnimationFrame(frame);
    if (visible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(draw);
    else ink.clearRect(0, 0, width, height);
  }

  new ResizeObserver(resize).observe(scene);
  photo.addEventListener('load', resize);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(scene);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  resize();
})();
