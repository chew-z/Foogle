console.log("I am popup.js");

var State = false;

function handleButton(cmd) {
    let msg = {
        from: "popup",
        subject: cmd
    }
    if(cmd == 'action') {
        State = !State;
        save_options();
        restore_options()
    }
    chrome.runtime.sendMessage(msg , (response) =>  {
        console.log("handleButton() recived response from background script");
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
        State = response.state;
        document.getElementById('show').value = response.show;
        save_options();
        restore_options()
    });
}

// Saves options to chrome.storage.sync.
function save_options() {
    let Show = document.getElementById('show').value;
    let items = { 
        state: State, 
        show: Show 
    }
    chrome.storage.sync.set(items, () => {
        // Update status to let user know options were saved.
        document.getElementById('status').textContent = 'Options saved.';
        setTimeout(() => { 
            document.getElementById('status').textContent = ''}, 1200);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value
    chrome.storage.sync.get({ state: false, show: 0 }, (items) => {
        console.log(JSON.stringify(items));
        document.getElementById('show').value = items.show;
        State = items.state;
        if( State == true) {
            document.getElementById('bttn_action').innerHTML = 'Turn Off';
        } else {
            document.getElementById('bttn_action').innerHTML = 'Turn On';
        }
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

    // document.getElementById("form").addEventListener("submit", 
    //     () => { handleSubmit() }, false);
    document.getElementById("submitButton").addEventListener('click', 
        () => { handleForm() }, false);

});

// document.getElementById('save').addEventListener('click',
//     save_options);
window.onload = function() {
    console.log("onload" + Date());
}
