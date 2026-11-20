const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const sections = [...document.querySelectorAll('.sequence')].map(section => ({
  section,
  stage: section.querySelector('.stage'),
  canvas: section.querySelector('canvas'),
  count: Number(section.dataset.count),
  shot: section.dataset.shot,
  frames: new Map(),
  drawn: -1,
}));
let lenis;
function configureMotion() {
  lenis?.destroy();
  lenis = !reduce.matches && window.Lenis ? new Lenis({lerp:.11, anchors:true, autoRaf:true}) : null;
  for (const entry of sections) {
    entry.drawn = -1;
    delete entry.stage.dataset.frame;
    entry.stage.style.removeProperty('--p');
  }
}
function load(entry, index) {
  if (index < 0 || index >= entry.count || entry.frames.has(index)) return;
  const image = new Image();
  entry.frames.set(index, image);
  const path = `frames/${entry.shot}/${String(index).padStart(3,'0')}.webp`;
  image.src = window.emiratiFrames?.[path] || path;
}
function update() {
  requestAnimationFrame(update);
  if (reduce.matches) return;
  const height = innerHeight;
  for (const entry of sections) {
    const rect = entry.section.getBoundingClientRect();
    if (rect.bottom < -height || rect.top > height * 2.2) {
      entry.frames.clear();
      continue;
    }
    const p = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - entry.stage.clientHeight)));
    const index = Math.round(p * (entry.count - 1));
    entry.stage.style.setProperty('--p', p.toFixed(4));
    for (const oldIndex of entry.frames.keys()) {
      if (Math.abs(oldIndex - index) > 11) entry.frames.delete(oldIndex);
    }
    load(entry, index);
    for (let offset=1;offset<=7;offset++) {
      load(entry,index+offset);
      load(entry,index-offset);
    }
    const image = entry.frames.get(index);
    if (entry.drawn === index || !image?.complete || !image.naturalWidth) continue;
    const {canvas} = entry;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image,0,0);
    entry.drawn = index;
    entry.stage.dataset.frame = String(index);
  }
}
reduce.addEventListener('change', configureMotion);
configureMotion();
requestAnimationFrame(update);
const dialog = document.querySelector('dialog');
const interest = document.querySelector('#interest');
const status = document.querySelector('#status');
document.querySelector('#waitlist').addEventListener('click', () => dialog.showModal());
interest.addEventListener('submit', event => {
  event.preventDefault();
  try {
    localStorage.setItem('atw-emirati-interest', interest.email.value.trim());
    status.textContent = 'Interest saved on this device.';
    interest.reset();
  } catch {
    status.textContent = 'This browser prevents local saving.';
  }
});
