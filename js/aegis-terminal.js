(function(){
  var lines = [
    "$ txl-aegis scan example-shop.com --modules all",
    "Authorized: example-shop.com (client)",
    "",
    "Grade: <span class=\"grade\">B (84/100)</span>",
    "",
    "What to fix:",
    "  1. <span class=\"med\">[MEDIUM]</span> No rate limiting observed",
    "     Add rate limiting on checkout, login, and contact endpoints.",
    "  2. [LOW] Missing header: Content-Security-Policy",
    "     Scope it to the scripts/styles the site actually loads.",
    "  3. [LOW] Missing header: Permissions-Policy",
    "     Restrict unused browser features.",
    "",
    "Report ready -> grade, fixes, and proof once resolved."
  ];
  var el = document.getElementById('term');
  if (!el) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderStatic(){ el.innerHTML = lines.join('\n'); }
  if (reduced) { renderStatic(); return; }

  var li = 0, ci = 0, buffer = [];
  function tick(){
    if (li >= lines.length){
      setTimeout(function(){ buffer = []; li = 0; ci = 0; el.innerHTML=''; tick(); }, 2600);
      return;
    }
    var line = lines[li];
    if (ci <= line.length){
      var shown = buffer.concat([line.slice(0, ci)]).join('\n');
      el.innerHTML = shown + '<span class="caret"></span>';
      ci++;
      setTimeout(tick, line.indexOf('$') === 0 ? 28 : 10);
    } else {
      buffer.push(line);
      li++; ci = 0;
      setTimeout(tick, 90);
    }
  }
  tick();
})();
