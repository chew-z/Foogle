// background.js
// @flow
// @flow-NotIssue
"use strict"

// Extracted - if too large (c.a. 60) and we hit
// chrome.storage.sync.QUOTA_BYTES_PER_ITEM
const MAX_EXTRACTED = 40;       
var query_history_max = 100;    // QueryHistory
var refresh_interval = 180;     //In minutes
var q_per_hour = 40;            // How many queries per hour 40 is for testing
var typing_speed = 190;         // chars per minute

var _tab_id = -1;               // Foogle tab ID
var debug = true;
// Zeitgeist, RssTitles and other Tables are declared in queries.js 
// which is included see manifest.json
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
        changedItems.forEach( (key) => {
            console.log(key + " has changed:");
            console.log("Old value: ");
            console.log(changes[key].oldValue);
            console.log("New value: ");
            console.log(changes[key].newValue);
        });
    }
}


function doStorageChange(changes, area) {
    let changedItems = Object.keys(changes);
    changedItems.forEach( (key) =>  {
        if(key == "q_per_hour") q_per_hour = changes[key].newValue;
        if(key == "typing_speed") { 
            typing_speed = changes[key].newValue;
            if (_tab_id > 0) {
                chrome.tabs.sendMessage(_tab_id, { 
                    "subject": "typing_speed", 
                    "typing_speed": typing_speed 
                }, (response) => {
                    console.log(response)
                })
            }
        }
        if(key == "refresh_interval") refresh_interval =  changes[key].newValue;;
        if(key == "query_history_max") query_history_max =  changes[key].newValue;;
    });
    logStorageChange(changes, area);
}


function restoreOptions() {
    chrome.storage.sync.get("q_per_hour", (obj) => {
        if(obj.hasOwnProperty("q_per_hour") ) q_per_hour = obj.q_per_hour;
    });
    chrome.storage.sync.get("typing_speed", (obj) => {
        if(obj.hasOwnProperty("typing_speed")) typing_speed = obj.typing_speed;
    });
    chrome.storage.sync.get("query_history_max", (obj) => {
        if(obj.hasOwnProperty("query_history_max") ) query_history_max = obj.query_history_max;
    });
    chrome.storage.sync.get("refresh_interval", (obj) => {
        if(obj.hasOwnProperty("refresh_interval")) refresh_interval = obj.refresh_interval;
    });
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


function set_storage_variable (Variable, VariableName) {
    chrome.storage.sync.get(VariableName, (obj) => {
        if(obj.hasOwnProperty(VariableName) && obj.VariableName === Variable ) {
            // PASS
        } else {
            console.log("Refreshing " + VariableName);
            chrome.storage.sync.set({  [VariableName]: Variable });
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
            if(minutes(now - obj.last_refresh) > refresh_interval) {
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
    restoreOptions();
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
        chrome.tabs.remove(_tab_id);
        return 0;
    } catch (exception) {
        console.log('Could not create Foolgle tab:' + exception);
        return 1;
    }
}


function toggleTab() {
    if (_tab_id != -1) { // Not initiation. Toggle Foogle tab.
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
        chrome.tabs.update(tab_id, {url: newURL});
    } catch (exception) {
        console.log('Could not update Foolgle tab:' + exception);
        return -1;
    }
    return 0;
}


function sendQuery(tab_id, query) {
    chrome.tabs.sendMessage(tab_id, { "subject": "query", "query": query }, (response) => {
        console.log(response)
    });
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
chrome.tabs.onUpdated.addListener((tabId , info) => {
    if (tabId == _tab_id && info.status === 'complete') {
        if(debug) console.log("Foolgle tab " + tabId + " completed loading");

        let query = getQuery();
        // save_history(query) is async and slow !
        // hence QueryHistory is acting like a local cache for chrome.storage
        // if(debug) console.log("QueryHistory: " + Object.prototype.toString.call(QueryHistory));
        QueryHistory.push(query);
        // if(debug) console.log("QueryHistory: " + JSON.stringify(QueryHistory));
        if(QueryHistory.length > query_history_max) {
            QueryHistory = QueryHistory.slice(QueryHistory.length - 100, 200);
            if(debug) console.log("Pruning history ..");
        } 
        // save_history(QueryHistory);
        save("QueryHistory");
        // Schedule next query
        let t_out = roll_exponential(q_per_hour); 
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


chrome.storage.onChanged.addListener(doStorageChange);


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
    if (request.from == "content" && request.subject == "typing_speed") {
        console.log("From content: " + request.subject);
        sendResponse({"typing_speed": typing_speed});
    }
    // Only react to messages from Foogle tab
    if( sender.tab !== undefined && sender.tab.id == _tab_id ) {
        if( request.content_log) content_log(request.content_log);
        if( request.html_) {
            console.log("html received");
            extractQueries(request.html_);
        }
    }
});

start();
