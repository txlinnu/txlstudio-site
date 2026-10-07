(function(){
        var select = document.getElementById('cf-project');
        var msg = document.getElementById('cf-message');
        var msgLabel = document.getElementById('cf-message-label');
        var aegisCopy = {
          label: 'What\'s the site, and anything else I should know?',
          placeholder: 'e.g. yourbusiness.com — live e-commerce site, launching next month'
        };
        var defaultCopy = {
          label: 'What are you building?',
          placeholder: 'e.g. a booking site for my salon'
        };
        function syncMessageField(){
          var isAegis = select.value.indexOf('Aegis') !== -1;
          var copy = isAegis ? aegisCopy : defaultCopy;
          msgLabel.textContent = copy.label;
          msg.placeholder = copy.placeholder;
        }
        select.addEventListener('change', syncMessageField);

        var params = new URLSearchParams(window.location.search);
        var service = params.get('service');
        if (service === 'aegis'){
          select.value = 'Security Report (Aegis)';
        } else if (service === 'bundle'){
          select.value = 'Website + Aegis bundle';
        } else {
          var types = { website: 'Website', dashboard: 'Dashboard', chatbot: 'AI Chatbot', other: 'Something else' };
          if (types[service]) select.value = types[service];
        }
        var budgetIdx = { lt10: 1, '10-25': 2, '25-50': 3, '50plus': 4 }[params.get('budget')];
        if (budgetIdx) document.getElementById('cf-budget').selectedIndex = budgetIdx;
        var timeIdx = { asap: 1, month: 2, '1-3': 3, exploring: 4 }[params.get('timeline')];
        if (timeIdx) document.getElementById('cf-timeline').selectedIndex = timeIdx;
        var note = params.get('note');
        if (note && !msg.value) msg.value = note.slice(0, 400);
        syncMessageField();
      })();
