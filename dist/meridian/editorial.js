(() => {
  const phone = document.querySelector('.editorial-phone');
  const photo = phone.querySelector('.phone-photo-area');
  const slides = [...phone.querySelectorAll('.phone-slide')];
  const indicators = [...phone.querySelectorAll('.phone-progress button')];
  const title = phone.querySelector('.phone-title');
  const zoom = phone.querySelector('.phone-zoom');
  const autoplay = phone.querySelector('.phone-autoplay');
  const announcement = phone.querySelector('.phone-announcement');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 5000;
  let index = 0, elapsed = 0, last = 0, frame = 0, drag = null;
  let visible = false, hovering = false, suspended = reduced.matches, zoomed = false;

  function updatePlayButton() {
    autoplay.textContent = suspended ? '▶' : 'Ⅱ';
    autoplay.setAttribute('aria-label', suspended ? 'Play slideshow' : 'Pause slideshow');
  }

  function setZoom(enabled) {
    zoomed = enabled;
    phone.classList.toggle('is-zoomed', zoomed);
    zoom.setAttribute('aria-pressed', String(zoomed));
    zoom.textContent = zoomed ? 'Tap to zoom out' : 'Tap to zoom';
  }

  function renderProgress() {
    indicators.forEach((button, i) => {
      const fill = i < index ? 1 : i === index ? elapsed / duration : 0;
      button.style.setProperty('--fill', fill);
    });
  }

  function select(next, announce = true) {
    index = (next + slides.length) % slides.length;
    elapsed = last = 0;
    setZoom(false);
    phone.classList.toggle('is-landscape', slides[index].dataset.orientation === 'landscape');
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-current', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
      if (i === index) indicators[i].setAttribute('aria-current', 'true');
      else indicators[i].removeAttribute('aria-current');
    });
    title.textContent = slides[index].dataset.title;
    if (announce) announcement.textContent = title.textContent;
    renderProgress();
    sync();
  }

  function clock(now) {
    frame = 0;
    if (last) elapsed += now - last;
    last = now;
    if (elapsed >= duration) select(index + 1, false);
    else {
      renderProgress();
      frame = requestAnimationFrame(clock);
    }
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = last = 0;
    const focused = phone.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (visible && !document.hidden && !suspended && !hovering && !focused && !zoomed && !drag) {
      frame = requestAnimationFrame(clock);
    }
  }

  phone.querySelector('.phone-prev').addEventListener('click', () => select(index - 1));
  phone.querySelector('.phone-next').addEventListener('click', () => select(index + 1));
  indicators.forEach((button, i) => button.addEventListener('click', () => select(i)));
  zoom.addEventListener('click', () => { setZoom(!zoomed); sync(); });
  autoplay.addEventListener('click', () => { suspended = !suspended; updatePlayButton(); sync(); });
  phone.addEventListener('keydown', event => {
    if (event.key === 'Escape' && zoomed) { setZoom(false); sync(); }
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    select(index + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  phone.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovering = true; sync(); });
  phone.addEventListener('pointerleave', () => { hovering = false; sync(); });
  phone.addEventListener('focusin', sync);
  phone.addEventListener('focusout', () => queueMicrotask(sync));

  photo.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY};
    photo.setPointerCapture(event.pointerId);
    sync();
  });
  photo.addEventListener('pointerup', event => {
    if (event.pointerId !== drag?.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag = null;
    if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.2) select(index + (dx < 0 ? 1 : -1));
    else sync();
  });
  for (const event of ['pointercancel','lostpointercapture']) {
    photo.addEventListener(event, () => { drag = null; sync(); });
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, {threshold:.25}).observe(phone);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { suspended = reduced.matches; updatePlayButton(); sync(); });
  updatePlayButton();
})();
