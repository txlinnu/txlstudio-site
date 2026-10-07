document.addEventListener('DOMContentLoaded', function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var section = document.getElementById('checks');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.check-item'));
  var hud = document.getElementById('visualHud');
  var wrap = document.getElementById('aegisVisual');
  var canvas = document.getElementById('aegisScene');
  if (!section || !cards.length) return;

  var names = cards.map(function(c){ return c.querySelector('h3').textContent; });
  var active = 0, paused = false, visible = false, onActive = function(){};

  function setActive(i){
    active = i;
    cards.forEach(function(c, n){ c.classList.toggle('scanning', n === i); });
    if (hud) hud.textContent = 'scan ' + String(i + 1).padStart(2, '0') + '/' + String(cards.length).padStart(2, '0') + ' · ' + names[i];
    onActive(i);
  }

  cards.forEach(function(c, i){
    c.addEventListener('mouseenter', function(){ paused = true; setActive(i); });
    c.addEventListener('mouseleave', function(){ paused = false; });
  });

  if (!reduce) {
    setInterval(function(){
      if (!paused && visible && !document.hidden) setActive((active + 1) % cards.length);
    }, 1800);
  }

  /* ---------- 3D scan visual ---------- */
  var renderer = null, raf = 0;
  function initScene(){
    var T = window.THREE;
    var isMobile = window.innerWidth < 700;
    renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.5, 9.5);
    var root = new T.Group();
    scene.add(root);

    var GOLD = 0xc9a15a, TEAL = 0x14b88a, DIM = 0x4a5260, DONE = 0x2f6b5a;

    // soft glow behind the shield
    var g = document.createElement('canvas'); g.width = g.height = 128;
    var gx = g.getContext('2d');
    var grad = gx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(20,184,138,0.55)'); grad.addColorStop(1, 'rgba(20,184,138,0)');
    gx.fillStyle = grad; gx.fillRect(0, 0, 128, 128);
    var glow = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(g), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.55 }));
    glow.scale.set(6, 6, 1); glow.position.z = -0.9;
    root.add(glow);

    // shield
    var s = new T.Shape();
    s.moveTo(0, 1.35); s.lineTo(1.0, 1.0); s.lineTo(1.0, 0.1);
    s.bezierCurveTo(1.0, -0.6, 0.5, -1.1, 0, -1.4);
    s.bezierCurveTo(-0.5, -1.1, -1.0, -0.6, -1.0, 0.1);
    s.lineTo(-1.0, 1.0); s.lineTo(0, 1.35);
    var geo = new T.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 24 });
    geo.center();
    var shield = new T.Group();
    shield.add(new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x13161b, transparent: true, opacity: 0.94 })));
    shield.add(new T.LineSegments(new T.EdgesGeometry(geo, 25), new T.LineBasicMaterial({ color: GOLD })));

    // check mark (two cylinders + round joints)
    var checkMat = new T.MeshBasicMaterial({ color: TEAL });
    function seg(a, b, r){
      var dir = new T.Vector3().subVectors(b, a);
      var m = new T.Mesh(new T.CylinderGeometry(r, r, dir.length(), 12), checkMat);
      m.position.copy(a).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
      return m;
    }
    function ball(p, r){ var m = new T.Mesh(new T.SphereGeometry(r, 14, 14), checkMat); m.position.copy(p); return m; }
    var a = new T.Vector3(-0.42, 0.02, 0.32), b = new T.Vector3(-0.12, -0.3, 0.32), c = new T.Vector3(0.48, 0.38, 0.32);
    shield.add(seg(a, b, 0.07), seg(b, c, 0.07), ball(a, 0.07), ball(b, 0.07), ball(c, 0.07));
    root.add(shield);

    // orbit ring + one node per check
    var orbit = new T.Group();
    orbit.rotation.x = 0.42; orbit.rotation.z = -0.12;
    root.add(orbit);
    var R = 2.55, ringPts = [];
    for (var k = 0; k < 128; k++){ var an = k / 128 * Math.PI * 2; ringPts.push(new T.Vector3(Math.cos(an) * R, 0, Math.sin(an) * R)); }
    orbit.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(ringPts), new T.LineBasicMaterial({ color: DIM, transparent: true, opacity: 0.45 })));

    var nodes = [], beams = [];
    for (var i = 0; i < cards.length; i++){
      var ang = i / cards.length * Math.PI * 2;
      var pos = new T.Vector3(Math.cos(ang) * R, 0, Math.sin(ang) * R);
      var mesh = new T.Mesh(new T.OctahedronGeometry(0.15), new T.MeshBasicMaterial({ color: DIM }));
      mesh.position.copy(pos);
      orbit.add(mesh); nodes.push(mesh);
      var beam = new T.Line(new T.BufferGeometry().setFromPoints([pos, new T.Vector3(0, 0, 0)]), new T.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.8 }));
      beam.visible = false; orbit.add(beam); beams.push(beam);
    }

    onActive = function(i){
      nodes.forEach(function(n, k){
        n.material.color.setHex(k === i ? TEAL : (k < i ? DONE : DIM));
        beams[k].visible = (k === i);
      });
    };
    onActive(active);

    var mx = 0, my = 0, tx = 0, ty = 0;
    wrap.addEventListener('pointermove', function(e){
      var r = wrap.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    wrap.addEventListener('pointerleave', function(){ mx = my = 0; });

    var clock = new T.Clock();
    function draw(){
      var t = clock.getElapsedTime();
      tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;
      orbit.rotation.y = t * 0.18;
      shield.rotation.y = Math.sin(t * 0.45) * 0.55 + tx * 0.5;
      shield.rotation.x = Math.sin(t * 0.3) * 0.06 + ty * 0.25;
      root.rotation.x = ty * 0.12;
      nodes.forEach(function(n, k){
        var target = k === active ? 1.7 + 0.25 * Math.sin(t * 6) : 1;
        n.scale.setScalar(n.scale.x + (target - n.scale.x) * 0.15);
        n.rotation.y = t * 0.8;
      });
      renderer.render(scene, camera);
    }
    function loop(){ raf = requestAnimationFrame(loop); draw(); }

    function resize(){
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      draw();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wrap); else window.addEventListener('resize', resize);
    resize();

    return function sync(){
      var run = visible && !document.hidden && !reduce;
      if (run && !raf) loop();
      else if (!run && raf){ cancelAnimationFrame(raf); raf = 0; }
    };
  }

  var sync = function(){};
  if (canvas && wrap && window.THREE && !!window.WebGLRenderingContext) {
    try { sync = initScene(); } catch (e) {
      wrap.style.display = 'none';
      var top = document.querySelector('.checks-top'); if (top) top.classList.add('no-visual');
    }
  } else if (wrap) {
    wrap.style.display = 'none';
    var top2 = document.querySelector('.checks-top'); if (top2) top2.classList.add('no-visual');
  }

  setActive(0);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries){
      visible = entries[0].isIntersecting; sync();
    }, { threshold: 0.05 }).observe(section);
  } else { visible = true; sync(); }
  document.addEventListener('visibilitychange', function(){ sync(); });
});
