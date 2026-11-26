(() => {
  const display = document.querySelector('.editorial-display');
  const slides = [...display.querySelectorAll('.oled-slide')];
  const indicators = [...display.querySelectorAll('.oled-progress button')];
  const title = display.querySelector('.oled-title');
  const autoplay = display.querySelector('.oled-autoplay');
  const announcement = display.querySelector('.oled-announcement');
  const fullscreen = document.querySelector('.editorial-fullscreen');
  const detail = fullscreen.querySelector('.inspection-photo-area');
  const image = detail.querySelector('img');
  const zoom = fullscreen.querySelector('.inspection-zoom');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 4500;
  let index = 0, elapsed = 0, last = 0, frame = 0;
  let visible = false, hovering = false, paused = reduced.matches;

  function refreshButton() {
    autoplay.textContent = paused ? '▶' : 'Ⅱ';
    autoplay.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
  }

  function progress() {
    indicators[index].style.setProperty('--fill', elapsed / duration);
  }

  function select(next, announce = true) {
    index = (next + slides.length) % slides.length;
    elapsed = last = 0;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-current', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
      indicators[i].style.setProperty('--fill', i < index ? 1 : 0);
      if (i === index) indicators[i].setAttribute('aria-current', 'true');
      else indicators[i].removeAttribute('aria-current');
    });
    title.textContent = slides[index].dataset.title;
    if (announce) announcement.textContent = title.textContent;
    sync();
  }

  function clock(now) {
    if (last) elapsed += now - last;
    last = now;
    if (elapsed >= duration) select(index + 1, false);
    else {
      progress();
      frame = requestAnimationFrame(clock);
    }
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = last = 0;
    const focused = display.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (visible && !document.hidden && !paused && !hovering && !focused && !fullscreen.open) {
      frame = requestAnimationFrame(clock);
    }
  }

  function setZoom(native) {
    fullscreen.classList.toggle('is-native', native);
    zoom.setAttribute('aria-pressed', String(native));
    zoom.textContent = native ? 'Fit to screen' : 'Loupe · 100%';
    if (native) {
      const [x, y] = slides[index].dataset.focus.split(' ').map(Number);
      detail.scrollLeft = image.offsetWidth * x / 100 - detail.clientWidth / 2;
      detail.scrollTop = image.offsetHeight * y / 100 - detail.clientHeight / 2;
      detail.focus({preventScroll:true});
    }
  }

  display.querySelector('.oled-prev').addEventListener('click', () => select(index - 1));
  display.querySelector('.oled-next').addEventListener('click', () => select(index + 1));
  indicators.forEach((button, i) => button.addEventListener('click', () => select(i)));
  autoplay.addEventListener('click', () => { paused = !paused; refreshButton(); sync(); });
  display.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    select(index + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  display.addEventListener('pointerenter', event => { hovering = event.pointerType === 'mouse'; sync(); });
  display.addEventListener('pointerleave', () => { hovering = false; sync(); });
  display.addEventListener('focusin', sync);
  display.addEventListener('focusout', () => queueMicrotask(sync));
  display.querySelector('.oled-expand').addEventListener('click', () => {
    const slide = slides[index];
    image.src = slide.src;
    image.alt = slide.alt;
    fullscreen.showModal();
    setZoom(false);
    sync();
  });
  zoom.addEventListener('click', () => setZoom(!fullscreen.classList.contains('is-native')));
  fullscreen.querySelector('.inspection-close').addEventListener('click', () => fullscreen.close());
  fullscreen.addEventListener('close', sync);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(display);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { paused = reduced.matches; refreshButton(); sync(); });
  refreshButton();
})();
