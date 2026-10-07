(function(){
    var cards = document.querySelectorAll('.cat-card');
    var details = document.querySelectorAll('.cat-detail');
    function closeAll(){
      cards.forEach(function(c){ c.classList.remove('active'); });
      details.forEach(function(d){ d.classList.remove('open'); });
    }
    cards.forEach(function(card){
      var cat = card.getAttribute('data-cat');
      var detail = document.getElementById('detail-' + cat);
      var toggle = card.querySelector('.cat-toggle');
      toggle.addEventListener('click', function(){
        var wasOpen = detail.classList.contains('open');
        closeAll();
        if (!wasOpen){
          card.classList.add('active');
          detail.classList.add('open');
          detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
  })();
