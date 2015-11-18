// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @output_file_name content.js
// @externs_url http://closure-compiler.googlecode.com/svn/trunk/contrib/externs/chrome_extensions.js
// @js_externs var console = {assert: function(){}};
// @formatting pretty_print
// ==/ClosureCompiler==

/** @license
  JSON Formatter | MIT License
  Copyright 2012 Callum Locke

  Permission is hereby granted, free of charge, to any person obtaining a copy of
  this software and associated documentation files (the "Software"), to deal in
  the Software without restriction, including without limitation the rights to
  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
  of the Software, and to permit persons to whom the Software is furnished to do
  so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

 */

/*jshint eqeqeq:true, forin:true, strict:true */
/*global chrome, console */

// Source: http://stackoverflow.com/questions/6990729/simple-ajax-form-using-javascript-no-jquery
function ajaxRequest (url, method, data, callback) {
    var xhr = new XMLHttpRequest();

    xhr.open(method, url);
    xhr.setRequestHeader("Content-type", "application/json");

    //.bind ensures that this inside of the function is the XHR object.
    xhr.onload = callback.bind(xhr);

    //All preperations are clear, send the request!
    xhr.send(data);
}

var TabManager = (function(items){

    function setSelected(item, isSelected){
        item.panel.hidden = !isSelected;

        if (isSelected){
            item.button.classList.add('selected') ;
        } else {
            item.button.classList.remove('selected') ;
        }

        if(isSelected && item.onSelected){
            item.onSelected();
        }
    }


    function showTab(id){
        for (var key in items){
            setSelected(items[key], key === id);
        }
    }

    return {
        show: showTab
    }
});


var CrudPanel = function(){
    var dom = generateDom();
    var panel, pathBox, dataBox, methodBox, submitButton;

    function generateMethodsSelect(){
        var select = document.createElement('select');
        select.className = 'method-select';

        ['POST', 'PUT', 'PATCH', 'DELETE'].forEach(function(method){
           select.appendChild(createOption(method));
        });

        return select;
    }

    function sendRequest(){
        var url = pathBox.value;
        ajaxRequest(url, methodBox.value, dataBox.value, function(status){
            contentManager.createNewPort();
            contentManager.initPort();
            contentManager.setPageUrl(url);
            contentManager.postText(status.target.responseText);
        });
    }

    function createOption(method){
        var option = document.createElement('option');
        option.innerHTML = method;
        option.value = method;
        return option;
    }

    function generateDom(){
        panel = document.createElement('div');
        panel.className = 'crud-form';
        panel.hidden = true;

        pathBox = document.createElement('input');
        pathBox.className = 'path-box';

        dataBox = document.createElement('textarea');
        dataBox.className = 'data-box';

        methodBox = generateMethodsSelect();

        submitButton = document.createElement('button');
        submitButton.innerHTML = 'Send';
        submitButton.className = 'submit-button';
        submitButton.onclick = sendRequest;

        panel.appendChild(pathBox);
        panel.appendChild(dataBox);
        panel.appendChild(methodBox);
        panel.appendChild(submitButton);
        return panel;
    }

    function getDom(){
        return dom;
    }

    function prettify(json){
        return JSON.stringify(JSON.parse(json), null, '\t');
    }

    function init(json){
        pathBox.value = document.location.href;
        dataBox.value = prettify(json);
    }

    return {
        getDom: getDom,
        init: init
    };
};

var crudPanel = CrudPanel();

function createPort(){
    return chrome.extension.connect({name: 'jf'}) ;
}

var contentManager = (function() {

  "use strict" ;

  var jfContent,
      pre,
      jfStyleEl,
      slowAnalysisTimeout,
      port,
      startTime = +(new Date()),
      domReadyTime,
      isJsonTime,
      exitedNotJsonTime,
      displayedFormattedJsonTime
  ;

    function initPort(){
        port = createPort();

        port.onMessage.addListener( function (msg) {

            switch (msg[0]) {
                case 'NOT JSON' :
                    pre.hidden = false ;
                    document.body.removeChild(jfContent) ;
                    exitedNotJsonTime = +(new Date()) ;
                    break ;

                case 'FORMATTING' :
                    isJsonTime = +(new Date()) ;

                    clearTimeout(slowAnalysisTimeout) ;

                    addStyle();

                    var formattingMsg = document.getElementById('formattingMsg') ;
                    // TODO: set formattingMsg to visible after about 300ms (so faster than this doesn't require it)
                    formattingMsg.hidden = true ;
                    setTimeout(function(){
                        formattingMsg.hidden = false ;
                    }, 250) ;

                    createInterface();
                    break ;

                case 'FORMATTED' :
                    showFormatted(jfContent, msg[1], msg[2]);
                    // Insert HTML content

                    break ;

                default :
                    throw new Error('Message not understood: ' + msg[0]) ;
            }
        });
    }

    // console.timeEnd('established port') ;

    function addStyle(){
        jfStyleEl = document.createElement('style') ;
        jfStyleEl.id = 'jfStyleEl' ;
        document.head.appendChild(jfStyleEl) ;

        jfContent.innerHTML = '<p id="formattingMsg"><svg id="spinner" width="16" height="16" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" version="1.1"><path d="M 150,0 a 150,150 0 0,1 106.066,256.066 l -35.355,-35.355 a -100,-100 0 0,0 -70.711,-170.711 z" fill="#3d7fe6"></path></svg> Formatting...</p>' ;
    }

    function createInterface(){
        var optionBar = document.createElement('div') ;
        optionBar.id = 'optionBar' ;

        var buttonPlain = document.createElement('button'),
            buttonFormatted = document.createElement('button'),
            buttonCrud = document.createElement('button') ;
        buttonCrud.id = 'buttonCrud' ;
        buttonCrud.innerText = 'Crud' ;
        buttonPlain.id = 'buttonPlain' ;
        buttonPlain.innerText = 'Raw' ;
        buttonFormatted.id = 'buttonFormatted' ;
        buttonFormatted.innerText = 'Parsed' ;
        buttonFormatted.classList.add('selected') ;

        document.body.appendChild(crudPanel.getDom());

        var tabManager = TabManager({
            raw: {
                panel: pre,
                button: buttonPlain
            },
            formatted: {
                panel: jfContent,
                button: buttonFormatted
            },
            crud: {
                panel: crudPanel.getDom(),
                button: buttonCrud
            }
        });
        tabManager.show('formatted');

        buttonPlain.addEventListener(
            'click',
            function (){
                // When plain button clicked...
                if (isButtonSelected(this)) {
                    return;
                }
                tabManager.show('raw');
            },
            false
        ) ;

        buttonFormatted.addEventListener(
            'click',
            function (){
                if (isButtonSelected(this)) {
                    return;
                }
                tabManager.show('formatted');
            },
            false
        ) ;

        buttonCrud.addEventListener(
            'click',
            function (){
                if (isButtonSelected(this)) {
                    return;
                }
                tabManager.show('crud');
            },
            false
        ) ;

        // Put it in optionBar
        optionBar.appendChild(buttonCrud) ;
        optionBar.appendChild(buttonPlain) ;
        optionBar.appendChild(buttonFormatted) ;

        // Attach event handlers
        document.addEventListener(
            'click',
            generalClick,
            false // No need to propogate down
        ) ;

        // Put option bar in DOM
        document.body.insertBefore(optionBar, pre) ;
    }

    function showFormatted(jfContent, html, json){
        jfContent.innerHTML = html ;

        displayedFormattedJsonTime = Date.now() ;

        // Export parsed JSON for easy access in console
        setTimeout(function () {
            var script = document.createElement("script") ;
            script.innerHTML = 'window.json = ' + json + ';' ;
            document.head.appendChild(script) ;
            crudPanel.init(json);
            console.log('JSON Formatter: Type "json" to inspect.') ;
        }, 100) ;

    }

  function isButtonSelected(button){
      return button.className.indexOf('selected') > -1;
  }
  function ready () {
    
    domReadyTime = Date.now() ;
      
    // First, check if it's a PRE and exit if not
      var bodyChildren = document.body.childNodes ;
      pre = bodyChildren[0] ;
      var jsonLength = (pre && pre.innerText || "").length ;
      if (
        bodyChildren.length !== 1 ||
        pre.tagName !== 'PRE' ||
        jsonLength > (3000000) ) {

        // console.log('Not even text (or longer than 3MB); exiting') ;
        // console.log(bodyChildren.length,pre.tagName, pre.innerText.length) ;

        // Disconnect the port (without even having used it)
          port.disconnect() ;
        
        // EXIT POINT: NON-PLAIN-TEXT PAGE (or longer than 3MB)
      }
      else {
        // This is a 'plain text' page (just a body with one PRE child).
        // It might be JSON/JSONP, or just some other kind of plain text (eg CSS).
        
        // Hide the PRE immediately (until we know what to do, to prevent FOUC)
          pre.hidden = true ;
          //console.log('It is text; hidden pre at ') ;
          slowAnalysisTimeout = setTimeout(function(){
            pre.hidden = false ;
          }, 1000) ;
        
        // Send the contents of the PRE to the BG script
          // Add jfContent DIV, ready to display stuff
            jfContent = document.createElement('div') ;
            jfContent.id = 'jfContent' ;
            document.body.appendChild(jfContent) ;

          // Post the contents of the PRE
          postText(pre.innerText);
          // Now, this script will just wait to receive anything back via another port message. The returned message will be something like "NOT JSON" or "IS JSON"
      }

/*      document.addEventListener('keyup', function(e) {
        if (e.keyCode === 37 && typeof buttonPlain !== 'undefined') {
          buttonPlain.click();
        }
        else if (e.keyCode === 39 && typeof buttonFormatted !== 'undefined') {
          buttonFormatted.click();
        }
      }); */
  }

    function postText(text){
        port.postMessage({
            type: "SENDING TEXT",
            text: text,
            length: text.length,
            location: document.location
        });
    }

    document.addEventListener("DOMContentLoaded", ready, false);

  var lastKvovIdGiven = 0 ;
  function collapse(elements) {
    // console.log('elements', elements) ;

    var el, i, blockInner, count ;

    for (i = elements.length - 1; i >= 0; i--) {
      el = elements[i] ;
      el.classList.add('collapsed') ;

      // (CSS hides the contents and shows an ellipsis.)

      // Add a count of the number of child properties/items (if not already done for this item)
        if (!el.id) {
          el.id = 'kvov' + (++lastKvovIdGiven) ;

          // Find the blockInner
            blockInner = el.firstElementChild ;
            while ( blockInner && !blockInner.classList.contains('blockInner') ) {
              blockInner = blockInner.nextElementSibling ;
            }
            if (!blockInner)
              continue ;

          // See how many children in the blockInner
            count = blockInner.children.length ;

          // Generate comment text eg "4 items"
            var comment = count + (count===1 ? ' item' : ' items') ;
          // Add CSS that targets it
            jfStyleEl.insertAdjacentHTML(
              'beforeend',
              '\n#kvov'+lastKvovIdGiven+'.collapsed:after{color: #aaa; content:" // '+comment+'"}'
            ) ;
        }
    }
  }
  function expand(elements) {
    for (var i = elements.length - 1; i >= 0; i--)
      elements[i].classList.remove('collapsed') ;
  }

  var mac = navigator.platform.indexOf('Mac') !== -1,
      modKey ;
  if (mac)
    modKey = function (ev) {
      return ev.metaKey ;
    } ;
  else
    modKey = function (ev) {
      return ev.ctrlKey ;
    } ;

  function generalClick(ev) {
    // console.log('click', ev) ;

    if (ev.which === 1) {
      var elem = ev.target ;
      
      if (elem.className === 'e') {
        // It's a click on an expander.

        ev.preventDefault() ;

        var parent = elem.parentNode,
            div = jfContent,
            prevBodyHeight = document.body.offsetHeight,
            scrollTop = document.body.scrollTop,
            parentSiblings
        ;
        
        // Expand or collapse
          if (parent.classList.contains('collapsed')) {
            // EXPAND
              if (modKey(ev))
                expand(parent.parentNode.children) ;
              else
                expand([parent]) ;
          }
          else {
            // COLLAPSE
              if (modKey(ev))
                collapse(parent.parentNode.children) ;
              else
                collapse([parent]) ;
          }

        // Restore scrollTop somehow
          // Clear current extra margin, if any
            div.style.marginBottom = 0 ;

          // No need to worry if all content fits in viewport
            if (document.body.offsetHeight < window.innerHeight) {
              // console.log('document.body.offsetHeight < window.innerHeight; no need to adjust height') ;
              return ;
            }

          // And no need to worry if scrollTop still the same
            if (document.body.scrollTop === scrollTop) {
              // console.log('document.body.scrollTop === scrollTop; no need to adjust height') ;
              return ;
            }

          // console.log('Scrolltop HAS changed. document.body.scrollTop is now '+document.body.scrollTop+'; was '+scrollTop) ;
          
          // The body has got a bit shorter.
          // We need to increase the body height by a bit (by increasing the bottom margin on the jfContent div). The amount to increase it is whatever is the difference between our previous scrollTop and our new one.
          
          // Work out how much more our target scrollTop is than this.
            var difference = scrollTop - document.body.scrollTop  + 8 ; // it always loses 8px; don't know why

          // Add this difference to the bottom margin
            //var currentMarginBottom = parseInt(div.style.marginBottom) || 0 ;
            div.style.marginBottom = difference + 'px' ;

          // Now change the scrollTop back to what it was
            document.body.scrollTop = scrollTop ;
            
        return ;
      }
    }
  }

    function createNewPort(){
        port = createPort();
    }

    function setPageUrl(url){
        history.pushState(url, url, url);
    }

    initPort();

    return {
        createNewPort: createNewPort,
        postText: postText,
        initPort: initPort,
        setPageUrl: setPageUrl
    };
})();
