// content.js
// @flow
// @flow-NotIssue
"use strict"

var max_t = 5;

function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function bg_log(msg) {
    // Log into background.js
    chrome.runtime.sendMessage({ content_log: msg }, () => {});
}
function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
function getTimingArray() {
    let timers = [];
    for (let i=0; i<5; i++) {
        // typing is slow when form is in the background tab
        // (throttled to 1% in Chrome)
        timers.push(Math.floor(Math.random()*max_t))
    }
    return timers.sort();
}
function downKey(chara, searchBox) {
    let charCode = chara[chara.length-1].charCodeAt(0)
    let evtDown = new KeyboardEvent("keydown", {"charCode":charCode} );
    searchBox.dispatchEvent(evtDown)
}
function pressKey(chara, searchBox) {
    let charCode = chara[chara.length-1].charCodeAt(0)
    let evtPress = new KeyboardEvent("keypress", {"charCode":charCode});
    searchBox.dispatchEvent(evtPress)
}
function inputChar(chara, searchBox) {
    let ev = document.createEvent("Event");
    ev.initEvent("input", true, false);
    searchBox.dispatchEvent(ev);
}
function releaseKey(chara, searchBox) {
    let charCode = chara[chara.length-1].charCodeAt(0)
    let evtUp = new KeyboardEvent( "keyup", {"charCode":charCode});
    searchBox.dispatchEvent(evtUp)
}
function getButton() {
    let bttn = getElementsByAttrValue(document,'button', 'name', 'btnG' );
    if ( !bttn ) bttn = getElebmentsByAttrValue(document,'button', 'name', 'btnK' );
    return bttn;
}
function clickButton() {
    let button = getButton()
    clickElement(button);
    bg_log("search button click")
}
function clickElement(element) {
    let win = document.defaultView;
    if ( !element) return;
    let timers =  getTimingArray();
    let evtDown = new MouseEvent ("mousedown");
    window.setTimeout(function(){
        element.dispatchEvent(evtDown);
    },timers[0])
    let evtUp = new MouseEvent ("mouseup");
    window.setTimeout(function(){
        element.dispatchEvent(evtUp);
    },timers[1])
    let evtCl = new MouseEvent ("click");
    window.setTimeout(function(){
        element.dispatchEvent(evtCl);
    },timers[2])
}
function getElementsByAttrValue(dom, nodeType, attrName, nodeValue) {
    let outlines = dom.getElementsByTagName(nodeType);
    for (let i = 0; i<outlines.length; i++) {
        if (outlines[i].hasAttribute(attrName) && outlines[i].getAttribute(attrName) == nodeValue )
            return outlines[i];
    }
    return null;
}
function getElement(doc, aID){
    return (doc.getElementById) ? doc.getElementById(aID): doc.all[aID];
}
function typeQuery( queryToSend, currIndex, searchBox, chara, isIncr ) {
    let nextPress ;
    clickElement(searchBox);
    searchBox.focus();
    if (currIndex < queryToSend.length  ) {
        let newWord = queryToSend.substring(currIndex).split(" ")[0];
        chara.push(queryToSend[currIndex])
        let timers =  getTimingArray();
        let textvalue = queryToSend[currIndex];
        window.setTimeout( function(){
            return downKey(chara, searchBox)
        }, timers[0]);
        window.setTimeout( function(){
            return pressKey(chara, searchBox)
        }, timers[1]);
        window.setTimeout( function(){
            return inputChar(chara, searchBox)
        }, timers[2]);
        window.setTimeout( function(){
            searchBox.value += textvalue
        }, timers[3]);
        window.setTimeout( function(){
            return releaseKey( chara, searchBox)
        }, timers[4]);
        bg_log(searchBox.value);
        currIndex++
        nextPress = roll(5, 2*max_t);
        window.setTimeout(typeQuery, nextPress, queryToSend, currIndex, searchBox, chara.slice(), false)
    } else {
        bg_log(searchBox.value);
        nextPress = roll(max_t, 2*max_t);
        window.setTimeout(clickButton, nextPress);
    }
}
function sendQuery(queryToSend)  {
    let searchBox = getElementsByAttrValue(document,'input', 'name', 'q' );
    let searchButton = getButton();
    if ( searchBox && searchButton) {
        // searchBox.value = getCommonWords(searchBox.value, queryToSend).join(' ');
        searchBox.value = '';
        searchBox.selectionStart = 0;
        searchBox.selectionEnd = 0;
        let chara = new Array();
        typeQuery( queryToSend, 0, searchBox, chara, false );
        return null;
    }
}
function sendPage() {
    let _html = document.defaultView.document.body.innerHTML
    chrome.runtime.sendMessage({html_: _html});
    bg_log("html sent");
}
// Listening to messages in Context Script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    let query = request.query;
    console.log(query);
    sendQuery(query);
    sendResponse({ message: '📬 Content script has received query >>' +  query })
})

document.addEventListener('visibilitychange', function(){
    // background pages are throttled by Chrome to 1% CPU max. 
    // This makes simulated typing, clicking unnaturally slow
    // document.title = document.hidden; // change tab text for demo
    if (document.hidden) {
        max_t = 5;
        bg_log("Hidden " + max_t);
    } else {
        max_t = 25;
        bg_log("Not hidden " + max_t);
    }
}, false)
// log URL to background
var URL = document.location.href;
bg_log(URL);
sendPage();
