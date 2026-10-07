(function(){
  var track = document.querySelector('.process-track');
  if (!track || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var steps = Array.prototype.slice.call(track.querySelectorAll('.process-step'));
  track.classList.add('armed');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) en.target.classList.add('lit');
      else if (en.boundingClientRect.top > 0) en.target.classList.remove('lit');
    });
  }, { rootMargin: '0px 0px -30% 0px', threshold: 0.01 });
  steps.forEach(function(st){ io.observe(st); });
})();
