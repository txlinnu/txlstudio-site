// Typing effect in the hero composer — flavor text cycles, purely decorative
  const phrases = [
    "Build me a booking dashboard for my salon…",
    "I need an AI chatbot trained on my product docs…",
    "Design a landing page for my startup…"
  ];
  const el = document.getElementById('typedText');
  let pi = 0, ci = 0, deleting = false;

  function tick(){
    const current = phrases[pi];
    if(!deleting){
      el.textContent = current.slice(0, ++ci);
      if(ci === current.length){ deleting = true; setTimeout(tick, 1600); return; }
    } else {
      el.textContent = current.slice(0, --ci);
      if(ci === 0){ deleting = false; pi = (pi+1) % phrases.length; }
    }
    setTimeout(tick, deleting ? 35 : 55);
  }
  tick();
