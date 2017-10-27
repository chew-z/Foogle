// background.js
// @flow
// @flow-NotIssue
"use strict"

var _tab_id = -1;
var debug = true;
var QueryHistory = [];

function log(message) {
    console.log(JSON.stringify(message));
}


function content_log(message) {
    // logging messages from content.js
    console.log("CONTENT: " + JSON.stringify(message));
}


// Saves options to chrome.storage.sync.
function save_history(q) {
    chrome.storage.sync.get('history', (obj) => {
        let history = obj.hasOwnProperty('history') ? obj.history : [];
        history.push(q);
        chrome.storage.sync.set({'history': history}, () => {
            if (chrome.runtime.lastError)
                console.log(chrome.runtime.lastError);
            else
                console.log("History saved successfully");
        });
    });
}

function restore_history() {
    chrome.storage.sync.get('history', (obj) => {
        QueryHistory = obj.hasOwnProperty('history') ? obj.history : [];
    });
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
    log("start() finished");
}


function createTab() {
    if (debug) log('Creating new tab for Foogle')
    // let newURL = "http://www.duckduckgo.com/html";
    let newURL = "http://www.google.com/";
    try {
        //@flow-NotIssue
        chrome.tabs.create({'active': false, 'url': newURL}, (tab) => { 
            _tab_id = tab.id;
            if(debug) log("Created Foolgle tab " + tab.id);
            chrome.runtime.sendMessage({msg: "tab created"});
            chrome.browserAction.setBadgeText({'text': 'On'});
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
        if(debug) log("Foogle just started. Creating new tab.");
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
// When this message comes _tab_id is still undefinied !? so it is useless
chrome.tabs.onCreated.addListener( (tab) => {
    if(debug) log("received message tab created " + tab.id);
});

// When tab removed - does not fire when flag --enable-fast-unload is set!
chrome.tabs.onRemoved.addListener( (tabId, removeInfo) => {
    if(tabId == _tab_id) {
        chrome.runtime.sendMessage({msg: "tab closed"});
        chrome.browserAction.setBadgeText({'text': 'Off'});
        _tab_id = 0;
    }
});

// When tab updated
//@flow-NotIssue
chrome.tabs.onUpdated.addListener((tabId , info) => {
    if (tabId == _tab_id && info.status === 'complete') {
        if(debug) log("Foolgle tab " + tabId + " completed loading");
        let t_out = roll(20000, 50000);
        let query = getQuery();
        // save_history(query) is async and slow !
        // hence QueryHistory is acting like a local cache for chrome.storage
        if(debug) log("QueryHistory: " + JSON.stringify(QueryHistory));
        if(QueryHistory.length > 200) {
            QueryHistory = QueryHistory.slice(QueryHistory.length - 100, 200);
            chrome.storage.sync.remove(history, () => {
                if(debug) log("Pruning history ..");
                save_history(QueryHistory);
            });
        } else {
            save_history(query)
        }
        setTimeout(() => {
            sendQuery(_tab_id, query);
            restore_history();
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
            sendResponse({ show: new_show, });
        }
        if(request.subject == 'zeitgeist') sendResponse({ msg: Zeitgeist });
        if(request.subject == 'rss') sendResponse({ msg: RssTitles });
        if(request.subject == 'extracted') sendResponse({ msg: Extracted });
        if(request.subject == 'history') sendResponse({ msg: QueryHistory });
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
