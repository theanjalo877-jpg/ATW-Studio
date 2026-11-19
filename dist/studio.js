const stage = document.querySelector('#intro');
const replay = document.querySelector('#replay');
const mark = stage.querySelector('.monogram');
const letter = mark.querySelector('.final-letter');
const baseline = mark.querySelector('.baseline');
const lean = stage.querySelector('.lean');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const context = document.createElement('canvas').getContext('2d');
let transition;

function length(name, value) {
  stage.style.setProperty(name, value + 'px');
}

function measure() {
  const leanWidth = lean.offsetWidth;
  const floor = stage.clientHeight - parseFloat(getComputedStyle(stage).getPropertyValue('--floor'));
  const font = getComputedStyle(mark);
  const size = parseFloat(font.fontSize);
  context.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
  const glyph = context.measureText('W');
  const edge = mark.offsetLeft + letter.offsetLeft + glyph.actualBoundingBoxRight - size * .075;
  const leanX = Math.max(0, Math.min(edge - leanWidth * .045, stage.clientWidth - leanWidth));
  const armY = floor - lean.offsetHeight * .72;
  length('--lean-x', leanX);
  length('--mark-y', armY + glyph.actualBoundingBoxAscent - baseline.offsetTop + mark.offsetHeight / 2);
  length('--shadow-x', leanX + leanWidth * .69);
  length('--shadow-width', leanWidth * .48);
}

function reveal() {
  clearTimeout(transition);
  stage.dataset.phase = 'reveal';
  replay.textContent = 'Replay intro';
  transition = setTimeout(() => {
    stage.dataset.phase = 'finish';
  }, 1850);
}

function syncMotion() {
  clearTimeout(transition);
  delete stage.dataset.phase;
  replay.hidden = reduced.matches;
  replay.textContent = 'Light up name';
}

new ResizeObserver(measure).observe(stage);
document.fonts.ready.then(measure);
lean.addEventListener('load', measure);
replay.addEventListener('click', reveal);
reduced.addEventListener('change', syncMotion);
syncMotion();
