// background.js
// @flow
// @flow-NotIssue
"use strict"

function minutes(msecs) {
    return Math.floor(msecs / 60000)
}

function minutes_seconds(millis) {
  let minutes = Math.floor(millis / 60000);
  let seconds = ((millis % 60000) / 1000).toFixed(0);
  // return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
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


// Geometric random number generator
// Number of failures before the first success, supported on the set {0, 1, 2, 3, ...}
function roll_geometric(successProbability, randomUniform) {
  // http://en.wikipedia.org/wiki/Geometric_distribution#Related_distributions
  successProbability = successProbability || 1 - Math.exp(-1); // Equivalent to rate = 1
  let rate = -Math.log(1 - successProbability);
  return Math.floor(roll_exponential(rate, randomUniform));
}


function box_muller() {
    // Normal distribution using Box-Muller transform.
    let u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
    let v = 1 - Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// https://stackoverflow.com/questions/16110758
function beta() {
    return Math.pow(Math.sin(Math.random() * Math.PI/2), 2)
}


function beta_left() {
    let b = beta();
    return (b < 0.5) ? 2*b : 2*(1-b);
}


function roll_beta_left(min, max) {
    return Math.floor(beta_left() * (max - min + 1)) + min;
}


function roll_gauss(min, max) {
    return Math.floor(box_muller() * (max - min + 1)) + min;
}

function randomElement(array) {
    if ( array.length == 0 )
        throw new Error(" randomElement: empty array " + array.toString());
    else if (array.length == 1)
        return array[0];
    else {
        let index = roll(0, array.length - 1);
        // if(debug) log('randomElement: ' + array[index]);
        return array[index];
    }
}


// randomize order of array elements
function shuffleArray(a) {
    let currentIndex = a.length, tempValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        tempValue = a[currentIndex];
        a[currentIndex] = a[randomIndex];
        a[randomIndex] = tempValue;
    }
    return a;
}


// True if intersection of array A & array B not empty
function isIntersection(a, b) {
    let i = a.length;
    while(i--) {
        if( b.indexOf( a[i] ) > -1 )
            return true;
    }
    return false
}

