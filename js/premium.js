/* TXL Studio — premium interactions. Loaded (deferred) after js/site3d.js.
   Every feature is isolated and skipped under prefers-reduced-motion where it moves things. */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var doc = document.documentElement;

  /* ---------- Cursor spotlight on cards ---------- */
  function initSpotlight(){
    if (!finePointer || reduce) return;
    var SEL = '.pillar, .cat-card, .post-card, .report-card, .addons-box, .check-item, .stack-item, .shot-frame';
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
      if (hero && !reduce){
        var stage = hero.querySelector('.hero-stage');
        if (stage && y < 1100) stage.style.transform = 'translate3d(0,' + (y * 0.2).toFixed(1) + 'px,0)';
      }
    }
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    window.addEventListener('resize', frame);
    frame();
  }

  /* ---------- Hero: a real 3D TXL monogram that follows the cursor ---------- */
  function initHeroObject(){
    var hero = document.querySelector('header.hero');
    var T = window.THREE;
    if (!hero || !T || !window.WebGLRenderingContext || window.innerWidth < 1000) return;

    var stage = document.createElement('div');
    stage.className = 'hero-stage';
    stage.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    hero.querySelector('.wrap').insertBefore(stage, hero.querySelector('.wrap').firstChild);

    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (e) { stage.remove(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.2, 15);

    // Studio environment: a few soft emissive panels baked into a PMREM, so metal has something to reflect.
    var pm = new T.PMREMGenerator(renderer);
    var env = new T.Scene();
    env.background = new T.Color(0x07080a);
    function panel(w, h, x, y, z, c){
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    panel(16, 7, 0, 9, 4, new T.Color(5, 5, 5.3));          // key softbox above/front
    panel(6, 14, -10, 1, 4, new T.Color(0.7, 1.8, 1.5));       // teal strip, left
    panel(6, 14, 10, 1, 3, new T.Color(2.0, 1.15, 0.9));      // orange strip, right (kept soft so the steel stays steel)
    panel(18, 4, 0, -8, 4, new T.Color(0.9, 0.95, 1.1));      // soft floor bounce
    panel(10, 10, 0, 2, -10, new T.Color(0.5, 0.55, 0.7));    // back fill
    panel(14, 5, -3, 6, 14, new T.Color(2.4, 2.4, 2.6));      // front-upper softbox: what flat faces reflect
    panel(12, 4, 4, -3, 14, new T.Color(0.55, 0.5, 0.48));    // front-lower fill, warm
    scene.environment = pm.fromScene(env, 0.035).texture;
    pm.dispose();

    // Block letters T, X, L from simple polygons, extruded and bevelled.
    function poly(pts){ var s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }
    var SHAPES = {
      T: poly([[0,2],[2,2],[2,1.4],[1.3,1.4],[1.3,0],[0.7,0],[0.7,1.4],[0,1.4]]),
      X: poly([[0,2],[0.66,2],[1.1,1.28],[1.54,2],[2.2,2],[1.44,1],[2.2,0],[1.54,0],[1.1,0.72],[0.66,0],[0,0],[0.76,1]]),
      L: poly([[0,2],[0.6,2],[0.6,0.6],[1.8,0.6],[1.8,0],[0,0]])
    };
    // Translucent glass: cheap alpha blending (not physical transmission, which costs a whole extra render pass).
    // Both faces draw without writing depth, so the glow and particles behind show through; thin edge lines keep the shapes crisp.
    function glass(color, opacity, emissive){
      return new T.MeshStandardMaterial({ color: color, metalness: 0.15, roughness: 0.12, transparent: true, opacity: opacity,
        side: T.DoubleSide, depthWrite: false, emissive: emissive, envMapIntensity: 1.4 });
    }
    var glassLight = glass(0xdfe8f5, 0.2, 0x0b1018);
    var glassOrange = glass(0xff6a3c, 0.3, 0x4a1305);
    var logo = new T.Group();
    var x0 = 0, widths = { T: 2, X: 2.2, L: 1.8 };
    ['T', 'X', 'L'].forEach(function(k){
      var geo = new T.ExtrudeGeometry(SHAPES[k], { depth: 0.55, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 2, curveSegments: 4 });
      var isX = k === 'X';
      var g = new T.Group();
      g.add(new T.Mesh(geo, isX ? glassOrange : glassLight));
      g.add(new T.LineSegments(new T.EdgesGeometry(geo, 28), new T.LineBasicMaterial({ color: isX ? 0xff8a5c : 0xe6edf7, transparent: true, opacity: isX ? 0.95 : 0.75 })));
      g.position.set(x0, -1, -0.27);
      logo.add(g);
      x0 += widths[k] + 0.4;
    });
    logo.position.x = -(x0 - 0.4) / 2 + 0.25;
    var key = new T.DirectionalLight(0xffffff, 0.8); key.position.set(-4, 6, 9); scene.add(key);
    var rim = new T.PointLight(0xe8582f, 14, 30); rim.position.set(7, 1, 5); scene.add(rim);
    var rim2 = new T.PointLight(0x14b88a, 8, 30); rim2.position.set(-8, -2, 4); scene.add(rim2);
    var holder = new T.Group();
    holder.add(logo);
    holder.scale.setScalar(1);
    scene.add(holder);

    var dust = (function(){
      var n = 70, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++){ pos[i*3] = (Math.random() - .5) * 14; pos[i*3+1] = (Math.random() - .5) * 8; pos[i*3+2] = (Math.random() - .5) * 6 - 1; }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var p = new T.Points(g, new T.PointsMaterial({ color: 0xffb08f, size: 0.045, transparent: true, opacity: 0.55, depthWrite: false }));
      scene.add(p); return p;
    })();

    function resize(){
      var w = stage.clientWidth || 480, h = stage.clientHeight || 520;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = 32;
      // fit the ~6.8-unit-wide monogram (plus swing room) to ~80% of the canvas width
      var halfW = 3.4 * holder.scale.x * 1.5;
      camera.position.z = Math.max(12, halfW / (Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    var mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0, clock = new T.Clock();
    window.addEventListener('pointermove', function(e){
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    function draw(){
      raf = 0;
      var t = clock.getElapsedTime();
      tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;
      var sy = Math.min(window.scrollY, 900);
      holder.rotation.y = (reduce ? 0.2 : Math.sin(t * 0.42) * 0.32) + tx * 0.5 + sy * 0.0012;
      holder.rotation.x = (reduce ? 0 : Math.sin(t * 0.33) * 0.05) + ty * 0.2;
      holder.position.y = reduce ? 0 : Math.sin(t * 0.8) * 0.12;
      dust.rotation.y = t * 0.02 + tx * 0.05;
      renderer.render(scene, camera);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(draw);
    }
    draw();
    requestAnimationFrame(function(){ stage.classList.add('ready'); });

    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(en){
        visible = en[0].isIntersecting;
        if (visible && !raf && !reduce) raf = requestAnimationFrame(draw);
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function(){ if (!document.hidden && !raf && !reduce) raf = requestAnimationFrame(draw); });
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
    [initSpotlight, initMagnetic, initScroll, initHeroObject, initFrames, initCtaBar].forEach(function(fn){
      try { fn(); } catch (e) { if (window.console) console.warn('[txl] ' + (fn.name || 'premium') + ' skipped:', e && e.message); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
