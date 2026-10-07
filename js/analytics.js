window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-FYEG6Q3ZB3');
  /* load gtag.js after the page has painted, so analytics never delays first render */
  (function(){
    var loaded = false;
    function load(){
      if (loaded) return; loaded = true;
      var s = document.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=G-FYEG6Q3ZB3';
      document.head.appendChild(s);
    }
    window.addEventListener('load', function(){ setTimeout(load, 1000); });
    ['pointerdown','keydown','touchstart','scroll'].forEach(function(ev){ window.addEventListener(ev, load, { once: true, passive: true }); });
  })();
