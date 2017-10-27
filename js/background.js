// background.js
// @flow
// @flow-NotIssue
"use strict"

var _tab_id = -1;
var debug = true;
// store some temporary variables for popup
var popup_storage = {
    active: false,
    show: 0
}

function log(message) {
    console.log(JSON.stringify(message));
}


function content_log(message) {
    // logging messages from content.js
    console.log("CONTENT: " + JSON.stringify(message));
}


function start() {
    //TODO restoreOptions();
    doRssFetch(feedZeitgeist, Zeitgeist);
    var feeds = feedList.split(/~/);
    var i = feeds.length;
    while (i--) {
        if(debug) log('Start: Fetching RSS ' + feeds[i]);
        doRssFetch(feeds[i], RssTitles);
    }
    console.log("start() finished");
}


function createTab() {
    if (debug) log('Creating new tab for Foogle')
    // let newURL = "http://www.duckduckgo.com/html";
    let newURL = "http://www.google.com/";
    try {
        //@flow-NotIssue
        chrome.tabs.create({
            'active': false,
            'url': newURL
        }, function(tab) { 
            _tab_id = tab.id;
            if(debug) log("Created Foolgle tab " + tab.id);
        });
        return 0;
    } catch (exception) {
        log('Could not create Foolgle tab:' + exception);
        return -1;
    }
}


function removeTab() { 
    if (debug) log('removing Foogle tab');
    try {
        //@flow-NotIssue
        chrome.tabs.remove(_tab_id);
        chrome.browserAction.setBadgeText({'text': 'Off'});
        return 0;
    } catch (exception) {
        log('Could not create Foolgle tab:' + exception);
        return 1;
    }
}

function toggleTab() {
    if (_tab_id != -1) { // Not initiation. Toggle Foogle tab.
        //@flow-NotIssue
        chrome.tabs.get(_tab_id, function() {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
                if(debug) log("Foogle tab does not exist. Creating");
                createTab();
            } else {
                if(debug) log("Foogle tab " + _tab_id + " exists. Removing.");
                removeTab();
            }
        });
    } else {
        if(debug) log("Foogle started. Creating");
        createTab();
    }
}


function updateTab(tab_id, newURL) {
    try {
        //@flow-NotIssue
        chrome.tabs.update(tab_id, {url: newURL});
    } catch (exception) {
        log('Could not update Foolgle tab:' + exception);
        return -1;
    }
    return 0;
}


function sendQuery(tab_id, query) {
    //@flow-NotIssue
    chrome.tabs.sendMessage(tab_id, { "query": query }, (response) => {
        log(response)});
}

// When new tab created
chrome.tabs.onCreated.addListener( (tab) => {
    if(tab.id == _tab_id) {
        if(debug) log("New Foolgle tab created " + tab.id);
    }
    chrome.browserAction.setBadgeText({'text': 'On'});
});

// When tab removed
chrome.tabs.onRemoved.addListener( (tabId, removeInfo) => {
    if(tabId == _tab_id) {
        chrome.browserAction.setBadgeText({'text': 'Off'});
    }
});

// When tab updated
//@flow-NotIssue
chrome.tabs.onUpdated.addListener((tabId , info) => {
    if (tabId == _tab_id && info.status === 'complete') {
        if(debug) log("Foolgle tab " + tabId + " completed loading");
        let t_out = roll(20000, 50000);
        let query = getQuery();
        setTimeout(() => {
            sendQuery(_tab_id, query);
        }, t_out);
        log("Will make new foogle with term '" + query + "', after " + t_out/1000 + "s delay.");
    }
});


// When clicked extension icon
// chrome.browserAction.onClicked will not fire if the browser action has a popup
// https://developer.chrome.com/extensions/browserAction#event-onClicked
chrome.browserAction.onClicked.addListener( (activeTab) => {
    toggleTab();
});

// Handling incoming messages
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.from == "popup") {
        log("Pop from popup " + request.subject);
        if(request.subject == 'action') toggleTab();
        if(request.subject == 'form') {
            log("From popup form: " + request.show);
            let new_show = parseInt(request.show) + 1;
            let state_update = false;
            if(_tab_id > 0) state_update = true;
            sendResponse({ show: new_show, state: state_update });
        }
        if(request.subject == 'zeitgeist') sendResponse({ msg: Zeitgeist });
        if(request.subject == 'rss') sendResponse({ msg: RssTitles });
        if(request.subject == 'extracted') sendResponse({ msg: Extracted });
    }
    // Only react to messges from Foogle tab
    if( sender.tab !== undefined && sender.tab.id == _tab_id ) {
        if( request.content_log) content_log(request.content_log);
        if( request.html_) { 
            log("html received");
            extractQueries(request.html_);
        }
    }
    // sendResponse({ message: "📬 Background has received your message" });
});

start();
