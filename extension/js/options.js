(function(){

    function registerBehavior(){
        $('#save').click(save);
    }

    function save(){
        localStorage['options'] = $('#options').val();
    }

    function loadOptions(){
        $('#options').val(localStorage['options'] || '[]');
    }

    loadOptions();
    registerBehavior();
})();