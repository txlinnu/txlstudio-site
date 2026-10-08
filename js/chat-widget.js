/* TXL Studio assistant widget. Talks to /api/chat. Visitor and bot text is always inserted with textContent. */
(function(){
  var API = '/api/chat';
  var FORMSPREE = 'https://formspree.io/f/xqpakwgg';          // same endpoint as the contact form
  var WA = 'https://wa.me/918374367150?text=' + encodeURIComponent("Hi, I'd like to talk about a project");
  var MAX_USER_MSGS = 15;                                      // per browser session
  var KEY = 'txc-v1';
  var GREETING = "Hi, I'm the TXL Studio assistant, an automated bot (not Inayath himself). I can answer questions about what Inayath builds, pricing and how projects work, and help you pick a package. What are you looking to build?";
  var START_CHIPS = ['What do you build?', 'How much does a website cost?', 'Do you do security checks?', 'Help me pick a package'];

  var history = [];          // [{role, content}] sent to the API (text only)
  var userCount = 0, busy = false, opened = false, leadShown = false;
  var els = {};

  function track(name, params){ try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {} }
  function store(get, val){
    try { if (get) return JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.setItem(KEY, JSON.stringify(val)); } catch (e) {}
    return null;
  }
  function el(tag, cls, text){ var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var SEND_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var CHAT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/></svg>';

  function build(){
    var launch = el('button', 'txc-launch'); launch.type = 'button';
    launch.id = 'txcLaunch'; launch.setAttribute('aria-haspopup', 'dialog'); launch.setAttribute('aria-controls', 'txcPanel'); launch.setAttribute('aria-expanded', 'false');
    launch.innerHTML = CHAT_SVG; launch.appendChild(el('span', null, 'Ask a question'));
    var dot = el('span', 'txc-dot'); dot.setAttribute('aria-hidden', 'true'); launch.appendChild(dot);

    var panel = el('div', 'txc-panel'); panel.id = 'txcPanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'TXL Studio assistant');

    var head = el('div', 'txc-head');
    var logo = document.createElement('img'); logo.src = 'favicon.svg'; logo.alt = ''; logo.width = 63; logo.height = 26; head.appendChild(logo);
    var title = el('div', 'txc-title'); title.appendChild(el('strong', null, 'TXL Assistant'));
    var sub = el('small'); var d2 = el('span', 'txc-dot'); d2.setAttribute('aria-hidden', 'true'); sub.appendChild(d2); sub.appendChild(document.createTextNode('Automated assistant · answers come from this site')); title.appendChild(sub);
    head.appendChild(title);
    var close = el('button', 'txc-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close chat'); head.appendChild(close);

    var log = el('div', 'txc-log'); log.id = 'txcLog'; log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-relevant', 'additions');
    var chips = el('div', 'txc-chips'); chips.id = 'txcChips';

    var form = el('form', 'txc-form'); form.setAttribute('autocomplete', 'off');
    var lab = el('label', 'txc-sr', 'Your message'); lab.setAttribute('for', 'txcInput');
    var input = document.createElement('input'); input.id = 'txcInput'; input.type = 'text'; input.maxLength = 600; input.placeholder = 'Ask about pricing, process, security…'; input.setAttribute('enterkeyhint', 'send');
    var send = el('button', 'txc-send'); send.type = 'submit'; send.setAttribute('aria-label', 'Send message'); send.innerHTML = SEND_SVG;
    form.appendChild(lab); form.appendChild(input); form.appendChild(send);

    var foot = el('div', 'txc-foot');
    foot.appendChild(document.createTextNode("I'm a bot and can get things wrong. Please don't share passwords or payment details. "));
    var pl = el('a', null, 'Privacy'); pl.href = 'privacy.html'; foot.appendChild(pl);

    panel.appendChild(head); panel.appendChild(log); panel.appendChild(chips); panel.appendChild(form); panel.appendChild(foot);
    document.body.appendChild(launch); document.body.appendChild(panel);
    els = { launch: launch, panel: panel, log: log, chips: chips, form: form, input: input, send: send, close: close };

    launch.addEventListener('click', open);
    close.addEventListener('click', closeChat);
    form.addEventListener('submit', function(e){ e.preventDefault(); submit(input.value); });
    panel.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeChat(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !els.panel.hidden) closeChat(); });
  }

  function scroll(){ els.log.scrollTop = els.log.scrollHeight; }
  function bubble(text, who){ var b = el('div', 'txc-msg ' + (who === 'user' ? 'txc-user' : 'txc-bot'), text); els.log.appendChild(b); scroll(); return b; }
  function setChips(list){
    els.chips.textContent = '';
    (list || []).slice(0, 4).forEach(function(t){
      var c = el('button', 'txc-chip', t); c.type = 'button';
      c.addEventListener('click', function(){ submit(t); });
      els.chips.appendChild(c);
    });
  }
  function typing(){ var t = el('div', 'txc-msg txc-bot txc-typing'); t.setAttribute('aria-label', 'Assistant is typing'); t.innerHTML = '<i></i><i></i><i></i>'; els.log.appendChild(t); scroll(); return t; }
  function persist(){ store(false, { h: history, n: userCount }); }

  function open(){
    els.panel.hidden = false; els.launch.hidden = true; els.launch.setAttribute('aria-expanded', 'true');
    if (!opened){
      opened = true; track('chat_open', { page_path: location.pathname });
      var saved = store(true);
      if (saved && saved.h && saved.h.length){
        history = saved.h; userCount = saved.n || 0;
        bubble(GREETING, 'bot');
        history.forEach(function(m){ bubble(m.content, m.role === 'user' ? 'user' : 'bot'); });
        setChips(userCount >= MAX_USER_MSGS ? [] : ['How much does it cost?', 'Talk to Inayath']);
      } else {
        bubble(GREETING, 'bot'); setChips(START_CHIPS);
      }
    }
    setTimeout(function(){ els.input.focus(); }, 30);
  }
  function closeChat(){
    els.panel.hidden = true; els.launch.hidden = false; els.launch.setAttribute('aria-expanded', 'false');
    els.launch.focus();
  }

  function linkBtn(text, href, primary, external){
    var a = el('a', 'txc-btn' + (primary ? ' primary' : ''), text); a.href = href;
    if (external){ a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }
  function handoff(message){
    bubble(message, 'bot');
    var row = el('div', 'txc-actions'); row.style.alignSelf = 'stretch';
    row.appendChild(linkBtn('Use the contact form', 'contact.html', true));
    row.appendChild(linkBtn('Message on WhatsApp', WA, false, true));
    els.log.appendChild(row); scroll();
  }

  function renderCard(p){
    var c = el('div', 'txc-card');
    c.appendChild(el('div', 'k', 'Suggested package'));
    c.appendChild(el('h4', null, p.name));
    var price = el('div', 'p', p.price); price.appendChild(el('span', null, 'starting'));
    if (p.regular) price.appendChild(el('s', null, p.regular));
    c.appendChild(price);
    c.appendChild(el('p', null, p.why));
    var row = el('div', 'txc-actions');
    var go = linkBtn('Start with this →', p.url, true);
    go.addEventListener('click', function(){ track('chat_package_click', { package: p.name }); });
    row.appendChild(go);
    row.appendChild(linkBtn('See pricing', 'pricing.html', false));
    c.appendChild(row);
    els.log.appendChild(c); scroll();
  }

  function renderLead(){
    if (leadShown) return; leadShown = true;
    var f = el('form', 'txc-lead'); f.setAttribute('aria-label', 'Contact Inayath');
    function field(label, name, type, val){
      var l = el('label', null, label); var i = document.createElement(type === 'area' ? 'textarea' : 'input');
      i.name = name; if (type !== 'area') i.type = type; if (val) i.value = val; i.maxLength = type === 'area' ? 600 : 120;
      i.required = (name === 'name' || name === 'email');
      if (name === 'email') i.autocomplete = 'email'; if (name === 'name') i.autocomplete = 'name';
      l.appendChild(i); return l;
    }
    var summary = history.filter(function(m){ return m.role === 'user'; }).map(function(m){ return m.content; }).join(' / ').slice(0, 500);
    f.appendChild(field('Your name', 'name', 'text'));
    f.appendChild(field('Email', 'email', 'email'));
    f.appendChild(field('What are you building?', 'message', 'area', summary));
    var hp = el('label', 'hp', "Leave this empty"); var hi = document.createElement('input'); hi.name = '_gotcha'; hi.tabIndex = -1; hi.autocomplete = 'off'; hp.appendChild(hi); f.appendChild(hp);
    var err = el('div', 'txc-err'); err.setAttribute('role', 'alert'); f.appendChild(err);
    var go = el('button', 'txc-btn primary', 'Send to Inayath'); go.type = 'submit'; f.appendChild(go);
    var fine = el('div', 'fine'); fine.appendChild(document.createTextNode('Used only to reply to your enquiry. See the ')); var pa = el('a', null, 'privacy page'); pa.href = 'privacy.html'; fine.appendChild(pa); fine.appendChild(document.createTextNode('.')); f.appendChild(fine);

    f.addEventListener('submit', function(e){
      e.preventDefault(); err.textContent = '';
      var fd = new FormData(f);
      if (fd.get('_gotcha')) return;
      go.disabled = true; go.textContent = 'Sending…';
      fd.append('project', 'Chat assistant enquiry'); fd.append('source', 'chat-assistant');
      fetch(FORMSPREE, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd }).then(function(r){
        if (!r.ok) throw new Error('failed');
        track('generate_lead', { form: 'chat' });
        f.remove(); leadShown = false;
        bubble('Thanks, ' + String(fd.get('name')).split(' ')[0] + '. Your message is with Inayath, and he will reply to the email you gave.', 'bot');
        setChips([]);
      }).catch(function(){
        go.disabled = false; go.textContent = 'Send to Inayath';
        err.textContent = "That didn't send. Please try the contact form or WhatsApp instead.";
      });
    });
    els.log.appendChild(f); scroll();
    var first = f.querySelector('input'); if (first) setTimeout(function(){ first.focus(); }, 30);
  }

  function setBusy(on){ busy = on; els.send.disabled = on; els.input.disabled = on; if (!on) els.input.focus(); }

  function submit(text){
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text || busy) return;
    if (userCount >= MAX_USER_MSGS){ handoff("We've covered a lot. For anything more, it's best to talk to Inayath directly."); return; }
    els.input.value = ''; setChips([]);
    bubble(text, 'user'); history.push({ role: 'user', content: text }); userCount++; persist();
    track('chat_message', { n: userCount });
    setBusy(true); var t = typing();
    var payload = { messages: history.slice(-10) };
    var controller = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function(){ if (controller) controller.abort(); }, 30000);
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller ? controller.signal : undefined })
      .then(function(r){ if (r.status === 429) { var e = new Error('limit'); e.limit = true; throw e; } if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function(j){
        clearTimeout(timer); t.remove();
        bubble(j.reply, 'bot'); history.push({ role: 'assistant', content: j.reply }); persist();
        if (j.action === 'recommend' && j.package) renderCard(j.package);
        if (j.action === 'contact') renderLead();
        setChips(j.action === 'contact' ? [] : (j.suggestions && j.suggestions.length ? j.suggestions : ['How does it work?', 'Talk to Inayath']));
      })
      .catch(function(e){
        clearTimeout(timer); t.remove();
        history.pop(); userCount--; persist();
        handoff(e && e.limit ? "I'm getting a lot of questions right now. Please use the contact form or WhatsApp and Inayath will pick it up." : "Sorry, I couldn't reach the assistant just now. You can use the contact form or WhatsApp instead.");
      })
      .then(function(){ setBusy(false); });
  }

  function init(){ if (document.getElementById('txcLaunch')) return; build(); }
  window.txlChat = { open: function(){ if (els.panel) open(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
