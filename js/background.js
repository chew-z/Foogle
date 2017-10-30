// background.js
// @flow
// @flow-NotIssue
"use strict"

//TODO - user configurable
const REFRESH_INTERVAL = 180;   //In minutes
const MAX_HISTORY = 100;        // QueryHistory
const MAX_EXTRACTED = 40;       // Extracted - too large (c.a. 60) and we hit
                                // chrome.storage.sync.QUOTA_BYTES_PER_ITEM
const Q_PER_HOUR = 40;          // How many queries per hour
                                // 40 is high for testing
var _tab_id = -1;               // Foogle tab ID
var debug = true;
// Zeitgeist, RssTitles and other Tables are declared in queries.js which is included
// see manifest.json
var options_select = "Zeitgeist"; // Select on options.html page. 1st start, later saved to storage


function log(message) {
    console.log(JSON.stringify(message));
}


function content_log(message) {
    // logging messages from content.js
    console.log("CONTENT: " + JSON.stringify(message));
}


/*
Logs that storage area that changed,
then for each item changed,
log its old value and its new value.
*/
function logStorageChange(changes, area) {
    if(debug) {
       console.log("Change in storage area: " + area);
        let changedItems = Object.keys(changes);
        for (let item of changedItems) {
           console.log(item + " has changed:");
           console.log("Old value: ");
           console.log(changes[item].oldValue);
           console.log("New value: ");
           console.log(changes[item].newValue);
        }
    }
}


/* 
 * saves array (by variable name) to chrome.storage
 */
function save(TableName) {
    let Table //TODO - without local copy? Does it matter?
    if(TableName == "Zeitgeist")
        Table = Zeitgeist;
    else if(TableName == "QueryHistory")
        Table = QueryHistory;
    else if(TableName == "RssTitles")
        Table = RssTitles;
    else if(TableName == "feedList")
        Table = feedList;
    else if(TableName == "Extracted")
        Table = Extracted;
    else {
       console.log("Error: Unknown Table " + TableName);
        return -1
    }

    chrome.storage.sync.set({[TableName]: Table}, () => {
        if (chrome.runtime.lastError)
            console.log(chrome.runtime.lastError);
        else
            console.log(TableName + " saved successfully");
    });
    return 0
}


/* 
 * restores array (by variable name) from chrome.storage or re-fetches
 */
function restore(TableName) {
   console.log("restoring " + TableName);
    chrome.storage.sync.get(TableName, (obj) => {
        if(obj.hasOwnProperty(TableName)) {
           console.log("restoring " + TableName + " from storage");
            if(TableName == "QueryHistory") {
                QueryHistory = obj[TableName];
            } else if(TableName == "RssTitles") {
                RssTitles = obj[TableName];
            } else if(TableName == "Zeitgeist") {
                Zeitgeist = obj[TableName];
            } else if(TableName == "Extracted") {
                Extracted = obj[TableName];
            } else if(TableName == "feedList") {
                feedList = obj[TableName];
            }
        } else {
           console.log("re-downloading " + TableName);
            if(TableName == "QueryHistory") {
                QueryHistory = [];
            } else if(TableName == "RssTitles") {
                RssTitles = [];
                feedList.forEach( f => {
                    if(debug) console.log('Start: Fetching RSS ' + f);
                    doRssFetch(f, RssTitles, "RssTitles");
                });
            } else if(TableName == "Zeitgeist") {
                Zeitgeist = [];
                doRssFetch(feedZeitgeist, Zeitgeist, "Zeitgeist"); //doRSSFetch() is async inside
            }
        }
    });
} 


/* 
 * refreshes (clears storage and makes it re-fetch from RSS feeds)
 * after some time had elapsed (days rather then minutes)
 */
function timed_refresh() {
    let now = new Date().getTime();
    chrome.storage.sync.get({ last_refresh: 0 }, (obj) => {
        if(obj.hasOwnProperty('last_refresh')) {
           console.log("Last refresh " + new Date(obj.last_refresh));
            if(minutes(now - obj.last_refresh) > REFRESH_INTERVAL) {
               console.log("Time for refresh");
                // REFRESH - destroy storage and let it be re-download
                chrome.storage.sync.remove("Extracted");
                chrome.storage.sync.remove("Zeitgeist");
                chrome.storage.sync.remove("RssTitles");
                chrome.storage.sync.set({ "last_refresh": now });
            }
        } else {
            chrome.storage.sync.set({ "last_refresh": now });
        }
    });
}


function start() {
    //TODO restoreOptions();
    //
    timed_refresh();
    restore("feedList");
    restore("QueryHistory");
    // timed_refresh removes tables async and it needs some time.
    // we need to get undefined from storage in order to trigger 
    // re-fetching
    setTimeout(() => {
        restore("Extracted");
        restore("Zeitgeist");
        restore("RssTitles");
       console.log("start() finished");
    }, 5000);
}


function createTab() {
    if (debug) console.log('Creating new tab for Foogle')
    // let newURL = "http://www.duckduckgo.com/html";
    let newURL = "http://www.google.com/";
    try {
        //@flow-NotIssue
        chrome.tabs.create({'active': false, 'url': newURL}, (tab) => {
            _tab_id = tab.id;
            if(debug) console.log("Created Foolgle tab " + tab.id);
            chrome.runtime.sendMessage({msg: "tab created"});
            chrome.browserAction.setBadgeText({'text': 'On'});
        });
        return 0;
    } catch (exception) {
       console.log('Could not create Foolgle tab:' + exception);
        return -1;
    }
}


function removeTab() {
    if (debug) console.log('removing Foogle tab');
    try {
        //@flow-NotIssue
        chrome.tabs.remove(_tab_id);
        return 0;
    } catch (exception) {
       console.log('Could not create Foolgle tab:' + exception);
        return 1;
    }
}


function toggleTab() {
    if (_tab_id != -1) { // Not initiation. Toggle Foogle tab.
        //@flow-NotIssue
        chrome.tabs.get(_tab_id, function() {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
                if(debug) console.log("Foogle tab does not exist. Creating");
                createTab();
            } else {
                if(debug) console.log("Foogle tab " + _tab_id + " exists. Removing.");
                removeTab();
            }
        });
    } else {
        if(debug) console.log("Foogle just started. Creating new tab.");
        createTab();
    }
}


function updateTab(tab_id, newURL) {
    try {
        //@flow-NotIssue
        chrome.tabs.update(tab_id, {url: newURL});
    } catch (exception) {
       console.log('Could not update Foolgle tab:' + exception);
        return -1;
    }
    return 0;
}


function sendQuery(tab_id, query) {
    //@flow-NotIssue
    chrome.tabs.sendMessage(tab_id, { "query": query }, (response) => {
       console.log(response)});
}


// When new tab created
// When this message comes _tab_id is still undefinied !? so it is useless
chrome.tabs.onCreated.addListener( (tab) => {
    if(debug) console.log("received message tab created " + tab.id);
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
        if(debug) console.log("Foolgle tab " + tabId + " completed loading");

        let query = getQuery();
        // save_history(query) is async and slow !
        // hence QueryHistory is acting like a local cache for chrome.storage
        // if(debug) console.log("QueryHistory: " + Object.prototype.toString.call(QueryHistory));
        QueryHistory.push(query);
        // if(debug) console.log("QueryHistory: " + JSON.stringify(QueryHistory));
        if(QueryHistory.length > MAX_HISTORY) {
            QueryHistory = QueryHistory.slice(QueryHistory.length - 100, 200);
            if(debug) console.log("Pruning history ..");
        } 
        // save_history(QueryHistory);
        save("QueryHistory");
        // Schedule next query
        let t_out = roll_exponential(Q_PER_HOUR); 
        t_out = Math.floor(t_out * 3600 * 1000); // to miliseconds
        setTimeout(() => { sendQuery(_tab_id, query) }, t_out);
        console.log("Will make new foogle with term '" + query + "', after " + minutes_seconds(t_out) + " minutes.");
    }
});


// When clicked extension icon
// chrome.browserAction.onClicked will not fire if the browser action has a popup
// https://developer.chrome.com/extensions/browserAction#event-onClicked
chrome.browserAction.onClicked.addListener( (activeTab) => {
    toggleTab();
});

chrome.storage.onChanged.addListener(logStorageChange);

// Handling incoming messages
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.from == "popup") {
       console.log("Pop from popup " + request.subject);
        if(request.subject == 'action') toggleTab();
        if(request.subject == 'form') {
           console.log("From popup form: " + request.show);
            let new_show = parseInt(request.show) + 1;
            sendResponse({ show: new_show, });
        }
        if(request.subject == 'zeitgeist') sendResponse({ msg: Zeitgeist });
        if(request.subject == 'rss') sendResponse({ msg: RssTitles });
        if(request.subject == 'extracted') sendResponse({ msg: Extracted });
        if(request.subject == 'history') sendResponse({ msg: QueryHistory });
    }
    if (request.from == "options") {
       console.log("Pop from options " + request.subject);
        if(request.subject == 'action' && request.action == 'reload-data') {
            restore(request.table);
        }
        // if(request.subject == 'action' && request.action == 'start') {
        //     start();
        // }
    }
    // Only react to messages from Foogle tab
    if( sender.tab !== undefined && sender.tab.id == _tab_id ) {
        if( request.content_log) content_log(request.content_log);
        if( request.html_) {
           console.log("html received");
            extractQueries(request.html_);
        }
    }
    // sendResponse({ message: "📬 Background has received your message" });
});

start();
