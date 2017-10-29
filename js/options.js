
var background = chrome.extension.getBackgroundPage(); 
var filteredWordsContainer = document.getElementById("filtered-words");
var addWordBtn = document.getElementById("add-word");
var newWord = document.getElementById("new-word");
var searchInput = document.getElementById("search");
// var Zeitgeist = [""];
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
    console.log(JSON.stringify(background[TableName]));
    chrome.storage.sync.get(TableName, (obj) => {
        if(obj === undefined) {
            Table = background[TableName];
        } else {
            Table = obj[TableName];
        }
        console.log(JSON.stringify(Table));
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
        "action": "reload-data"
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
    for (let i = 0; i < Table.length; i++) {
        let entry = getFilteredWordEntry(i);
        var regx = new RegExp(searchText);
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
    chrome.storage.sync.remove(TableName);
    // background.js
    chrome.runtime.sendMessage({
        "from": "options",
        "subject": "action",
        "action": "reload-data"
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
    save(Table, TableName);
}

/*
 * creates an entry for the word
 * container, delete button, text field and stuff
 */
function addWord(text, index) {
    filteredWordsContainer = document.getElementById("filtered-words");
    let container = document.createElement("div");
    container.class = "float-right";
    container.dataset.index = index;

    let input = document.createElement("input");
    input.type = "text";
    input.class = "";
    input.readOnly = true;
    input.value = text;

    let deleteBtn = document.createElement("button");
    let textNode = document.createTextNode("Delete");
    deleteBtn.appendChild(textNode);
    deleteBtn.className = "button button-small button-outline";
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
    for (let item of changedItems) {
        if(item == TableName) {
            console.log(item + " has changed:");
            location.reload();
        }
    }
}


chrome.storage.onChanged.addListener(doStorageChange);

document.addEventListener('DOMContentLoaded', () => {

    addWordBtn = document.getElementById("add-word");
    resetWordBtn = document.getElementById("reset-words");
    newWord = document.getElementById("new-word");
    searchInput = document.getElementById("search");

    TableName = "Zeitgeist";
    load();

    addWordBtn.addEventListener("click", addSpecifiedWord);
    resetWordBtn.addEventListener("click", resetWordsList);
    // triggered when search value's changed
    searchInput.addEventListener("input", search);
    document.onkeydown = processKeys;

});

window.onload = function() {
    console.log("onload " + Date());
}
