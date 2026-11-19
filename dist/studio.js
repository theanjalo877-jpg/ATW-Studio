const stage = document.querySelector('#intro');
const replay = document.querySelector('#replay');
const motion = document.querySelector('#motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
const canAnimate = () => !paused && !reduced.matches;

{
  const canvas = stage.querySelector('.garage-effects');
  const video = stage.querySelector('.stage-video');
  const lightBed = stage.querySelector('.depot-light-bed');
  const pen = canvas.getContext('2d');
  if (pen) {
    const mark = stage.querySelector('.monogram');
    const title = stage.querySelector('.name');
    function splitText(container) {
      for (const node of [...container.childNodes]) {
        if (node.nodeType !== Node.TEXT_NODE) continue;
        node.replaceWith(...Array.from(node.textContent, char => {
          const letter = document.createElement('span');
          letter.className = 'weld-letter';
          letter.textContent = char;
          return letter;
        }));
      }
      return [...container.querySelectorAll('.weld-letter')];
    }
    title.querySelectorAll(':scope > span').forEach(splitText);
    const names = [...title.querySelectorAll('.weld-letter')];
    const initials = splitText(mark);
    const sparks = [];
    let view, width, height, ticket, stalled, elapsed = 0, previous = 0, visible = false;
    let needsPlay = false;

    function refreshSize() {
      view = canvas.getBoundingClientRect();
      ({width, height} = view);
      // Match the video’s cover crop so the glow stays on the fixture.
      const videoHeight = video.clientHeight;
      const pictureWidth = Math.max(width, videoHeight * 16 / 9);
      const pictureHeight = pictureWidth * 9 / 16;
      const horizontalAnchor = parseFloat(getComputedStyle(video).objectPosition) / 100;
      lightBed.style.width = pictureWidth + 'px';
      lightBed.style.height = pictureHeight + 'px';
      lightBed.style.left = (width - pictureWidth) * horizontalAnchor + 'px';
      lightBed.style.top = video.offsetTop + (videoHeight - pictureHeight) / 2 + 'px';
      const resolution = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * resolution);
      canvas.height = Math.round(height * resolution);
      pen.setTransform(resolution, 0, 0, resolution, 0, 0);
    }

    function weld() {
      const time = elapsed;
      const showName = time < 7.4;
      stage.dataset.title = showName ? 'name' : 'mark';
      const letters = showName ? names : initials;
      const progress = (showName ? time : time - 7.4) / (showName ? .146 : .52);
      const active = letters[Math.floor(progress)];
      letters.forEach((letter, index) => {
        letter.style.setProperty('--weld', Math.max(0, Math.min(1, progress - index)));
        letter.classList.toggle('hot', letter === active);
      });
      if (!active || !active.textContent.trim() || sparks.length > 95) return;
      const bounds = active.getBoundingClientRect();
      const x = bounds.left - view.left + bounds.width * (progress % 1);
      const y = bounds.top - view.top + bounds.height * (.43 + Math.sin(progress * 7) * .16);
      for (let index = 0; index < 3; index++) {
        sparks.push({x, y, dx:(Math.random() - .48) * 460, dy:-60 - Math.random() * 240, life:.16 + Math.random() * .38});
      }
      pen.fillStyle = '#ffeed0';
      pen.shadowColor = '#ff9933';
      pen.shadowBlur = 15;
      pen.fillRect(x - 1, y - 1, 3, 3);
      pen.shadowBlur = 0;
    }

    function frame(now) {
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
      previous = now;
      elapsed += dt;
      pen.clearRect(0, 0, width, height);
      weld();
      for (let index = sparks.length - 1; index >= 0; index--) {
        const spark = sparks[index];
        spark.life -= dt;
        if (spark.life <= 0) { sparks.splice(index, 1); continue; }
        spark.dy += dt * 780;
        spark.x += spark.dx * dt;
        spark.y += spark.dy * dt;
        pen.strokeStyle = 'rgba(255,184,75,' + Math.min(1, spark.life * 3) + ')';
        pen.beginPath();
        pen.moveTo(spark.x, spark.y);
        pen.lineTo(spark.x - spark.dx * .015, spark.y - spark.dy * .015);
        pen.stroke();
      }
      if (elapsed < 10.5 || sparks.length) ticket = requestAnimationFrame(frame);
    }

    function showPlayButton() {
      needsPlay = true;
      motion.textContent = 'Play intro';
      replay.disabled = true;
    }

    function syncGarage() {
      cancelAnimationFrame(ticket);
      previous = 0;
      if (!canAnimate() || !visible || document.hidden) {
        clearTimeout(stalled);
        video.pause();
        if (reduced.matches) video.classList.remove('is-playing');
        stage.classList.remove('garage-live');
        pen.clearRect(0, 0, width, height);
      } else {
        video.muted = true;
        video.play().catch(error => {
          if (error.name !== 'AbortError' && canAnimate() && visible && !document.hidden) showPlayButton();
        });
        stage.classList.add('garage-live');
        ticket = requestAnimationFrame(frame);
      }
    }

    new ResizeObserver(refreshSize).observe(canvas);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      refreshSize();
      syncGarage();
    }).observe(stage);
    function syncMotion() {
      motion.hidden = replay.hidden = reduced.matches;
      motion.textContent = needsPlay ? 'Play intro' : paused ? 'Resume motion' : 'Pause motion';
      replay.disabled = paused || needsPlay;
      document.body.classList.toggle('motion-paused', !canAnimate());
      syncGarage();
      document.dispatchEvent(new Event('studio-motion'));
    }
    video.addEventListener('playing', () => {
      clearTimeout(stalled);
      needsPlay = false;
      video.classList.add('is-playing');
      motion.textContent = 'Pause motion';
      replay.disabled = false;
    });
    video.addEventListener('waiting', () => {
      clearTimeout(stalled);
      if (canAnimate() && visible) stalled = setTimeout(showPlayButton, 5000);
    });
    video.addEventListener('error', () => {
      video.classList.remove('is-playing');
      showPlayButton();
    });
    document.addEventListener('visibilitychange', syncGarage);
    syncMotion();
    motion.addEventListener('click', () => {
      if (needsPlay) {
        needsPlay = false;
        paused = false;
        if (video.error) video.load();
      } else {
        paused = !paused;
      }
      syncMotion();
    });
    replay.addEventListener('click', () => {elapsed = 0; sparks.length = 0; video.currentTime = 0; syncGarage();});
    reduced.addEventListener('change', syncMotion);
  }
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
