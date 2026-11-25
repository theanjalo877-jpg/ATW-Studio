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

(() => {
  const headline = document.querySelector('#emirati h1');
  const lettering = headline?.querySelector('.emirati-silk');
  if (!lettering) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'sand-title-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  const ink = canvas.getContext('2d', {willReadFrequently:true});
  if (!ink) return;
  headline.append(canvas);

  const duration = 2400;
  const fadeIn = 250;
  // Sample cubic-bezier(.16, 1, .3, 1) once, with time as the input axis.
  const drift = Float32Array.from({length:257}, (_, index) => {
    const time = index / 256;
    let lo = 0, hi = 1;
    for (let i = 0; i < 12; i++) {
      const t = (lo + hi) / 2, inv = 1 - t;
      const x = 3 * inv * inv * t * .16 + 3 * inv * t * t * .3 + t ** 3;
      if (x < time) lo = t;
      else hi = t;
    }
    return 1 - (1 - (lo + hi) / 2) ** 3;
  });
  const smooth = value => {
    const t = Math.max(0, Math.min(value, 1));
    return t * t * (3 - 2 * t);
  };
  const palette = ['#fce4af', '#e9c687', '#c4935c', '#9c663e'];
  let frame = 0, armed = false, cursorBias = 0, biasFrame = 0;

  function settle() {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.hidden = true;
    headline.removeAttribute('data-assembling');
    headline.style.removeProperty('--letter-ink');
  }

  function assemble(replay = false) {
    if (frame || reduced.matches || document.hidden) return;
    const style = getComputedStyle(lettering);
    const width = lettering.offsetWidth, height = lettering.offsetHeight;
    if (!width || !height) return;
    const inset = Math.ceil(width * .32);
    const fieldWidth = width + inset + 10, fieldHeight = height + 28;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    // Read the actual display font at CSS resolution. The playback canvas uses DPR.
    canvas.width = fieldWidth;
    canvas.height = fieldHeight;
    ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing;
    const word = lettering.textContent.trim();
    const metrics = ink.measureText(word);
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
    const baseline = 14 + (height - ascent - descent) / 2 + ascent;
    ink.fillText(word, inset, baseline);
    const mask = ink.getImageData(0, 0, fieldWidth, fieldHeight).data;
    const stride = Math.max(2, Math.round(Math.sqrt(width * height / 4500)));
    const grains = palette.map(() => []);
    for (let row = 0; row < fieldHeight; row += stride) {
      for (let col = inset; col < fieldWidth; col += stride) {
        const tx = col + Math.floor(Math.random() * stride);
        const ty = row + Math.floor(Math.random() * stride);
        if (tx >= fieldWidth || ty >= fieldHeight || mask[(ty * fieldWidth + tx) * 4 + 3] < 166) continue;
        grains[Math.floor(Math.random() * grains.length)].push({
          tx, ty,
          sx: tx - inset * (.65 + Math.random() * 1.35),
          sy: ty + (Math.random() - .47) * height * .68,
          arc: height * (.19 + Math.random() * .53),
          delay: (tx - inset) / width * .23 + Math.random() * .08,
          travel: .57 + Math.random() * .11,
          size: .58 + Math.random() * .83,
        });
      }
    }
    if (!grains.some(group => group.length)) return;
    canvas.width = Math.ceil(fieldWidth * ratio);
    canvas.height = Math.ceil(fieldHeight * ratio);
    Object.assign(canvas.style, {
      left: -inset + 'px', top: '-14px', width: fieldWidth + 'px', height: fieldHeight + 'px',
    });
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvas.hidden = false;
    headline.dataset.assembling = '';
    const lead = replay ? 140 : 0;
    const start = performance.now() + lead;
    headline.style.setProperty('--letter-ink', replay ? '1' : '0');

    function paint(now) {
      const progress = (now - start) / duration;
      if (progress < 0) {
        headline.style.setProperty('--letter-ink', smooth((start - now) / lead).toFixed(3));
        frame = requestAnimationFrame(paint);
        return;
      }
      if (progress >= 1) { settle(); return; }
      const letterInk = smooth((progress - .60) / .40);
      headline.style.setProperty('--letter-ink', letterInk.toFixed(3));
      ink.clearRect(0, 0, fieldWidth, fieldHeight);
      const alpha = smooth(progress * duration / fadeIn) * (1 - letterInk);
      grains.forEach((group, index) => {
        ink.fillStyle = palette[index];
        for (const grain of group) {
          if (progress < grain.delay) continue;
          const travel = progress - grain.delay;
          const time = Math.min(1, travel / grain.travel);
          const eased = drift[Math.round(time * 256)];
          ink.globalAlpha = alpha * smooth(travel * duration / fadeIn);
          const x = grain.sx + (grain.tx - grain.sx) * eased;
          const y = grain.sy + (grain.ty - grain.sy) * eased - grain.arc * 4 * eased * (1 - eased);
          ink.fillRect(x, y, grain.size, grain.size);
        }
      });
      frame = requestAnimationFrame(paint);
    }
    frame = requestAnimationFrame(paint);
  }

  function updateBias() {
    biasFrame = 0;
    const scrollBias = Math.min(1, scrollY / Math.max(1, innerHeight)) * 8;
    lettering.style.setProperty('--silk-bias', (cursorBias + scrollBias).toFixed(1) + '%');
  }

  function queueBias() {
    if (!biasFrame && !reduced.matches) biasFrame = requestAnimationFrame(updateBias);
  }

  window.addEventListener('scroll', () => {
    queueBias();
    if (scrollY > Math.min(250, innerHeight * .34)) armed = true;
    if (armed && scrollY <= 24) {
      armed = false;
      assemble(true);
    }
  }, {passive:true});
  const hero = document.querySelector('#emirati');
  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    cursorBias = (event.clientY / Math.max(1, innerHeight) - .5) * 12;
    queueBias();
  }, {passive:true});
  hero.addEventListener('pointerleave', () => {
    cursorBias = 0;
    queueBias();
  }, {passive:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
  window.addEventListener('resize', settle, {passive:true});
  document.fonts.load('500 64px EmiratiDisplay').catch(() => {}).then(() => {
    if (scrollY <= 24) assemble();
  });
})();
