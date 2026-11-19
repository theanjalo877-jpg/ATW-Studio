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
      if (visible && !reduced.matches) ticket = requestAnimationFrame(frame);
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
  }
}
