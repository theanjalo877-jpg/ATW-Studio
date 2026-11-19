const stage = document.querySelector('#intro');
const replay = document.querySelector('#replay');
const motion = document.querySelector('#motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
const canAnimate = () => !paused && !reduced.matches;

{
  const canvas = stage.querySelector('.garage-effects');
  const photo = stage.querySelector('.stage-picture');
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
    const vehicles = Object.fromEntries([...stage.querySelectorAll('[data-vehicle]')]
      .map(image => [image.dataset.vehicle, image]));
    const cycle = 37;
    const clamp = value => Math.max(0, Math.min(1, value));
    const ease = value => value * value * (3 - 2 * value);
    const mix = (start, end, factor) => start + (end - start) * factor;
    let view, width, height, projection, ticket, elapsed = 0, previous = 0, visible = false;

    function refreshSize() {
      view = canvas.getBoundingClientRect();
      ({width, height} = view);
      const resolution = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * resolution);
      canvas.height = Math.round(height * resolution);
      pen.setTransform(resolution, 0, 0, resolution, 0, 0);
      const bounds = photo.getBoundingClientRect();
      const scale = Math.max(bounds.width / photo.naturalWidth, bounds.height / photo.naturalHeight);
      const iw = photo.naturalWidth * scale, ih = photo.naturalHeight * scale;
      const position = getComputedStyle(photo).objectPosition.split(' ').map(n => parseFloat(n) / 100);
      projection = {
        iw, ih,
        left: bounds.left - view.left + (bounds.width - iw) * position[0],
        top: bounds.top - view.top + (bounds.height - ih) * position[1],
      };
    }

    function project(u, v) {
      return [projection.left + u * projection.iw, projection.top + v * projection.ih];
    }

    function lamp(u, v, size, strength, color, aspect = 1) {
      const [x, y] = project(u, v);
      if (!Number.isFinite(x + y)) return;
      pen.save();
      pen.translate(x, y);
      pen.scale(aspect, 1);
      const aura = pen.createRadialGradient(0, 0, 0, 0, 0, size);
      aura.addColorStop(0, 'rgba(255,234,173,' + strength + ')');
      aura.addColorStop(.19, color + strength * .7 + ')');
      aura.addColorStop(1, color + '0)');
      pen.fillStyle = aura;
      pen.fillRect(-size, -size, size * 2, size * 2);
      pen.restore();
    }

    function beam(x, y, reach, spread, strength, drift) {
      const glow = pen.createLinearGradient(x, y, x + drift, y + reach);
      glow.addColorStop(0, 'rgba(247,235,203,' + strength + ')');
      glow.addColorStop(1, 'rgba(225,235,240,0)');
      pen.fillStyle = glow;
      pen.beginPath();
      pen.moveTo(x - 1, y);
      pen.lineTo(x + drift - spread, y + reach);
      pen.lineTo(x + drift + spread, y + reach);
      pen.lineTo(x + 1, y);
      pen.fill();
    }

    function groundGlow(x, y, radius, color) {
      pen.save();
      pen.translate(x, y);
      pen.scale(1, .22);
      const reflected = pen.createRadialGradient(0, 0, 0, 0, 0, radius);
      reflected.addColorStop(0, color);
      reflected.addColorStop(1, 'transparent');
      pen.fillStyle = reflected;
      pen.fillRect(-radius, -radius, radius * 2, radius * 2);
      pen.restore();
    }

    function highBeam(time) {
      const phase = (time + 5.4) % 8.8;
      const flash = Math.sin(Math.PI * clamp((phase - 1.0) / .56)) ** 2;
      const color = 'rgba(232,241,255,';
      for (const u of [.540, .550]) {
        const [x, y] = project(u, .674);
        beam(x, y, projection.ih * .32, projection.iw * .12, .095 * flash, (u - .545) * projection.iw * 7);
        lamp(u, .674, Math.max(6, projection.iw * .009), .20 + .64 * flash, color);
        groundGlow(x, y + projection.ih * .053, Math.max(12, projection.iw * .023), 'rgba(201,223,244,' + .13 * flash + ')');
      }
    }

    function haze(x, y, size, time) {
      for (let i = 0; i < 3; i++) {
        const age = (time * .38 + i / 3) % 1;
        const radius = size * (.12 + age * .17);
        const px = x + size * (.29 + age * .34), py = y - size * (.10 + age * .15);
        const puff = pen.createRadialGradient(px, py, 0, px, py, radius);
        puff.addColorStop(0, 'rgba(142,155,153,' + .102 * (1 - age) + ')');
        puff.addColorStop(1, 'rgba(142,155,153,0)');
        pen.fillStyle = puff;
        pen.fillRect(px - radius, py - radius, radius * 2, radius * 2);
      }
    }

    // Normalized coordinates measured on each cropped vehicle's lamp housings.
    const fittings = {
      parking: { lights:[[.091,.752],[.454,.748]], signal:[.067,.757], nose:-1 },
      approach: { lights:[[.184,.713],[.823,.713]], signal:[.866,.706], nose:0 },
      exit: { lights:[[.120,.784],[.866,.784]], signal:[.937,.783], nose:0 },
    };

    function vehicle(kind, u, v, fraction, opacity, time, moving, turning, flash = 0) {
      const image = vehicles[kind];
      if (!image.complete || !image.naturalWidth || opacity <= 0) return;
      const [x, y] = project(u, v);
      const w = projection.iw * fraction;
      const h = w * image.naturalHeight / image.naturalWidth;
      const left = x - w / 2, top = y - h;
      const fit = fittings[kind];
      const rear = kind === 'exit';
      const color = rear ? 'rgba(255,66,40,' : 'rgba(226,235,243,';
      function glow([a, b], radius, intensity, tint) {
        return lamp(u + w * (a - .5) / projection.iw, v - h * (1 - b) / projection.ih,
                    radius, intensity, tint, 1.25);
      }
      pen.save();
      pen.globalAlpha = opacity;
      groundGlow(x, y + 1, w * .68, '#000b');
      if (moving) haze(x, y, w, time);
      pen.filter = 'brightness(.69) saturate(.68)';
      pen.drawImage(image, left, top, w, h);
      pen.filter = 'none';
      fit.lights.forEach(([a,b]) => {
        const lightX = left + w * a, lightY = top + h * b;
        if (!rear) beam(lightX, lightY, h * (.61 + flash * .72), w * (.36 + flash * .35),
                        moving ? .075 + flash * .17 : .035, w * (fit.nose * .5 + a - .5));
        glow([a,b], Math.max(2, w * (.052 + flash * .04)), rear ? .55 : moving ? .49 + flash * .46 : .23, color);
        groundGlow(lightX, y + h * .105, w * (.34 + flash * .28), rear ? '#e13a231e' : 'rgba(216,231,245,' + (.13 + flash * .21) + ')');
      });
      if (turning && time % .82 < .36) {
        glow(fit.signal, Math.max(3, w * .066), .89, 'rgba(255,160,40,');
      }
      pen.restore();
    }

    function entranceFlash(time, start) {
      return Math.sin(Math.PI * clamp((time - start) / .58)) ** 2;
    }

    function traffic(time) {
      highBeam(time);
      const resetFade = 1 - ease(clamp((time - 35.5) / 1.5));
      if (time >= 2.4) {
        const p = ease(clamp((time - 2.4) / 9.8));
        vehicle('parking', mix(.581, .452, p), mix(.696, .808, p), mix(.023, .126, p),
                ease(clamp((time - 2.4) / 2)) * resetFade, time, p < 1, p > .04 && p < .94, entranceFlash(time, 3.25));
      }
      if (time >= 11.5) {
        const p = ease(clamp((time - 11.5) / 12.1));
        vehicle('approach', mix(.634, width < 580 ? .67 : .745, p), mix(.701, .944, p), mix(.022, .165, p),
                ease(clamp((time - 11.5) / 2)) * resetFade, time, p < 1, p > .12 && p < .42, entranceFlash(time, 12.5));
      }
      if (time >= 23.8) {
        const p = ease(clamp((time - 23.8) / 12));
        vehicle('exit', mix(.499, .609, p), mix(1.25, .683, p), mix(.31, .014, p),
                (1 - ease(clamp((p - .84) / .16))) * resetFade, time, true, p > .31 && p < .78);
      }
    }

    function weld() {
      const time = elapsed % cycle;
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
      const pulse = elapsed % 1.4;
      if (pulse < .47) {
        const amber = 'rgba(255,162,44,';
        lamp(.841, .679, 23, .83, amber, 1.4);
        lamp(.932, .693, 18, .68, amber, 1.6);
        lamp(.871, .885, 32, .23, amber, 2.2);
      }
      const voltage = .33 + Math.sin(elapsed * 2.1) * .16 + Math.sin(elapsed * 4.6) * .06;
      lamp(.949, .11, 38, voltage, 'rgba(255,184,87,', 1.7);
      lamp(.852, .295, 34, voltage * .85, 'rgba(255,184,87,', 1.4);
      lamp(.765, .46, 30, voltage * .68, 'rgba(255,184,87,', 1.5);
      lamp(.622, .25, 55, voltage * .35, 'rgba(107,151,187,', 2.0);
      traffic(elapsed % cycle);
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
      ticket = requestAnimationFrame(frame);
    }

    function syncGarage() {
      cancelAnimationFrame(ticket);
      previous = 0;
      if (!canAnimate()) {
        stage.classList.remove('garage-live');
        pen.clearRect(0, 0, width, height);
      } else if (visible && photo.complete && photo.naturalWidth) {
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
      motion.textContent = paused ? 'Resume motion' : 'Pause motion';
      replay.disabled = paused;
      document.body.classList.toggle('motion-paused', !canAnimate());
      syncGarage();
      document.dispatchEvent(new Event('studio-motion'));
    }
    photo.decode().then(() => {refreshSize(); syncMotion();}).catch(() => {});
    motion.addEventListener('click', () => {paused = !paused; syncMotion();});
    replay.addEventListener('click', () => {elapsed = 0; sparks.length = 0; syncGarage();});
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
