//------------------ Globals ------------------

var alertMessage = "There is no active WhatsApp Web tab or window!";
var whappUrl = "https://web.whatsapp.com/";
var loadTime = 3000; //time to wait DOM loading after page/group change


// Load previous ignore list
chrome.storage.sync.get("ignoreTxt", ({ ignoreTxt }) => {
    if(ignoreTxt) { //set if defined
        document.getElementById("ignore-list").value = ignoreTxt; 
    } else {
        document.getElementById("ignore-list").value = null; 
    }   
});

//--------------------- Run -----------------------
var runButton = document.getElementById("run");
runButton.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ url: whappUrl });

    if (!tab) {
        alert(alertMessage);
        return;
    }

    //Get ignore text and transform it to an ignore list (array)
    var ignoreList = [];
    var ignoreTxt = '';
    //semicolon separated, case insensitive
    var ignoreTxt = document.getElementById("ignore-list").value.trim().toLowerCase(); 

    if (ignoreTxt && ignoreTxt.length < 3) {
        alert("Ignore list must have at least 3 characters");
        return;
    } else {
        chrome.storage.sync.set({ ignoreTxt });
        ignoreList = ignoreTxt.split(";");
    }
    
    //remove empty elements
    ignoreList = ignoreList.filter(function (el) { 
        return el != null && el.trim() != ''; 
    });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: runExtension,
        args: [ignoreList, loadTime],
    });
});

function runExtension(ignoreList, loadTime) {

    //From html fragments to DOM element
    var htmlToElement = function (html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    //Hide messages of specific authors based on ignore list
    var hideMessages = function () {
        var messages = document.querySelectorAll('[data-pre-plain-text]');

        //Search each message
        for (var i = 0; i < messages.length; i++) {
            var author = messages.item(i).getAttribute("data-pre-plain-text").toLowerCase(); //case insensitive
            //Ignore each author that matches ignore list
            for (var j = 0; j < ignoreList.length; j++) {
                if (author.indexOf(ignoreList[j]) != -1) {
                    messages.item(i).parentElement.style.display = 'none'; //hides the message
                }
            }
        }
    }

    //Hide archived and show WhatsApp Focus message
    var sidePane = document.getElementById("pane-side");

    var archivedPane = sidePane.children[0];
    archivedPane.style.display = 'none'; //hide Archived   
    var msgFocusRunning = '<div style="margin-top: 30px; margin-bottom: 30px; margin-left: 50px; color: red;"><span>WhastApp Focus is running.</span></div>';
    sidePane.prepend(htmlToElement(msgFocusRunning)); //insert focus message

    //Listen for changes in the active page/group and hide new messages from ignore list
    mainPane = document.getElementById("main");
    mainPane.addEventListener("DOMNodeInserted", hideMessages, false);
    
    //Listen for page/group change and hide messages from ignore list
    sidePane.addEventListener("click", function(e) {
        setTimeout(hideMessages, loadTime); //wait for the DOM to load
    }, false);

    hideMessages(); //Hide immediately after running
}

//--------------------- Reset -----------------------

var resetButton = document.getElementById("reset");

resetButton.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ url: whappUrl });

    if (!tab) {
        alert(alertMessage);
        return;
    }   

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: resetExtension
    });
});

function resetExtension() {
    confirm("This will reload the WhatsApp Web tab/window. Are you sure?");
    var ignoreTxt = null;
    chrome.storage.sync.set({ ignoreTxt }); // reset ignore list
    document.location.reload();
}