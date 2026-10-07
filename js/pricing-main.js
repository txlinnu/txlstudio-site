(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce && 'IntersectionObserver' in window){
    var targets = document.querySelectorAll('.cat-card .price-founding, .cat-card .amount');
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var node = en.target.firstChild;
        if (!node || node.nodeType !== 3) return;
        var original = node.nodeValue, to = parseInt(original.replace(/[^0-9]/g, ''), 10);
        if (!to) return;
        var start = performance.now(), dur = 900;
        (function tick(now){
          var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
          node.nodeValue = p < 1 ? '₹' + Math.round(to * e).toLocaleString('en-IN') : original;
          if (p < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.7 });
    targets.forEach(function(t){ cio.observe(t); });

    var fio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ en.target.classList.toggle('focus', en.isIntersecting && window.innerWidth <= 560); });
    }, { rootMargin: '-42% 0px -42% 0px' });
    document.querySelectorAll('.cat-card').forEach(function(c){ fio.observe(c); });
  }

  var q1 = document.getElementById('q1'), q2 = document.getElementById('q2'), q3 = document.getElementById('q3');
  var q2l = document.getElementById('q2l'), q2o = document.getElementById('q2o'), out = document.getElementById('pickResult');
  if (!q1 || !out) return;

  var PLANS = {
    starter:  { name: 'Starter Website',     price: 5000,  reg: 8000,  svc: 'website',   bud: 'lt10',  why: 'Up to 5 pages, mobile-responsive, contact form and basic SEO. A good first real website for a small business.' },
    standard: { name: 'Standard Website',    price: 12000, reg: 18000, svc: 'website',   bud: '10-25', why: 'A full multi-page business site with lead-capture forms, trust sections and a custom design matched to your brand.' },
    store:    { name: 'E-commerce Store',    price: 25000, reg: 40000, svc: 'website',   bud: '25-50', why: 'A full online store built from scratch: product catalog, cart, checkout and custom interactions, not a page-builder template.' },
    dash:     { name: 'Custom Dashboard',    price: 15000, reg: 20000, svc: 'dashboard', bud: '10-25', why: 'Data visualization, reporting or internal tooling built around how your business actually tracks things.' },
    basicbot: { name: 'Basic AI Chatbot',    price: 8000,  reg: 12000, svc: 'chatbot',   bud: 'lt10',  why: 'An FAQ-style assistant trained on your business info, embedded on your site, with lead capture.' },
    advbot:   { name: 'Advanced AI Chatbot', price: 20000, reg: 30000, svc: 'chatbot',   bud: '10-25', why: 'A full conversational assistant that connects to your data or catalog and handles multi-step flows with a custom UI.' },
    aegis:    { name: 'TXL Aegis Report',    price: 4000,  reg: null,  svc: 'aegis',     bud: 'lt10',  why: 'A full scan with a plain-English report, fixes implemented where you give access, and a re-verified Secured report to keep. It is already included free with any build.' }
  };
  var FOLLOW = {
    website: { label: 'How big is the site?', opts: [['Up to 5 pages, simple', 'starter'], ['More pages, lead forms, custom brand feel', 'standard']] },
    chatbot: { label: 'What should the bot do?', opts: [['Answer common questions and capture leads', 'basicbot'], ['Use my data/catalog and handle multi-step flows', 'advbot']] }
  };
  var DIRECT = { store: 'store', dashboard: 'dash', aegis: 'aegis' };
  var state = { need: null, plan: null, time: null };

  function fmt(n){ return '₹' + n.toLocaleString('en-IN'); }
  function press(group, btn){
    Array.prototype.forEach.call(group.querySelectorAll('.pick-opt'), function(b){ b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
  }
  function show(el, on){ if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', ''); }

  function render(){
    var p = PLANS[state.plan];
    if (!p || !state.time){ out.className = 'pick-result'; out.textContent = ''; return; }
    var note = 'Interested in: ' + p.name + ' (' + fmt(p.price) + (p.reg ? ' founding rate' : '') + ').';
    var q = '?service=' + p.svc + '&budget=' + p.bud + '&timeline=' + state.time + '&note=' + encodeURIComponent(note);
    var wa = 'https://wa.me/918374367150?text=' + encodeURIComponent("Hi, I'm looking at the " + p.name + " package. Could we talk?");
    out.className = 'pick-result show';
    out.innerHTML =
      '<div class="pr-k">Recommended for you</div>' +
      '<div class="pr-name"></div>' +
      '<div class="pr-price"></div>' +
      '<p class="pr-why"></p>' +
      '<div class="pr-cta"><a class="btn btn-primary" href="contact.html' + q + '">Start with this →</a>' +
      '<a class="btn btn-ghost" href="' + wa + '" target="_blank" rel="noopener">Talk it through on WhatsApp</a></div>' +
      '<button type="button" class="pick-reset" id="pickReset">Start over</button>';
    out.querySelector('.pr-name').textContent = p.name;
    out.querySelector('.pr-why').textContent = p.why;
    var pr = out.querySelector('.pr-price');
    pr.textContent = fmt(p.price) + ' starting';
    if (p.reg){ var s = document.createElement('s'); s.textContent = fmt(p.reg); pr.appendChild(s); }
    document.getElementById('pickReset').addEventListener('click', reset);
  }

  function reset(){
    state = { need: null, plan: null, time: null };
    Array.prototype.forEach.call(document.querySelectorAll('#picker .pick-opt'), function(b){ b.setAttribute('aria-pressed', 'false'); });
    show(q2, false); show(q3, false); out.className = 'pick-result'; out.textContent = '';
  }

  q1.addEventListener('click', function(e){
    var b = e.target.closest('.pick-opt'); if (!b) return;
    press(q1, b);
    state.need = b.getAttribute('data-v'); state.plan = null; state.time = null; out.className = 'pick-result'; out.textContent = '';
    Array.prototype.forEach.call(q3.querySelectorAll('.pick-opt'), function(x){ x.setAttribute('aria-pressed', 'false'); });
    if (FOLLOW[state.need]){
      q2l.textContent = FOLLOW[state.need].label; q2o.textContent = '';
      FOLLOW[state.need].opts.forEach(function(o){
        var ob = document.createElement('button'); ob.type = 'button'; ob.className = 'pick-opt'; ob.setAttribute('aria-pressed', 'false');
        ob.setAttribute('data-p', o[1]); ob.textContent = o[0]; q2o.appendChild(ob);
      });
      show(q2, true); show(q3, false);
    } else {
      state.plan = DIRECT[state.need]; show(q2, false); show(q3, true);
    }
  });
  q2.addEventListener('click', function(e){
    var b = e.target.closest('.pick-opt'); if (!b) return;
    press(q2o, b); state.plan = b.getAttribute('data-p'); show(q3, true); render();
  });
  q3.addEventListener('click', function(e){
    var b = e.target.closest('.pick-opt'); if (!b) return;
    press(q3, b); state.time = b.getAttribute('data-t'); render();
  });
})();
