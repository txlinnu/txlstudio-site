document.addEventListener('DOMContentLoaded', function(){
  var T = window.THREE;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.pillar'));
  if (!T || !window.WebGLRenderingContext || !cards.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SIZE = 152, COLORS = [0xe8582f, 0x14b88a, 0xc9a15a], KINDS = ['build', 'automate', 'secure'];

  var gl;
  try { gl = new T.WebGLRenderer({ alpha: true, antialias: true }); } catch (e) { return; }
  gl.setPixelRatio(1); gl.setSize(SIZE, SIZE, false);
  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);
  var fill = new T.MeshBasicMaterial({ color: 0x13161b, transparent: true, opacity: 0.93 });

  function edges(geo, color, op){
    return new T.LineSegments(new T.EdgesGeometry(geo, 25), new T.LineBasicMaterial({ color: color, transparent: op != null, opacity: op == null ? 1 : op }));
  }
  function solid(w, h, d, color, op, x, y, z){
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: color, transparent: true, opacity: op }));
    m.position.set(x, y, z); return m;
  }
  function seg(a, b, r, mat){
    var dir = new T.Vector3().subVectors(b, a);
    var m = new T.Mesh(new T.CylinderGeometry(r, r, dir.length(), 10), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    return m;
  }

  function make(kind, color){
    var g = new T.Group(), extra = {};
    var cm = new T.MeshBasicMaterial({ color: color });
    if (kind === 'build'){
      var win = new T.BoxGeometry(2.5, 1.75, 0.14);
      g.add(new T.Mesh(win, fill), edges(win, color));
      g.add(solid(2.5, 0.025, 0.16, color, 1, 0, 0.5, 0));
      [-1.05, -0.85, -0.65].forEach(function(x){ var d = new T.Mesh(new T.SphereGeometry(0.05, 10, 10), cm); d.position.set(x, 0.7, 0.09); g.add(d); });
      g.add(solid(1.0, 0.62, 0.17, color, 0.35, -0.6, -0.12, 0));
      g.add(solid(0.85, 0.13, 0.17, color, 0.5, 0.55, 0.1, 0));
      g.add(solid(0.85, 0.13, 0.17, color, 0.35, 0.55, -0.15, 0));
      g.add(solid(0.85, 0.13, 0.17, color, 0.25, 0.55, -0.4, 0));
      var back = edges(win, color, 0.35); back.position.set(0.45, -0.4, -0.6); g.add(back);
    } else if (kind === 'automate'){
      var w = 1.2, h = 0.78, r = 0.36, s = new T.Shape();
      s.moveTo(-w + r, -h); s.lineTo(-0.9, -h); s.lineTo(-1.0, -h - 0.55); s.lineTo(-0.35, -h); s.lineTo(w - r, -h);
      s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
      s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
      var bg = new T.ExtrudeGeometry(s, { depth: 0.26, bevelEnabled: false, curveSegments: 12 });
      bg.translate(0, 0.2, -0.13);
      g.add(new T.Mesh(bg, fill), edges(bg, color));
      extra.dots = [-0.55, 0, 0.55].map(function(x){ var d = new T.Mesh(new T.SphereGeometry(0.11, 12, 12), cm); d.position.set(x, 0.2, 0.2); g.add(d); return d; });
    } else {
      var sh = new T.Shape();
      sh.moveTo(0, 1.3); sh.lineTo(0.95, 0.95); sh.lineTo(0.95, 0.1);
      sh.bezierCurveTo(0.95, -0.55, 0.5, -1.05, 0, -1.3);
      sh.bezierCurveTo(-0.5, -1.05, -0.95, -0.55, -0.95, 0.1);
      sh.lineTo(-0.95, 0.95); sh.lineTo(0, 1.3);
      var sg = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 20 });
      sg.translate(0, 0, -0.15);
      g.add(new T.Mesh(sg, fill), edges(sg, color));
      var a = new T.Vector3(-0.4, 0.02, 0.2), b = new T.Vector3(-0.1, -0.28, 0.2), c = new T.Vector3(0.45, 0.35, 0.2);
      g.add(seg(a, b, 0.065, cm), seg(b, c, 0.065, cm));
      [a, b, c].forEach(function(p){ var j = new T.Mesh(new T.SphereGeometry(0.065, 10, 10), cm); j.position.copy(p); g.add(j); });
    }
    g.visible = false; scene.add(g);
    return { g: g, extra: extra };
  }

  var items = cards.map(function(card, i){
    var svg = card.querySelector('.pillar-icon');
    if (!svg) return null;
    var cv = document.createElement('canvas');
    cv.width = cv.height = SIZE; cv.className = 'pillar-icon icon3d'; cv.setAttribute('aria-hidden', 'true');
    svg.parentNode.insertBefore(cv, svg); svg.style.display = 'none';
    var m = make(KINDS[i] || 'build', COLORS[i] || COLORS[0]);
    var it = { card: card, cv: cv, ctx: cv.getContext('2d'), obj: m, visible: false, hover: false, phase: i * 1.4, kind: KINDS[i] };
    card.addEventListener('mouseenter', function(){ it.hover = true; });
    card.addEventListener('mouseleave', function(){ it.hover = false; });
    return it;
  }).filter(Boolean);

  function drawOne(it, t){
    scene.children.forEach(function(c){ c.visible = false; });
    var g = it.obj.g; g.visible = true;
    var amp = it.hover ? 1.0 : 0.62, sp = it.hover ? 1.9 : 0.9;
    g.rotation.y = reduce ? 0.45 : Math.sin(t * sp + it.phase) * amp;
    g.rotation.x = reduce ? -0.1 : Math.sin(t * 0.6 + it.phase) * 0.12 - 0.06;
    if (it.obj.extra.dots) it.obj.extra.dots.forEach(function(d, k){ d.scale.setScalar(1 + 0.35 * Math.max(0, Math.sin(t * 4 - k * 0.9))); });
    gl.render(scene, camera);
    it.ctx.clearRect(0, 0, SIZE, SIZE);
    it.ctx.drawImage(gl.domElement, 0, 0, SIZE, SIZE);
  }

  var clock = new T.Clock(), raf = 0;
  function frame(){
    raf = requestAnimationFrame(frame);
    var t = clock.getElapsedTime();
    items.forEach(function(it){ if (it.visible) drawOne(it, t); });
  }
  function sync(){
    var any = items.some(function(it){ return it.visible; });
    var run = any && !document.hidden && !reduce;
    if (run && !raf) frame();
    else if (!run && raf){ cancelAnimationFrame(raf); raf = 0; }
  }
  items.forEach(function(it){ drawOne(it, 0); });

  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        items.forEach(function(it){ if (it.card === en.target){ it.visible = en.isIntersecting; if (it.visible && reduce) drawOne(it, 0); } });
      });
      sync();
    }, { threshold: 0.05 });
    items.forEach(function(it){ io.observe(it.card); });
  } else { items.forEach(function(it){ it.visible = true; }); sync(); }
  document.addEventListener('visibilitychange', sync);
});
