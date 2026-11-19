const stage = document.querySelector('#intro');
const replay = document.querySelector('#replay');
const mark = stage.querySelector('.monogram');
const letter = mark.querySelector('.final-letter');
const baseline = mark.querySelector('.baseline');
const lean = stage.querySelector('.lean');
const panel = stage.querySelector('.power-screen');
const frames = new Map([...stage.querySelectorAll('[data-pose]')].map(image => [image.dataset.pose, image]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const context = document.createElement('canvas').getContext('2d');
const poses = ['step-a', 'step-b', 'step-c', 'step-d'];
const ease = value => value * value * (3 - 2 * value);
let animation = 0;
let currentPose;
let ready = false;
let geometry;

function length(name, value) {
  stage.style.setProperty(name, value + 'px');
}

function measure() {
  const leanWidth = lean.offsetWidth;
  const imageHeight = lean.offsetHeight;
  const floor = stage.clientHeight - parseFloat(getComputedStyle(stage).getPropertyValue('--floor'));
  const font = getComputedStyle(mark);
  const size = parseFloat(font.fontSize);
  context.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
  const glyph = context.measureText('W');
  const edge = mark.offsetLeft + letter.offsetLeft + glyph.actualBoundingBoxRight - size * .075;
  const leanX = Math.max(0, Math.min(edge - leanWidth * .045, stage.clientWidth - leanWidth));
  const armY = floor - imageHeight * .72;
  length('--lean-x', leanX);
  length('--mark-y', armY + glyph.actualBoundingBoxAscent - baseline.offsetTop + mark.offsetHeight / 2);
  const screen = panel.offsetLeft + panel.offsetWidth - 19;
  const press = frames.get('press');
  const pressX = screen - press.offsetWidth * .1815;
  const fingerY = floor - imageHeight * .7715;
  length('--key-y', fingerY - panel.offsetTop);
  geometry = { leanX, leanWidth, pressX, startX: pressX + Math.min(128, stage.clientWidth * .16) };
  if (!stage.classList.contains('playing') || stage.dataset.phase === 'finish') shadow(leanX, leanWidth, .69);
}

function shadow(x, width, foot = .62) {
  length('--shadow-x', x + width * foot);
  length('--shadow-width', width * .48);
}

function render(phase, pose, x) {
  stage.dataset.phase = phase;
  if (currentPose !== pose) {
    frames.get(currentPose)?.classList.remove('active');
    frames.get(pose)?.classList.add('active');
    currentPose = pose;
  }
  if (pose) {
    length('--actor-x', x);
    shadow(x, frames.get(pose).offsetWidth);
  } else {
    shadow(geometry.leanX, geometry.leanWidth, .69);
  }
}

function playIntro() {
  if (!ready || reduced.matches) return;
  cancelAnimationFrame(animation);
  stage.classList.add('playing');
  const started = performance.now();
  function tick(now) {
    const ms = now - started;
    const { startX, pressX, leanX } = geometry;
    if (ms < 2050) {
      const progress = Math.min(ms / 1950, 1);
      const cadence = Math.min(7, Math.floor(ms / 238));
      render('walk', poses[cadence % poses.length], startX + (pressX - startX) * progress);
    } else if (ms < 2670) {
      render('arrive', 'stop', pressX);
    } else if (ms < 3250) {
      render('press', 'press', pressX);
    } else if (ms < 6420) {
      render('reveal', ms < 3850 ? 'press' : 'stop', pressX);
    } else if (ms < 7010) {
      const progress = ease((ms - 6420) / 590);
      render('settle', 'stop', pressX + (leanX - pressX) * progress);
    } else {
      render('finish');
      return;
    }
    animation = requestAnimationFrame(tick);
  }
  animation = requestAnimationFrame(tick);
}

function syncMotion() {
  replay.hidden = reduced.matches || !ready;
  if (!reduced.matches) return;
  cancelAnimationFrame(animation);
  stage.classList.remove('playing');
  delete stage.dataset.phase;
  if (geometry) render('static');
}

new ResizeObserver(measure).observe(stage);
document.fonts.ready.then(measure);
replay.addEventListener('click', playIntro);
reduced.addEventListener('change', syncMotion);
syncMotion();

Promise.allSettled([lean, ...frames.values()].map(image => image.decode())).then(results => {
  ready = results.every(result => result.status === 'fulfilled');
  measure();
  syncMotion();
  playIntro();
});
