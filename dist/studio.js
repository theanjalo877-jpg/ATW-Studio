const stage = document.querySelector('#intro');
const replay = document.querySelector('#replay');
const motion = document.querySelector('#motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
const canAnimate = () => !paused && !reduced.matches;
const connection = navigator.connection;
const limitedConnection = connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType);
if (matchMedia('(max-width: 720px)').matches || limitedConnection) {
  for (const video of document.querySelectorAll('video[data-mobile-src]')) {
    video.src = video.dataset.mobileSrc;
  }
}

{
  const video = stage.querySelector('.stage-video');
  const nameLetters = [...stage.querySelectorAll('.office-name > span')].flatMap(word => {
    const letters = Array.from(word.textContent, character => {
      const letter = document.createElement('i');
      letter.textContent = character;
      return letter;
    });
    word.replaceChildren(...letters);
    return letters;
  });
  const dayEnds = 2.48;
  // The fixture flickers once before settling. These times match the encoded frames.
  const lampOn = 3.708;
  const dayReturn = 6.25;
  const lampLevels = [[lampOn,.15],[3.792,.90],[3.833,1],[3.958,.22],[4.083,1]];
  let visible = false, needsPlay = false, frame = 0;
  let stalled;

  function paintPhase() {
    const time = video.currentTime;
    stage.dataset.phase = reduced.matches || video.error ? 'night'
      : time >= dayReturn ? 'dusk' : time >= lampOn ? 'night' : time >= dayEnds ? 'dusk' : 'day';
    if (stage.dataset.phase === 'day') {
      nameLetters.forEach((letter, index) => {
        const progress = Math.max(0, Math.min(1, (time - .1 - index * .081) / .36));
        letter.style.setProperty('--name-reveal', (1 - (1 - progress) ** 3).toFixed(3));
      });
    }
    const next = lampLevels.findIndex(([at]) => at > time);
    let level = 1;
    if (!reduced.matches && !video.error && next > 0) {
      const [from, dim] = lampLevels[next - 1], [to, bright] = lampLevels[next];
      level = dim + (bright - dim) * (time - from) / (to - from);
    }
    if (!reduced.matches && !video.error && time < dayReturn) level *= Math.min(1, (dayReturn - time) / .38);
    stage.style.setProperty('--lamp-level', level.toFixed(3));
  }

  // Read media time so buffering and pause cannot advance the reveal.
  function trackPlayback() {
    paintPhase();
    frame = requestAnimationFrame(trackPlayback);
  }

  function updateControls() {
    motion.hidden = replay.hidden = reduced.matches;
    motion.textContent = needsPlay || video.ended ? 'Play intro' : paused ? 'Resume motion' : 'Pause motion';
    replay.disabled = needsPlay;
  }

  function syncIntro() {
    clearTimeout(stalled);
    cancelAnimationFrame(frame);
    if (!canAnimate() || !visible || document.hidden || video.ended || needsPlay) {
      video.pause();
      paintPhase();
      return;
    }
    video.play().catch(error => {
      if (error.name === 'AbortError') return;
      cancelAnimationFrame(frame);
      needsPlay = true;
      updateControls();
    });
    trackPlayback();
  }

  function syncMotion() {
    document.body.classList.toggle('motion-paused', !canAnimate());
    if (reduced.matches) video.classList.remove('is-playing');
    updateControls();
    syncIntro();
    document.dispatchEvent(new Event('studio-motion'));
  }

  function restart() {
    if (video.error) video.load();
    video.currentTime = 0;
    paused = needsPlay = false;
    syncMotion();
  }

  video.addEventListener('playing', () => {
    clearTimeout(stalled);
    needsPlay = false;
    video.classList.add('is-playing');
    updateControls();
  });
  video.addEventListener("waiting", () => {
    clearTimeout(stalled);
    if (!canAnimate() || !visible || document.hidden) return;
    stalled = setTimeout(() => {
      video.pause();
      cancelAnimationFrame(frame);
      needsPlay = true;
      updateControls();
    }, 5000);
  });
  video.addEventListener('ended', () => {
    cancelAnimationFrame(frame);
    paintPhase();
    updateControls();
  });
  video.addEventListener('error', () => {
    needsPlay = true;
    video.classList.remove('is-playing');
    cancelAnimationFrame(frame);
    paintPhase();
    updateControls();
  });
  new IntersectionObserver(([entry]) => {
    const returning = entry.isIntersecting && !visible;
    visible = entry.isIntersecting;
    if (returning && canAnimate() && (needsPlay || video.ended)) {
      if (video.error) video.load();
      needsPlay = false;
      video.currentTime = 0;
      updateControls();
    }
    syncIntro();
  }).observe(stage);
  document.addEventListener('visibilitychange', syncIntro);
  window.addEventListener('pageshow', syncIntro);
  motion.addEventListener('click', () => {
    if (video.ended || video.error) return restart();
    if (needsPlay) paused = needsPlay = false;
    else paused = !paused;
    syncMotion();
  });
  replay.addEventListener('click', restart);
  reduced.addEventListener('change', syncMotion);
  syncMotion();
}

const projectObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('project-visible', entry.isIntersecting));
});
document.querySelectorAll('.project, .build-bay').forEach(project => projectObserver.observe(project));

// Fragment links need to stay inside Streamlit's embedded document.
{
  const dialog = document.querySelector('#contact-dialog');
  const heading = document.querySelector('#contact-heading');
  const message = document.querySelector('#contact-message');
  const address = document.querySelector('#contact-address');
  const status = document.querySelector('#copy-status');
  const compose = document.querySelector('#compose-email');
  const composeUrl = new URL(compose.href);
  let opener;

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    if (link.dataset.contact && typeof dialog.showModal === 'function') {
      const project = link.dataset.contact === 'project';
      opener = link;
      heading.textContent = project ? 'Discuss your project' : 'Email Anjalo';
      message.textContent = project ? 'Tell me which app you’re interested in or what you’d like to improve.' : 'Copy the address or open a new message in Gmail.';
      composeUrl.searchParams.set('su', project ? 'ATW Studio project consultation' : 'Hello from ATW Studio');
      compose.href = composeUrl.href;
      status.textContent = '';
      dialog.showModal();
      return;
    }

    const focus = target.querySelector('h2') || target;
    if (!focus.hasAttribute('tabindex')) focus.tabIndex = -1;
    focus.focus({preventScroll:true});
    target.scrollIntoView({behavior:reduced.matches ? 'instant' : 'smooth', block:'start'});
    if (target.id === 'work') {
      target.classList.remove('section-arrival');
      void target.offsetWidth;
      target.classList.add('section-arrival');
    }
  });

  dialog.addEventListener('close', () => opener?.focus({preventScroll:true}));
  document.querySelector('#copy-address').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address.value);
      status.textContent = 'Email address copied.';
    } catch {
      address.focus();
      address.select();
      status.textContent = 'Email selected. Use your device’s Copy command.';
    }
  });
}

for (const feature of document.querySelectorAll('.qame-film')) {
  const film = feature.querySelector('video');
  const play = feature.querySelector('.qame-play');
  const sound = feature.querySelector('.qame-sound');
  const name = feature.classList.contains('qame-store-film') ? 'QAMÉ storefront film' : 'QAMÉ film';
  let inView = false, playIntent = !reduced.matches;

  function syncFilm() {
    if (inView && playIntent && !document.hidden && !film.ended) film.play().catch(() => {});
    else film.pause();
  }
  function syncButtons() {
    const action = film.ended ? 'Replay' : film.paused ? 'Play' : 'Pause';
    play.textContent = action + ' film';
    play.setAttribute('aria-label', action + ' ' + name);
    sound.textContent = film.muted ? 'Unmute' : 'Mute';
    sound.setAttribute('aria-label', sound.textContent + ' ' + name);
  }
  play.addEventListener('click', () => {
    playIntent = film.paused;
    if (film.ended) film.currentTime = 0;
    syncFilm();
  });
  sound.addEventListener('click', () => {
    film.muted = !film.muted;
    if (!film.muted) {
      for (const other of document.querySelectorAll('.qame-film video')) {
        if (other !== film) other.muted = true;
      }
      if (film.paused) {
        playIntent = true;
        syncFilm();
      }
    }
  });
  for (const event of ['play','pause','ended','volumechange']) film.addEventListener(event, syncButtons);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncFilm();
  }, {threshold:.3}).observe(film);
  reduced.addEventListener('change', () => {
    if (reduced.matches) playIntent = false;
    syncFilm();
  });
  document.addEventListener('visibilitychange', syncFilm);
  syncButtons();
}

if (!reduced.matches) {
  const storyObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add(entry.target.classList.contains('qame-story') ? 'qame-story-visible' : 'atelier-visible');
      storyObserver.unobserve(entry.target);
    }
  }, {threshold:.3});
  for (const [selector, ready] of [['.qame-story','qame-story-ready'], ['.atelier-feature','atelier-ready']]) {
    const feature = document.querySelector(selector);
    if (!feature) continue;
    feature.classList.add(ready);
    storyObserver.observe(feature);
  }
}

if (!reduced.matches) {
  const enters = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('portfolio-entered');
      enters.unobserve(entry.target);
    }
  }, {threshold:.18});
  document.querySelectorAll('.brand-projects, .study-banner, [data-study]').forEach((node, index) => {
    if (node.hasAttribute('data-study')) node.style.setProperty('--entrance-delay', (index % 3) * .07 + 's');
    enters.observe(node);
  });
}

const studyMotionObserver = new IntersectionObserver(entries => {
  for (const {target, isIntersecting} of entries) target.classList.toggle('study-in-view', isIntersecting);
}, {threshold:.15});
document.querySelectorAll('.study-banner, .study-card:has(.study-flight)').forEach(card => studyMotionObserver.observe(card));

{
  const closing = document.querySelector('.closing-film');
  const film = closing.querySelector('video');
  const dock = document.querySelector('.contact-dock');
  const guide = dock.querySelector('.contact-guide');
  const guideSlot = closing.querySelector('.closing-guide-slot');
  new IntersectionObserver(([entry]) => {
    dock.classList.toggle('contact-docked', entry.isIntersecting);
    if (entry.isIntersecting) guideSlot.append(guide);
    else {
      dock.prepend(guide);
      closing.classList.remove('show-contacts');
    }
  }, {rootMargin:'0px 0px -48px'}).observe(closing.querySelector('.closing-brand'));
  let nearby = false;
  function syncClosingFrame() {
    const time = film.currentTime;
    closing.classList.toggle('show-tease', time >= 5.7 && time < 7.15);
    closing.classList.toggle('show-soon', time >= 7.4);
    closing.classList.toggle('show-brand', time >= 9.2 || Boolean(film.error));
    if (time >= 10.5 || film.error) closing.classList.add('show-contacts');
  }
  function syncClosingFilm() {
    if (nearby && canAnimate() && !document.hidden) {
      film.play().catch(error => {
        if (error.name !== 'AbortError') closing.classList.add('closing-fallback');
      });
    } else {
      film.pause();
    }
  }
  film.addEventListener('playing', () => closing.classList.remove('closing-fallback'));
  for (const event of ['timeupdate', 'seeking', 'seeked', 'error']) {
    film.addEventListener(event, syncClosingFrame);
  }
  new IntersectionObserver(([entry]) => {
    nearby = entry.isIntersecting;
    syncClosingFilm();
  }, {rootMargin:'0px 0px 60px'}).observe(film);
  document.addEventListener('visibilitychange', syncClosingFilm);
  document.addEventListener('studio-motion', syncClosingFilm);
}

{
  const preview = document.querySelector('.fab-cover video');
  let inView = false, heldPointer = null, heldKey = false;
  function syncFabPreview() {
    if (inView && heldPointer === null && !heldKey && canAnimate() && !document.hidden) {
      preview.play().catch(() => {});
    } else {
      preview.pause();
    }
  }
  preview.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    heldPointer = event.pointerId;
    preview.setPointerCapture(event.pointerId);
    syncFabPreview();
  });
  function releasePreview(event) {
    if (event.pointerId !== heldPointer) return;
    heldPointer = null;
    syncFabPreview();
  }
  preview.addEventListener('pointerup', releasePreview);
  preview.addEventListener('pointercancel', releasePreview);
  preview.addEventListener('lostpointercapture', releasePreview);
  preview.addEventListener('contextmenu', event => event.preventDefault());
  preview.addEventListener('keydown', event => {
    if (event.code !== 'Space') return;
    event.preventDefault();
    heldKey = true;
    syncFabPreview();
  });
  preview.addEventListener('keyup', event => {
    if (event.code !== 'Space') return;
    event.preventDefault();
    heldKey = false;
    syncFabPreview();
  });
  preview.addEventListener('blur', () => {
    heldKey = false;
    syncFabPreview();
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncFabPreview();
  }, {threshold: .2}).observe(preview);
  document.addEventListener('visibilitychange', syncFabPreview);
  document.addEventListener('studio-motion', syncFabPreview);
}

if (!reduced.matches) {
  const copy = document.querySelector('.fab-copy');
  const description = copy.querySelector('.fab-description');
  const reveal = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    reveal.disconnect();
    if (!canAnimate()) return;

    const original = document.createElement('span');
    original.className = 'fab-description-source';
    original.textContent = description.textContent;
    const typed = document.createElement('span');
    typed.setAttribute('aria-hidden', 'true');
    let delay = 2250;
    for (const word of original.textContent.split(' ')) {
      if (typed.childNodes.length) typed.append(' ');
      const group = document.createElement('span');
      group.className = 'fab-description-word';
      for (const character of word) {
        const letter = document.createElement('span');
        letter.className = 'fab-letter';
        letter.textContent = character;
        letter.style.setProperty('--fab-delay', delay + 'ms');
        group.append(letter);
        delay += /[,.]/.test(character) ? 130 : 45;
      }
      typed.append(group);
    }
    description.replaceChildren(original, typed);
    copy.classList.add('fab-revealing');
  }, {threshold:.35});
  reveal.observe(copy);
}

{
  const preview = document.querySelector('.collection-watch');
  if (!reduced.matches && !limitedConnection) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const loadWatch = async () => {
        try {
          const response = await fetch(preview.dataset.watchSource);
          if (!response.ok) return;
          const watch = new DOMParser().parseFromString(await response.text(), 'text/html');
          for (const source of [...watch.querySelectorAll('script:not([src])')].slice(0, 2)) {
            const script = document.createElement('script');
            script.textContent = source.textContent;
            document.body.append(script);
          }
        } catch {
          // The watch poster remains visible if the preview cannot load.
        }
      };
      if ('requestIdleCallback' in window) requestIdleCallback(loadWatch);
      else setTimeout(loadWatch, 1200);
    });
    observer.observe(preview);
  }
}
