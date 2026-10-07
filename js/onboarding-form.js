(function(){
    var form = document.getElementById('onboardingForm');
    var status = document.getElementById('formStatus');
    var submitBtn = document.getElementById('obSubmit');
    if (!form || !status) return;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      status.textContent = '';
      status.removeAttribute('data-state');

      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      }).then(function(res){
        if (!res.ok) throw new Error('Request failed');
        if (typeof gtag === 'function') gtag('event', 'generate_lead', { form: 'onboarding' });
        form.reset();
        status.textContent = 'Got it — thanks. I\'ll follow up over email.';
        status.setAttribute('data-state', 'success');
      }).catch(function(){
        status.textContent = 'Something went wrong. Email me directly instead: help.txlcustomer@gmail.com';
        status.setAttribute('data-state', 'error');
      }).finally(function(){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send project details';
      });
    });
  })();
