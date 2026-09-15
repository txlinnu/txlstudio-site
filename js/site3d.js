/* TXL Studio — ambient 3D background + tilt interactions */
(function(){
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Ambient WebGL background ---------- */
  function initBackground(){
    if (reduceMotion || !window.THREE) return;
    var canvas = document.getElementById('bg3d');
    if (!canvas) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0c0f, 14, 46);
    var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 22;

    var cOrange = new THREE.Color(0xe8582f);
    var cTeal = new THREE.Color(0x14b88a);

    // Soft radial sprite for glowing points (nicer than flat square dots)
    function makeGlowTexture(){
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var ctx = c.getContext('2d');
      var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      var tex = new THREE.CanvasTexture(c);
      return tex;
    }
    var glowTex = makeGlowTexture();

    // Particle field
    var particleCount = 220;
    var positions = new Float32Array(particleCount * 3);
    var colors = new Float32Array(particleCount * 3);
    var sizes = new Float32Array(particleCount);
    for (var i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 36 - 6;
      var c = Math.random() > 0.5 ? cOrange : cTeal;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      sizes[i] = 0.35 + Math.random() * 0.55;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    var mat = new THREE.PointsMaterial({
      size: 0.5, vertexColors: true, transparent: true, opacity: 0.8,
      map: glowTex, alphaMap: glowTex, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var points = new THREE.Points(geo, mat);
    scene.add(points);

    // Floating wireframe polyhedra with a soft glowing core
    var shapes = [];
    function wire(geometry, color, x, y, z, opacity, coreScale){
      var group = new THREE.Group();
      var m = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity || 0.34 });
      var mesh = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), m);
      group.add(mesh);

      var core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: color, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      core.scale.setScalar(coreScale || 8);
      group.add(core);

      group.position.set(x, y, z);
      scene.add(group);
      var entry = { group: group, mesh: mesh, core: core, baseCore: core.scale.x, phase: Math.random() * Math.PI * 2 };
      shapes.push(entry);
      return entry;
    }
    var shape1 = wire(new THREE.IcosahedronGeometry(5, 1), 0xe8582f, 15, 6, -12, 0.4, 7);
    var shape2 = wire(new THREE.TorusKnotGeometry(3, 0.85, 140, 20), 0x14b88a, -16, -7, -16, 0.3, 6);
    var shape3 = wire(new THREE.OctahedronGeometry(3.2, 1), 0xe8582f, -13, 9, -8, 0.32, 5.5);

    var targetX = 0, targetY = 0;
    window.addEventListener('mousemove', function(e){
      targetX = (e.clientX / window.innerWidth) - 0.5;
      targetY = (e.clientY / window.innerHeight) - 0.5;
    }, { passive: true });

    window.addEventListener('resize', function(){
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var running = true;
    document.addEventListener('visibilitychange', function(){ running = !document.hidden; });

    var spins = [
      { x: 0.0022, y: 0.0016 },
      { x: 0.0016, y: -0.0022 },
      { x: -0.0011, y: 0.0019 }
    ];
    var clock = new THREE.Clock();

    function animate(){
      requestAnimationFrame(animate);
      if (!running) return;
      var t = clock.getElapsedTime();

      points.rotation.y += 0.0007;
      points.rotation.x += 0.0002;

      shapes.forEach(function(s, idx){
        var spin = spins[idx];
        s.group.rotation.x += spin.x;
        s.group.rotation.y += spin.y;
        var pulse = 1 + Math.sin(t * 0.6 + s.phase) * 0.12;
        s.core.scale.setScalar(s.baseCore * pulse);
      });

      camera.position.x += (targetX * 4 - camera.position.x) * 0.02;
      camera.position.y += (-targetY * 3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();
  }

  /* ---------- Pointer-driven tilt on cards / frames ---------- */
  function initTilt(){
    if (reduceMotion) return;
    var els = document.querySelectorAll('.tilt');
    els.forEach(function(el){
      var strength = parseFloat(el.getAttribute('data-tilt-strength')) || 1;
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        var rx = (-py * 8 * strength).toFixed(2);
        var ry = (px * 10 * strength).toFixed(2);
        el.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(6px)';
      });
      el.addEventListener('mouseleave', function(){
        el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      });
    });
  }

  /* ---------- Draggable 3D work carousel ---------- */
  function initCarousel(){
    var stage = document.getElementById('carouselStage');
    var ring = document.getElementById('carouselRing');
    if (!stage || !ring) return;

    var rotation = 0;
    var isDragging = false;
    var moved = false;
    var startX = 0;
    var startRotation = 0;
    var idleTimer = null;
    var autoRAF = null;
    var autoRotateEnabled = !reduceMotion;
    var radius = 340;
    var cardCount = ring.querySelectorAll('.carousel3d-card').length || 3;
    var stepAngle = 360 / cardCount;
    ring.style.setProperty('--step', stepAngle + 'deg');

    function readRadius(){
      var v = parseFloat(getComputedStyle(ring).getPropertyValue('--radius'));
      radius = isNaN(v) ? 340 : v;
    }
    readRadius();
    window.addEventListener('resize', readRadius);

    // Shift the whole ring back by its own radius so the front-facing card
    // lands at true 1:1 scale instead of being magnified (and blurred) by
    // the perspective projection pushing it toward the camera.
    function setRotation(deg, withTransition){
      ring.classList.toggle('no-transition', !withTransition);
      ring.style.transform = 'translateZ(-' + radius + 'px) rotateY(' + deg + 'deg)';
    }

    function stopAutoRotate(){
      if (autoRAF) cancelAnimationFrame(autoRAF);
      autoRAF = null;
    }

    function startAutoRotate(){
      if (!autoRotateEnabled) return;
      stopAutoRotate();
      function step(){
        rotation += 0.09;
        setRotation(rotation, false);
        autoRAF = requestAnimationFrame(step);
      }
      autoRAF = requestAnimationFrame(step);
    }

    function scheduleIdle(delay){
      clearTimeout(idleTimer);
      if (!autoRotateEnabled) return;
      idleTimer = setTimeout(startAutoRotate, delay == null ? 1800 : delay);
    }

    function pointerX(e){ return e.touches ? e.touches[0].clientX : e.clientX; }

    function onDown(e){
      isDragging = true; moved = false;
      stopAutoRotate();
      clearTimeout(idleTimer);
      stage.classList.add('dragging');
      startX = pointerX(e);
      startRotation = rotation;
      ring.classList.add('no-transition');
    }
    function onMove(e){
      if (!isDragging) return;
      var dx = pointerX(e) - startX;
      if (Math.abs(dx) > 5) moved = true;
      rotation = startRotation + dx * 0.35;
      setRotation(rotation, false);
    }
    function onUp(){
      if (!isDragging) return;
      isDragging = false;
      stage.classList.remove('dragging');
      var snapped = Math.round(rotation / stepAngle) * stepAngle;
      rotation = snapped;
      setRotation(rotation, true);
      scheduleIdle();
    }

    stage.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    stage.addEventListener('mouseenter', function(){ stopAutoRotate(); clearTimeout(idleTimer); });
    stage.addEventListener('mouseleave', function(){ if (!isDragging) scheduleIdle(); });

    ring.querySelectorAll('.carousel3d-card').forEach(function(card){
      card.addEventListener('click', function(){
        if (moved) return;
        var target = document.querySelector(card.getAttribute('data-target'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    function angularDist(a){
      a = ((a % 360) + 360) % 360;
      return Math.min(a, 360 - a);
    }
    function getFrontCard(){
      var cards = ring.querySelectorAll('.carousel3d-card');
      var best = null, bestDist = Infinity;
      cards.forEach(function(card, i){
        var d = angularDist(rotation + i * stepAngle);
        if (d < bestDist) { bestDist = d; best = card; }
      });
      return best;
    }

    stage.setAttribute('tabindex', '0');
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', 'Featured work carousel — use arrow keys to browse, enter to open the centered project');
    stage.addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        stopAutoRotate();
        clearTimeout(idleTimer);
        rotation += (e.key === 'ArrowRight' ? -stepAngle : stepAngle);
        setRotation(rotation, true);
        scheduleIdle();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var front = getFrontCard();
        if (front) {
          var target = document.querySelector(front.getAttribute('data-target'));
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    setRotation(0, false);
    startAutoRotate();
  }

  /* ---------- Scroll-reveal ---------- */
  function initReveal(){
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function(el){ el.classList.add('in-view'); });
      return;
    }
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function(el){ observer.observe(el); });

    // Safety net: a very large/instant scroll (fast fling, or a non-smooth
    // anchor jump) can move an element straight past the intersection zone
    // between two frames, so the observer never reports it. Catch anything
    // left behind (already above the viewport) on scroll/resize.
    var ticking = false;
    function sweep(){
      ticking = false;
      document.querySelectorAll('.reveal:not(.in-view)').forEach(function(el){
        if (el.getBoundingClientRect().bottom < 0) el.classList.add('in-view');
      });
    }
    window.addEventListener('scroll', function(){
      if (!ticking) { ticking = true; requestAnimationFrame(sweep); }
    }, { passive: true });
  }

  /* ---------- Netlify contact form (AJAX submit) ---------- */
  function initContactForm(){
    var form = document.getElementById('contactForm');
    var status = document.getElementById('formStatus');
    var submitBtn = document.getElementById('cfSubmit');
    if (!form || !status) return;

    function encode(data){
      return Object.keys(data).map(function(k){
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      }).join('&');
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function(v, k){ data[k] = v; });

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      status.textContent = '';
      status.removeAttribute('data-state');

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode(data)
      }).then(function(res){
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        status.textContent = 'Thanks — I’ll get back to you soon.';
        status.setAttribute('data-state', 'success');
      }).catch(function(){
        status.textContent = 'Something went wrong. Email me directly instead: help.txlcustomer@gmail.com';
        status.setAttribute('data-state', 'error');
      }).finally(function(){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send message';
      });
    });
  }

  /* ---------- Mobile nav toggle ---------- */
  function initMobileNav(){
    var toggle = document.getElementById('navToggle');
    var panel = document.getElementById('navMobile');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', function(){
      var open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        panel.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initAll(){
    initBackground(); initTilt(); initCarousel(); initMobileNav(); initContactForm(); initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
