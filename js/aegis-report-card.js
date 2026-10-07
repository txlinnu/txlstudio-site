(function(){
  var card = document.getElementById('reportCard');
  if (!card) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  var ring = document.getElementById('ringFg');
  var num = document.getElementById('scoreNum');
  var FULL = 213.63, FINAL = 34.18, TARGET = 84;
  ring.style.strokeDashoffset = FULL;
  num.textContent = '0';
  card.classList.add('armed');
  var played = false;
  new IntersectionObserver(function(entries, obs){
    if (!entries[0].isIntersecting || played) return;
    played = true; obs.disconnect();
    card.classList.add('play');
    ring.style.strokeDashoffset = FINAL;
    var start = performance.now(), dur = 1400;
    (function tick(now){
      var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(TARGET * e);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }, { threshold: 0.35 }).observe(card);
})();
