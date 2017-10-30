// content.js
// @flow
// @flow-NotIssue
"use strict"

var speed_up = 3;
const TYPING_SPEED = 190;   // chars per minute see function next_keypress()
function bg_log(msg) {
    // Log into background.js
    chrome.runtime.sendMessage({ content_log: msg }, () => {});
}

function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* 
 * Exponential random number generator
 * Time until next arrival
 * Buses arrive every 30 minutes on average, so that's an average rate of 2 per hour.
 * Arriving at the bus station, next bus ETA: roll_exponential(2); => 0.32130 hours, 
 * i.e. 19 minutes
*/
function roll_exponential(rate, randomUniform) {
  // http://en.wikipedia.org/wiki/Exponential_distribution#Generating_exponential_variates
  rate = rate || 1;
  // Allow to pass a random uniform value or function - default to Math.random()
  let U = randomUniform;
  if (typeof randomUniform === 'function') U = randomUniform();
  if (!U) U = Math.random();
  return -Math.log(U)/rate;
}

function next_keypress() {
//  avg. 41 WordsPerMinut (Men 44, Women 37) ~= 190 ~ 200 chars per minute.
// average accuracy 92%. Population < 18 y.o. is twice as fast!
// speed_up is compensating for Chrome aggressively throttling background pages
    let t_out = roll_exponential(TYPING_SPEED * speed_up);
    t_out = Math.floor(t_out * 60 * 1000); // to milliseconds
    return t_out;
}


function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
function getTimingArray() {
    let timers = [];
    for (let i=0; i<5; i++) {
        // typing is slow when form is in the background tab
        // (throttled to 1% in Chrome)
        // timers.push(roll(0, speed_up))
        timers.push(next_keypress());
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
        bg_log("Typing: " + searchBox.value);
        currIndex++
        nextPress = next_keypress();
        window.setTimeout(typeQuery, nextPress, queryToSend, currIndex, searchBox, chara.slice(), false)
    } else {
        bg_log("Typing: " + searchBox.value);
        nextPress = next_keypress();
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
    sendResponse({ message: '📬 Content has received query >>' +  query })
})

document.addEventListener('visibilitychange', function(){
    // background pages are throttled by Chrome to 1% CPU max. 
    // This makes simulated typing, clicking unnaturally slow
    // document.title = document.hidden; // change tab text for demo
    if (document.hidden) {
        speed_up = 3;
        bg_log("Foogle tab hidden ");
    } else {
        speed_up = 1;
        bg_log("Foogle tab not hidden ");
    }
}, false)
// log URL to background
var URL = document.location.href;
bg_log(URL);
sendPage();
