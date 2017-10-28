//do this in global scope for popup.js
var background = chrome.extension.getBackgroundPage(); 
var State;


function handleButton(cmd) {
    let msg = {
        from: "popup",
        subject: cmd
    }
    if(cmd == 'action') {
        save_options();
        restore_options()
    }
    if(document.getElementById('items').innerHTML != ''){
        location.reload();
    }
    chrome.runtime.sendMessage(msg , (response) =>  {
        console.log("handleButton() recived response from background.js " + JSON.stringify(response.msg));
        if(response === undefined) return;
        let result = response.msg;

        document.getElementById('items').innerHTML = '';
        if( result.length == 0 ) { 
            document.getElementById('items').innerHTML = 'No results';
        } else {
            result.forEach( item => { 
                let node = document.createElement("LI");  // Create a <li> node
                let textnode = document.createTextNode(item); // Create a text node
                node.appendChild(textnode); 
                document.getElementById("items").appendChild(node); ///append Item
            });
        }
    });
}


function handleForm() { // Submit reloads destroying persistance
    save_options()
    let msg = {
        from: "popup",
        subject: "form",
        show: document.getElementById('show').value
    }
    console.log(JSON.stringify(msg));
    chrome.runtime.sendMessage(msg, (response) => {
        console.log("handleClick() received response from background.js");
        document.getElementById('show').value = response.show;
        save_options();
        restore_options()
    });
}


// Saves options to chrome.storage.sync.
function save_options() {
    let Show = document.getElementById('show').value;
    let items = { 
        show: Show 
    }
    chrome.storage.sync.set(items, () => {
        // Update status to let user know options were saved.
        document.getElementById('status').textContent = 'Options saved.';
        setTimeout(() => { 
            document.getElementById('status').textContent = ''}, 1200);
    });
}


// Restores options from chrome.storage.sync.
function restore_options() {
    // Use default value
    chrome.storage.sync.get({ show: 0 }, (items) => {
        console.log(JSON.stringify(items));
        document.getElementById('show').value = items.show;
    });
}


// document.addEventListener('DOMContentLoaded', restore_options);
document.addEventListener('DOMContentLoaded', () => {
    restore_options();

    document.getElementById("bttn_action").addEventListener('click', 
        () => { handleButton('action') }, false);
    document.getElementById("bttn_zeitgeist").addEventListener('click', 
        () => { handleButton('zeitgeist')}, false);
    document.getElementById("bttn_extracted").addEventListener('click', 
        () => { handleButton('extracted')}, false);
    document.getElementById("bttn_rss").addEventListener('click', 
        () => { handleButton('rss')}, false);
    document.getElementById("bttn_history").addEventListener('click', 
        () => { handleButton('history')}, false);

    // document.getElementById("form").addEventListener("submit", 
    //     () => { handleSubmit() }, false);
    document.getElementById("submitButton").addEventListener('click', 
        () => { handleForm() }, false);

});

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.msg == "tab closed") {
        console.log("recived message tab closed");
        State = false;
        document.getElementById('bttn_action').innerHTML = 'Turn On';
    } else if (request.msg == "tab created") {
        console.log("recived message tab created");
        State = true;
        document.getElementById('bttn_action').innerHTML = 'Turn Off'
    }
}
);

// document.getElementById('save').addEventListener('click',
//     save_options);
window.onload = function() {
    console.log("onload" + Date());
    if(background._tab_id > 0) {
        State = true;
        document.getElementById('bttn_action').innerHTML = 'Turn Off';
    } else {
        State = false;
        document.getElementById('bttn_action').innerHTML = 'Turn On';
    }
    console.log("on load: Foogle tab active is " + State);
}
