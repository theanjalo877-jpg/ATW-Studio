(() => {
  const phone = document.querySelector('.editorial-phone');
  const photo = phone.querySelector('.phone-photo-area');
  const fullscreen = document.querySelector('.editorial-fullscreen');
  const fullImage = fullscreen.querySelector('img');
  const slides = [...phone.querySelectorAll('.phone-slide')];
  const indicators = [...phone.querySelectorAll('.phone-progress button')];
  const title = phone.querySelector('.phone-title');
  const zoom = phone.querySelector('.phone-zoom');
  const autoplay = phone.querySelector('.phone-autoplay');
  const announcement = phone.querySelector('.phone-announcement');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 5000;
  let index = 0, elapsed = 0, last = 0, frame = 0, drag = null;
  let visible = false, hovering = false, suspended = reduced.matches, zoomed = false, settling = false;

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
    if (settling) return;
    index = (next + slides.length) % slides.length;
    elapsed = last = 0;
    setZoom(false);
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
    if (visible && !document.hidden && !suspended && !hovering && !focused && !zoomed && !drag && !settling && !fullscreen.open) {
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

  function clearSwipe() {
    for (const slide of slides) {
      slide.style.removeProperty('translate');
      slide.classList.remove('is-swipe-preview');
    }
  }

  function paintSwipe(gesture) {
    const current = slides[index];
    const incoming = slides[(index + gesture.direction + slides.length) % slides.length];
    clearSwipe();
    current.classList.add('is-swipe-preview');
    incoming.classList.add('is-swipe-preview');
    current.style.translate = `${gesture.offset}px 0`;
    incoming.style.translate = `${gesture.offset + gesture.direction * gesture.width}px 0`;
  }

  function showFullscreen() {
    const slide = slides[index];
    fullImage.src = slide.src;
    fullImage.alt = slide.alt;
    fullscreen.showModal();
    sync();
  }

  async function settleSwipe(gesture, commit) {
    const current = slides[index];
    const next = (index + gesture.direction + slides.length) % slides.length;
    const incoming = slides[next];
    const destination = commit ? -gesture.direction * gesture.width : 0;
    settling = true;
    if (!reduced.matches) {
      const move = (slide, offset) => slide.animate([
        {translate: `${gesture.offset + offset}px 0`}, {translate: `${destination + offset}px 0`},
      ], {duration:300,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
      const animations = [move(current, 0), move(incoming, gesture.direction * gesture.width)];
      await Promise.allSettled(animations.map(animation => animation.finished));
      animations.forEach(animation => animation.cancel());
    }
    settling = false;
    if (commit) {
      select(next);
      if (slides[next].dataset.orientation === 'landscape' && visible) showFullscreen();
    }
    clearSwipe();
    sync();
  }

  photo.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || settling || zoomed) return;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,width:photo.clientWidth,direction:0,offset:0};
    photo.setPointerCapture(event.pointerId);
    sync();
  });
  photo.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.direction && (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)*1.2)) return;
    drag.direction = dx < 0 ? 1 : -1;
    drag.offset = Math.max(-drag.width, Math.min(drag.width, dx));
    paintSwipe(drag);
  });
  photo.addEventListener('pointerup', event => {
    if (event.pointerId !== drag?.id) return;
    const gesture = drag;
    drag = null;
    if (!gesture.direction) { sync(); return; }
    settleSwipe(gesture, Math.abs(gesture.offset) >= Math.min(56, gesture.width*.16));
  });
  for (const event of ['pointercancel','lostpointercapture']) {
    photo.addEventListener(event, () => {
      if (!drag) return;
      const gesture = drag;
      drag = null;
      if (gesture.direction) settleSwipe(gesture, false);
      else sync();
    });
  }
  fullscreen.querySelector('button').addEventListener('click', () => fullscreen.close());
  fullscreen.addEventListener('close', () => sync());

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, {threshold:.25}).observe(phone);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { suspended = reduced.matches; updatePlayButton(); sync(); });
  updatePlayButton();
})();
