(function(){
  var v = document.getElementById('bflTour');
  if (!v) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { v.controls = true; return; }
  new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function(){ v.controls = true; }); }
      else v.pause();
    });
  }, { threshold: 0.4 }).observe(v);
})();
