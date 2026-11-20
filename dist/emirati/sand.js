(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const particles = (count) => Array.from({length:count}, (_, i) => ({
    phase: i / count, life: .75 + Math.random() * .75,
    x: Math.random() - .5, y: Math.random() - .5, z: Math.random() - .5
  }));

  function pigment(color) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48;
    const ink = sprite.getContext('2d');
    const edge = ink.createRadialGradient(24, 24, 0, 24, 24, 24);
    edge.addColorStop(0, color);
    edge.addColorStop(.45, color.replace('1)', '.45)'));
    edge.addColorStop(1, color.replace('1)', '0)'));
    ink.fillStyle = edge;
    ink.fillRect(0, 0, 48, 48);
    return sprite;
  }

  const sandPigment = pigment('rgba(145,94,53,1)');
  const dustPigment = pigment('rgba(205,164,120,1)');
  const grains = particles(220), dust = particles(44);

  function animatePhoto(selector, paint) {
    const photo = document.querySelector(selector);
    const image = photo.querySelector('img'), canvas = photo.querySelector('canvas');
    const ink = canvas.getContext('2d');
    if (!ink) return;
    let visible = false, frame = 0, width, height, imageWidth, imageHeight;
    function fit() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 1.6);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ink.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!image.naturalWidth) return;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      imageWidth = image.naturalWidth * scale;
      imageHeight = image.naturalHeight * scale;
    }
    function draw(now) {
      ink.clearRect(0, 0, width, height);
      if (imageHeight) {
        ink.save();
        ink.translate((width - imageWidth) / 2, (height - imageHeight) / 2);
        paint(ink, now / 1000, imageWidth, imageHeight);
        ink.restore();
      }
      frame = requestAnimationFrame(draw);
    }
    function sync() {
      cancelAnimationFrame(frame);
      if (visible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(draw);
      else ink.clearRect(0, 0, width, height);
    }
    new ResizeObserver(fit).observe(photo);
    image.addEventListener('load', fit);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(photo);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    fit();
  }

  animatePhoto('.lifestyle-sand', (ink, time, w, h) => {
    const handX = w * .532, handY = h * .585;
    for (const grain of grains) {
      const age = (time / grain.life + grain.phase) % 1;
      const fall = age * age;
      const depth = 1 / (1 + .26 * grain.z * age);
      const x = handX + h * (grain.x * (.007 + .030 * fall) - .041 * fall) * depth;
      const y = handY + h * (.012 * age + .233 * fall) * depth;
      const size = h * (.003 + .003 * fall + .001 * grain.z) * depth;
      ink.globalAlpha = .25 * Math.min(age * 11, 1) * (1 - fall);
      ink.drawImage(sandPigment, x - size / 2, y, size, size * 1.45);
    }
  });

  animatePhoto('.lifestyle-couple', (ink, time, w, h) => {
    // The right SUV and distant convoy get separate low trails aligned with their tracks.
    for (const [rearX, groundY, length, scale] of [[.79,.441,.116,1],[.151,.296,.105,.60]]) {
      for (const puff of dust) {
        const age = (time / (puff.life * 3.2) + puff.phase) % 1;
        const depth = 1 / (1 + puff.z * .32 * age);
        const x = w * (rearX - length * age + puff.x * age * .035 * scale);
        const y = h * (groundY - age * .021 * scale + puff.y * age * .026 * scale);
        const size = w * (.016 + age * .164) * scale * depth;
        ink.globalAlpha = .074 * Math.sin(age * Math.PI) ** 1.35;
        ink.drawImage(dustPigment, x - size / 2, y - size * .42, size, size * .52);
      }
    }
  });

  if (!reduced.matches && window.IntersectionObserver) {
    const subtitles = document.querySelectorAll('.story > p:last-child, #movement .caption > p:last-child, .lifestyle-copy > p:last-child, .edition .note');
    const reader = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-reading');
        reader.unobserve(entry.target);
      }
    }, {threshold:.35});
    for (const subtitle of subtitles) {
      const copy = subtitle.textContent.trim();
      subtitle.classList.add('story-reveal');
      subtitle.setAttribute('aria-label', copy);
      let delay = 0;
      subtitle.replaceChildren(...copy.split(/(\s+)/).map(word => {
        if (!word.trim()) return document.createTextNode(word);
        const span = document.createElement('span');
        span.textContent = word;
        span.setAttribute('aria-hidden', 'true');
        span.style.animationDelay = `${delay}ms`;
        delay += Math.min(word.length, 9) * 22 + 30;
        return span;
      }));
      reader.observe(subtitle);
    }
  }
})();
