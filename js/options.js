// background.js
// @flow
// @flow-NotIssue
"use strict"


var background = chrome.extension.getBackgroundPage();

var filteredWordsContainer = document.getElementById("filtered-words");
var addWordBtn = document.getElementById("add-word");
var newWord = document.getElementById("new-word");
var searchInput = document.getElementById("search");

var Table = [""];
var TableName;


function processKeys(e) {
    if (e.keyCode == 13)
        addSpecifiedWord();
}


/* list all background variables and their values */
function _inspect_background() {
    console.log("background: " + Object.prototype.toString.call(background));
    for(let b in background) {
        if(window.hasOwnProperty(b)) console.log(b);
    }
    // WILL fail for some b console.log(JSON.stringify(background[b]));
}


function load() {
    chrome.storage.sync.get(TableName, (obj) => {
        if(obj.hasOwnProperty(TableName)) {
            Table = obj[TableName];
            // if(debug) console.log("storage: " + JSON.stringify(Table));
        } else {
            Table = background[TableName];
            // if(debug) console.log("background: " + JSON.stringify(Table));
        }
        for (let i = 0; i < Table.length; i++)
            addWord(Table[i], i);
    });
}


/*
 * saves the filtered word list content
 * and reloads the word list on the other files
 */
function save() {
    chrome.storage.sync.set({[TableName]: Table}, () => {
        if (chrome.runtime.lastError)
            console.log(chrome.runtime.lastError);
        else
            console.log(TableName + " saved successfully");
    });
    // background.js
    chrome.runtime.sendMessage({
        "from": "options",
        "subject": "action",
        "action": "reload_data",
        "table": TableName
    });
}


function search() {
    let searchText = searchInput.value;
    // if input's empty
    // displaying everything
    if (searchText == "") {
        showAllFilteredWordEntries();
        return;
    }

    // hiding everything except the matched words
    for(let i = 0; i < Table.length; i++) {
        let entry = getFilteredWordEntry(i);
        let regx = new RegExp(searchText);
        if (regx.test(Table[i]))
            entry.hidden = false;
        else
            entry.hidden = true;
    }
}


function getIndexInParent(element) {
    let parent = element.parentElement;
    for (let i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i] == element)
            return i;
    }
    return -1;
}


/**
 * goes through filtered word list
 * and finds the one with the specified index
 */
function getFilteredWordEntry(index) {
    var nodes = filteredWordsContainer.childNodes;
    return nodes[index];
}


function showAllFilteredWordEntries() {
    let nodes = filteredWordsContainer.childNodes;
    nodes.forEach( (n) => { n.hidden = false; });
    // for (let i = 0; i < nodes.length; i++)
    // nodes[i].hidden = false;
}


function resetWordsList() {
    if(TableName == "Zeitgeist" || TableName == "RssTitles") {
        chrome.storage.sync.remove(TableName);
    }
    // background.js
    chrome.runtime.sendMessage({
        "from": "options",
        "subject": "action",
        "action": "reload_data",
        "table": TableName
    });
    Table = [""];
    location.reload();
}


/**
 * deletes the specified word form
 * the list
 */
function deleteWord() {
    let entryContainer = this.parentElement;
    let index = getIndexInParent(entryContainer);
    // deleting data entry
    Table.splice(index, 1);
    // deleting the visual element for the entry
    entryContainer.remove();
    save();
}


/*
 * creates an entry for the word
 * container, delete button, text field and stuff
 */
function addWord(text, index) {
    filteredWordsContainer = document.getElementById("filtered-words");
    let container = document.createElement("div");
    container.class = "container";
    container.dataset.index = index;

    let input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.value = text;
    input.className = "input input-list";

    let deleteBtn = document.createElement("button");
    let textNode = document.createTextNode("Delete");
    deleteBtn.appendChild(textNode);
    deleteBtn.className = "button button-delete button-outline";
    // deleteBtn.style = "float: right;";
    deleteBtn.addEventListener("click", deleteWord );

    container.appendChild(input);
    container.appendChild(deleteBtn);
    filteredWordsContainer.appendChild(container);

}


/*
 * adds a new word
 * specified in the input field
 */
function addSpecifiedWord() {
    let text = newWord.value;
    if (text == "") {
        console.log("Cannot add an empty value!");
        return;
    }
    if( TableName == "feedList" && Table.length >= background.feeds_max)
        Table.shift();
    if( TableName == "QueryHistory" && Table.length >= background.query_history_max)
        Table.shift();
    if( TableName == "Extracted" && Table.length >= background.MAX_EXTRACTED)
        Table.shift();
    addWord(text, Table.length);
    Table.push(text);
    save();
    newWord.value = "";
    // necessary to filter out added word
    // if necessary
    search(Table);
}


function doStorageChange(changes, area) {
    let changedItems = Object.keys(changes);
    changedItems.forEach( key => {
        if(key == TableName) {
            console.log(key + " has changed:");
            location.reload();
        }
    });
}


chrome.storage.onChanged.addListener(doStorageChange);


document.addEventListener('DOMContentLoaded', () => {
    newWord = document.getElementById("new-word");
    addWordBtn = document.getElementById("add-word");
    searchInput = document.getElementById("search");
    addWordBtn.addEventListener("click", addSpecifiedWord);

    let resetWordBtn = document.getElementById("reset-words");
    let selectTable = document.getElementById("selectTable");
    let typingSpeed = document.getElementById("typingSpeed");
    let querySpeed = document.getElementById("querySpeed");
    let refreshInterval = document.getElementById("refreshInterval");
    let queryHistoryMax = document.getElementById("queryHistoryMax");

    queryHistoryMax.value = background.query_history_max;
    refreshInterval.value = background.refresh_interval;
    typingSpeed.value = background.typing_speed;
    querySpeed.value = background.q_per_hour;
    selectTable.value = background.options_select;
    TableName = background.options_select;;
    load();

    resetWordBtn.addEventListener("click", resetWordsList);

    selectTable.addEventListener("change", () => {
        background.options_select = selectTable.value;
        location.reload();
    });
    
    queryHistoryMax.addEventListener("input", () => {
        chrome.storage.sync.set({ "query_history_max": queryHistoryMax.value } );
    });
    refreshInterval.addEventListener("input", () => {
        chrome.storage.sync.set({ "refresh_interval": refreshInterval.value } );
    });
    typingSpeed.addEventListener("input", () => {
        chrome.storage.sync.set({ "typing_speed": typingSpeed.value } );
    });
    querySpeed.addEventListener("input", () => {
        chrome.storage.sync.set({ "q_per_hour": querySpeed.value } );
    });
    // triggered when search value's changed
    searchInput.addEventListener("input", search);

    document.onkeydown = processKeys;

});
