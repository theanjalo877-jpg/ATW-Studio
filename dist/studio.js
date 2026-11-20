const stage = document.querySelector('#intro');
const replay = document.querySelector('#replay');
const motion = document.querySelector('#motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
const canAnimate = () => !paused && !reduced.matches;

{
  const video = stage.querySelector('.stage-video');
  const dayEnds = 2.48;
  // The fixture flickers once before settling. These times match the encoded frames.
  const lampOn = 3.708;
  const lampLevels = [[lampOn,.15],[3.792,.90],[3.833,1],[3.958,.22],[4.083,1]];
  let visible = false, needsPlay = false, frame = 0;
  let stalled;

  function paintPhase() {
    const time = video.currentTime;
    stage.dataset.phase = reduced.matches || video.error ? 'night'
      : time >= lampOn ? 'night' : time >= dayEnds ? 'dusk' : 'day';
    const next = lampLevels.findIndex(([at]) => at > time);
    let level = 1;
    if (!reduced.matches && !video.error && next > 0) {
      const [from, dim] = lampLevels[next - 1], [to, bright] = lampLevels[next];
      level = dim + (bright - dim) * (time - from) / (to - from);
    }
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
    visible = entry.isIntersecting;
    syncIntro();
  }).observe(stage);
  document.addEventListener('visibilitychange', syncIntro);
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

// An illustrative route display. It uses no flight or company data.
{
  const canvas = document.querySelector('.study-motion');
  const pen = canvas.getContext('2d');
  if (pen) {
    const routes = [
      [.48, .79, .67, .01, .95, .26],
      [.50, .78, .75, .33, .98, .61],
      [.55, .79, .73, .25, .82, .16],
    ];
    let width, height, ticket, visible = false;
    function draw(time = 0) {
      pen.clearRect(0, 0, width, height);
      pen.strokeStyle = '#9acfc823';
      for (let x = 0; x < width; x += 34) {
        pen.beginPath(); pen.moveTo(x, 0); pen.lineTo(x, height); pen.stroke();
      }
      for (let y = 0; y < height; y += 34) {
        pen.beginPath(); pen.moveTo(0, y); pen.lineTo(width, y); pen.stroke();
      }
      routes.forEach(([ax, ay, bx, by, cx, cy], index) => {
        pen.beginPath();
        pen.moveTo(ax * width, ay * height);
        pen.quadraticCurveTo(bx * width, by * height, cx * width, cy * height);
        pen.strokeStyle = '#b7e1d66f';
        pen.stroke();
        const t = (time / 8500 + index * .24 + .18) % 1;
        const u = 1 - t;
        const x = (u * u * ax + 2 * u * t * bx + t * t * cx) * width;
        const y = (u * u * ay + 2 * u * t * by + t * t * cy) * height;
        const angle = Math.atan2((u * (by - ay) + t * (cy - by)) * height,
                                  (u * (bx - ax) + t * (cx - bx)) * width);
        pen.save();
        pen.translate(x, y);
        pen.rotate(angle);
        pen.fillStyle = '#e8be6d';
        pen.shadowColor = '#e8be6d';
        pen.shadowBlur = 12;
        pen.beginPath();
        pen.moveTo(10, 0); pen.lineTo(-5, -5); pen.lineTo(-2, 0); pen.lineTo(-5, 5);
        pen.closePath(); pen.fill();
        pen.restore();
      });
    }
    function frame(time) {
      draw(time);
      ticket = requestAnimationFrame(frame);
    }
    function syncScene() {
      cancelAnimationFrame(ticket);
      draw();
      if (visible && canAnimate()) ticket = requestAnimationFrame(frame);
    }
    new ResizeObserver(() => {
      ({width, height} = canvas.getBoundingClientRect());
      const density = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      pen.setTransform(density, 0, 0, density, 0, 0);
      syncScene();
    }).observe(canvas);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncScene();
    }).observe(canvas);
    reduced.addEventListener('change', syncScene);
    document.addEventListener('studio-motion', syncScene);
  }
}

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
