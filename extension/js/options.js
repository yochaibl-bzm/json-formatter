(function(){

    function registerBehavior(){
        $('#save').click(save);
    }

    function save(){
        localStorage['options'] = $('#options').val();
        chrome.extension.sendMessage({
            type: "RELOAD-OPTIONS"
        });
    }

    function loadOptions(){
        $('#options').val(localStorage['options'] || '[]');
    }

    loadOptions();
    registerBehavior();
})();