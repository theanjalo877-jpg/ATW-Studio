(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = document.querySelectorAll(
    '.portfolio main > section, .meridian main > section:not(.sequence)'
  );
  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (!isIntersecting) continue;
      target.dataset.maisonReveal = 'visible';
      observer.unobserve(target);
    }
  }, {rootMargin:'0px 0px -5% 0px'});
  for (const item of items) {
    if (item.getBoundingClientRect().top < innerHeight * .93) continue;
    item.dataset.maisonReveal = '';
    observer.observe(item);
  }
})();
