/* TXL Studio — premium interactions. Loaded (deferred) after js/site3d.js.
   Every feature is isolated and skipped under prefers-reduced-motion where it moves things. */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var doc = document.documentElement;

  /* ---------- Cursor spotlight on cards ---------- */
  function initSpotlight(){
    if (!finePointer || reduce) return;
    var SEL = '.pillar, .cat-card, .post-card, .report-card, .addons-box, .check-item, .stack-item, .shot-frame, .wf-card, .next-steps, .glance';
    var cards = document.querySelectorAll(SEL);
    if (!cards.length) return;
    cards.forEach(function(c){ c.classList.add('spot'); });
    var current = null, raf = 0, lx = 0, ly = 0;
    function paint(){
      raf = 0;
      if (!current) return;
      var r = current.getBoundingClientRect();
      current.style.setProperty('--mx', (lx - r.left) + 'px');
      current.style.setProperty('--my', (ly - r.top) + 'px');
    }
    document.addEventListener('pointermove', function(e){
      var el = e.target.closest ? e.target.closest('.spot') : null;
      if (el !== current){
        if (current) current.classList.remove('is-lit');
        current = el;
        if (current) current.classList.add('is-lit');
      }
      if (current){ lx = e.clientX; ly = e.clientY; if (!raf) raf = requestAnimationFrame(paint); }
    }, { passive: true });
    document.addEventListener('pointerleave', function(){ if (current){ current.classList.remove('is-lit'); current = null; } });
  }

  /* ---------- Magnetic primary buttons ---------- */
  function initMagnetic(){
    if (!finePointer || reduce) return;
    var btns = document.querySelectorAll('.btn-primary, .nav-cta');
    btns.forEach(function(b){
      b.addEventListener('pointermove', function(e){
        var r = b.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / r.width;
        var y = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.setProperty('--tx', (x * 10).toFixed(1) + 'px');
        b.style.setProperty('--ty', (y * 8).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function(){ b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    });
  }

  /* ---------- Scroll progress + hero parallax (native scrolling is left untouched: it stays on the compositor thread) ---------- */
  function initScroll(){
    var bar = document.createElement('div');
    bar.className = 'txl-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var hero = document.querySelector('header.hero');
    var ticking = false, onBar = false;

    // Write transforms straight onto the two elements that move. (Updating a CSS variable on a parent
    // forces a style recalculation of everything inside it on every scroll frame, which was costly.)
    function frame(){
      ticking = false;
      var y = window.scrollY;
      var max = Math.max(1, doc.scrollHeight - window.innerHeight);
      bar.style.transform = 'scaleX(' + Math.min(1, y / max).toFixed(4) + ')';
      var show = y > 24;
      if (show !== onBar){ onBar = show; bar.classList.toggle('on', show); }
    }
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    window.addEventListener('resize', frame);
    frame();
  }

  /* ---------- Browser frames: show what each screenshot is ---------- */
  function initFrames(){
    document.querySelectorAll('.shot-frame').forEach(function(f){
      var bar = f.querySelector('.bar');
      if (!bar || bar.hasAttribute('data-url')) return;
      var media = f.querySelector('img, video');
      var src = media ? (media.getAttribute('src') || media.getAttribute('poster') || (media.querySelector('source') && media.querySelector('source').getAttribute('src')) || '') : '';
      var label = /basefragrances/.test(src) ? 'basefragrances.com' : /bflinfra/.test(src) ? 'bfl-infra (concept)' : /aegis/.test(src) ? 'txlstudio.vercel.app/aegis' : '';
      if (label) bar.setAttribute('data-url', label);
    });
  }

  /* ---------- Mobile action bar (replaces the floating WhatsApp pill) ---------- */
  function initCtaBar(){
    if (/contact|onboarding|privacy|terms|blog/.test(location.pathname)) return;
    var bar = document.createElement('div');
    bar.className = 'txl-cta-bar';
    bar.innerHTML =
      '<a class="cb-main" href="contact.html">Start a project &rarr;</a>' +
      '<a class="cb-wa" href="https://wa.me/918374367150?text=Hi%2C%20I%27d%20like%20to%20talk%20about%20a%20project" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg></a>';
    document.body.appendChild(bar);
    document.body.classList.add('has-cta-bar');
    var footer = document.querySelector('footer');
    var footerVisible = false;
    function update(){ bar.classList.toggle('show', window.scrollY > 520 && !footerVisible); }
    window.addEventListener('scroll', update, { passive: true });
    if (footer && 'IntersectionObserver' in window){
      new IntersectionObserver(function(en){ footerVisible = en[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(footer);
    }
    update();
  }

  function initAll(){
    [initSpotlight, initMagnetic, initScroll, initFrames, initCtaBar].forEach(function(fn){
      try { fn(); } catch (e) { if (window.console) console.warn('[txl] ' + (fn.name || 'premium') + ' skipped:', e && e.message); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
