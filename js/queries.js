// background.js
// @flow
// @flow-NotIssue
"use strict"


const skipex = [/mins ago/, /days ago/, /hours ago/, /1 day ago/, /1 hour ago/,
    /200/i, /201/i, /Thesaurus/i, /Breaking news/, /Latest news/,
    /Top stories/, /headlines/, /Enjoy/, /Exclusive/, /Reuters News/,
    /Define/, /Definition/, /definition/, /The Urban Dictionary/,
    /calendar/i, /advanced/i, /click /i, /terms/i, /Groups/i,
    /Images/, /Maps/, /search/i, /cache/i, /similar/i, /&#169;/,
    /sign in/i, /help/i, /download/i, /print/i, /Books/i, /rss/i,
    /google/i, /bing/i, /yahoo/i, /aol/i, /html/i, /ask/i, /xRank/,
    /permalink/i, /aggregator/i, /trackback/, /comment/i, /More/,
    /business solutions/i, /result/i, / view /i, /Legal/, /See all/,
    /links/i, /submit/i, /Sites/i, / click/i, /Blogs/, /See your mess/,
    /feedback/i, /sponsored/i, /preferences/i, /privacy/i, /News/,
    /Finance/, /Reader/, /Documents/, /windows live/i, /tell us/i,
    /shopping/i, /Photos/, /Video/, /Scholar/, /AOL/, /advertis/i,
    /Webmasters/, /MapQuest/, /Movies/, /Music/, /Yellow Pages/,
    /jobs/i, /answers/i, /options/i, /customize/i, /settings/i,
    /Developers/, /cashback/, /Health/, /Products/, /QnABeta/,
    /<more>/, /Travel/, /TripAdvisor/, /Personals/, /Local/, /Trademarks/,
    /cache/i, /similar/i, /login/i, /mail/i, /feed/i, /Followers/,
    /likes/, /Following/, /http/i]
var feedList = ["http://feeds.reuters.com/reuters/MostRead", "http://feeds.feedburner.com/itunes-alternative-chart", "http://stackoverflow.com/feeds/tag/android+or+html+or+javascript+or+python", "https://news.ycombinator.com/rss"];
const feedZeitgeist = "https://trends.google.com/trends/hottrends/atom/feed?pn=p5";
var RssTitles = [];
var Extracted = [];
var Zeitgeist = [];
var QueryHistory = [];

function chomp(s) {
    return s.replace(/\n/g, '');
}


// Extract titles from RSS feed
function extractRssTitles(xmlData, feedUrl, RssTarget, RssTargetName) {
    let rssTitle = "";
    let feedTitles = xmlData.getElementsByTagName("title");
    // if(debug) console.log(feedTitles);
    if (!feedTitles || feedTitles.length < 2) {
        console.log("no items(" + feedTitles + ") for rss-feed: " + feedUrl);
        return -1;
    }
    let feedObject = {};
    feedObject.name = feedTitles[0].firstChild.nodeValue;
    feedObject.words = [];
    if(debug) console.log('extractRssTitles : ' + feedTitles[0].firstChild.nodeValue);
    for (let i = 1; i < feedTitles.length; i++) {
        if (feedTitles[i].firstChild) {
            rssTitle = feedTitles[i].firstChild.nodeValue;
        }
        // remove leading numbers in lists like iTunes Top 100
        rssTitle = rssTitle.replace(/\d{1,3}\.\s/g, '');
        rssTitle = rssTitle.replace(/ and | with | a | an | any | it | in | has /gm, ' ');
        // if(debug) console.log(rssTitle);
        RssTarget.push(rssTitle);
        // addQuery(rssTitle, feedObject.words);
        // addQuery(rssTitle, RssTitles);
    }
    if(RssTargetName == "Zeitgeist") {
        save("Zeitgeist");
    } else if (RssTargetName == "RssTitles") {
        save("RssTitles");
    } else {
        console.log("Unknown RssTarget " + RssTargetName);
        return -1
    }
    // chrome.storage.sync.set({[RssTargetName]: RssTarget}, () => {
    //     // Computed property here (ES6) - [RssTargetName]
    //     // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#Computed_property_names
    //     if (chrome.runtime.lastError)
    //         console.log(chrome.runtime.lastError);
    //     else
    //         console.log(RssTargetName + " saved successfully");
    // }); 
    //@flow-NotIssue
    // if(debug) console.log('RssTitles : ' + feedObject.name + " --- " + feedObject.words);
    // if(debug) console.log(RssTitles);
    return 0;
}

// Target is the array storing feed headlines
// We need TargetName (the name of array that stores the date) for storage !
// This is Poor-Man's storage.onChanged method oh handling async call here
function doRssFetch(feedUrl, Target, TargetName) {
    if(debug) console.log('doRssFetch: ' + feedUrl);
    try {
        let req = new XMLHttpRequest();
        req.open('GET', feedUrl, true); // false == not async but this is depreciated
        req.onreadystatechange = function() {
            if (req.readyState == 4 && req.status == 200 && req.responseXML != null) {
                if(debug) console.log("doRssFetch: Recieved feed from " + feedUrl);
                let adds = extractRssTitles(req.responseXML, feedUrl, Target, TargetName);
                // if(debug) console.log(req.responseXML);
                // if(debug) console.log(req.responseText);
            }
        }
        req.send();
        return 0;
    } catch (ex) {
        console.log("[WARN]  doRssFetch(" + feedUrl + ")\n" +
            "  " + ex.message + " | Using defaults...");
        return -1;
    }
}


//TODO - improve skipex - only crap sentences ?
function querySkip(a) {
    for (let i = 0; i < skipex.length; i++) {
        if (skipex[i].test(a))
            return skipex[i];
    }
    return false;
}

// Extracts possible keywords from text
// Uppercase word followed by more Uppercase words - most likely to be a keyword
// Saddly doesn't work for non-Latin languages - TODO?
function getKeywords(query) {
    let queryWords = query.split(' ');
    let i = queryWords.length;
    let rank = new Array(queryWords.length);
    let upper = new RegExp(/[A-Z]|[\u0080-\u024F]/);
    let digit = new RegExp(/[0-9]/);

    // if(debug) console.log('getKeywords: ' + query);
    rank.fill(0);
    while (i--) { // 1st loop - rank words begining with Uppercase +1
        let word = queryWords[i]
        if ( word.length < 1 ) {            // empty words - rank -1
            rank[i] = -1;
            continue;
        }
        // if(debug) console.log('getKeywords: ' + word);
        let s = word.charAt(0);
        if  ( s === s.toUpperCase() && upper.test(s) ) { // rank +1
            rank[i] = 1;
        } else  if  ( digit.test(s) ) {     // digits rank -1
            rank[i] = -1;
        }
    }
    // if(debug) console.log('getKeywords: ' + rank);
    i = queryWords.length - 1;
    while (i--) { // 2nd loop - rank sequence of Uppercase words
        if ( rank[i] < 1 ) continue;  // skip empty and digits
        if ( rank[i+1] > 0 )
            rank[i] += rank[i+1];     // rank = length of sequence
    }
    // if(debug) console.log('getKeywords: ' + rank);
    i =  0;
    let keyWords = [];
    while (i < queryWords.length) { // 3rd loop - select sequence of two or more
        if( rank[i] > 1 ) {
            let keyword = queryWords.slice(i, i + rank[i]).join(' ');
            // if(debug) console.log('getKeywords: ' + keyword);
            keyWords.push(keyword);
            i = i + rank[i]; // and move iteration to the end of sequence
        } else { // move to next
            i = i + 1;
        }
    }
    if ( keyWords.length > 0 ) {
        if(debug) console.log('getKeywords: keywords: ' + keyWords);
    }
    return keyWords; // it can return empty [] - so check results
}


// TODO - works but generates too much gibberish
function nlpQuery(query) {
    let interesting = [];
    let interestingPartOfSpeech = ['Acronym', 'Person', 'City', 'Place', 'Organization'];
    let ng = []
    //@flow-NotIssue
    let text = nlp(query);
    let terms = text.terms().data();
    let topics = text.topics().data();
    // if(debug) console.log(terms);
    // if(debug) console.log("NLP topics:" + topics);

    for(let j=0; j < terms.length; j++) {
        // if(debug) console.log('nlpQuery: tags: ' + terms[j].text + ' : ' + terms[j].tags.join(' - '));
        if ( isIntersection( interestingPartOfSpeech, terms[j].tags ) ) {
            interesting.push( terms[j].text );
        }
        if ( terms[j].tags.indexOf( 'Noun' ) > -1 || terms[j].tags.indexOf( 'Gerund' ) > -1 ) {
            ng.push( terms[j].text );
        }
    }
    let uniqueInteresting = interesting.filter(function(elem, index, self) {
        return index == self.indexOf(elem);
    })
    // console.log('nlpQuery: Acronym/Person/City/Place/Organization: ' + uniqueInteresting.join(' - '));
    let uniqueNG = ng.filter(function(elem, index, self) {
        return index == self.indexOf(elem);
    })
    // console.log('nlpQuery: NounGeround: ' + uniqueNG.join(' - '));
    if(uniqueNG.length > 2) {
        let len = roll_gauss(1, uniqueNG.length - 1);
        let n = shuffleArray(uniqueNG).slice(0, len).join(' ');
        if(debug) console.log('nlpQuery: NG: ' + n + ' <-- ' + query );
        return n;
    } else if ( uniqueInteresting.length > 2 ) {
        let i = randomElement(uniqueInteresting);
        if(debug) console.log('nlpQuery: interesting: ' + i + ' <-- ' + query );
        return i;
    } else if ( topics.length > 1) {
        //TODO more then one and not short 
        let t = randomElement(topics)
        // @flow-NotIssue
        if(debug) console.log('nlpQuery: topic: ' + t.text + ' <-- ' + query );
        // @flow-NotIssue
        return t.text;
    }
    return query;
}

// randomly with arbitrary weights - either get part of query, try extracting keywords or select random words
// TODO - optimize the flow a little
function getSubQuery(query) {
    // My fair guess - estimated distribution of typical querry length
    let queryWords = query.split(' ');
    let subQuery = query;
    let keywords = getKeywords(query);
    // with arbitrary weights - another fair guess
    if ( Math.random() > 0.5 && keywords.length  > 0 ) {  // try extracting keywords
        subQuery = randomElement(keywords);
        console.log('getSubQuery: Random keywords: ' + subQuery  + ' <-- ' + query);
    } else if (Math.random() < 0.7 ) {                  // select NLP words
        subQuery = nlpQuery(query);
        console.log('getSubQuery: NLP: ' + subQuery  + ' <-- ' + query);
    } else {                                            // select part of query
        let queryLength = queryWords.length;
        let distribution = [1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6, 7, 8];
        let randomLength = distribution[roll(0, distribution.length - 1)];
        //  heavily favor starting at beggining of query
        let randomStart = roll_beta_left(0, queryLength - 1);
        if(debug) console.log('randomStart: ' + randomStart + ' randomLength: ' + randomLength);
        // get query sequence or randomLength (with distribution[] like above)
        subQuery = queryWords.slice(randomStart, Math.min(randomStart + randomLength, queryLength)).join(' ');
        console.log('getSubQuery: Random slice: ' + subQuery + ' <-- ' + query );
    }

    return subQuery
    // shuffle Words, get first few (this is random select), join into query term
    // randomWords = shuffleArray(queryWords).slice(0, randomLength).join(' ');
}


function randomOrganization(queryset) {
    let i = queryset.length;
    let organization = [];
    while(i--) {
        // @flow-NotIssue
        let o = nlp(queryset[i]).organizations().data();
        // if(debug) console.log(p);
        let j = o.length;
        while(j--) {
            console.log(o[j].text);
            organization.push(o[j].text);
        }
    }
    console.log(organization);
    if (organization.length > 0)
        return randomElement(organization).replace(/^\W+/, '');
}


function randomPerson(queryset) {
    let i = queryset.length;
    let person = [];
    while(i--) {
        // @flow-NotIssue
        let p = nlp(queryset[i]).people().data();
        // if(debug) console.log(p);
        let j = p.length;
        while(j--) {
            console.log(p[j].text);
            person.push(p[j].text);
        }
    }
    console.log(person);
    if (person.length > 0)
        return randomElement(person).replace(/^\W+/, '');
}


function randomPlace(queryset) {
    let i = queryset.length;
    let place = [];
    while(i--) {
        // @flow-NotIssue
        let p = nlp(queryset[i]).places().data();
        // if(debug) console.log(p);
        let j = p.length;
        while(j--) {
            console.log(p[j].text);
            place.push(p[j].text);
        }
    }
    console.log(place);
    if (place.length > 0)
        return randomElement(place).replace(/^\W+/, '');
}


function Queries(type) {
    if(type == 'zeitgeist') {
        return Zeitgeist;
    } else if(type == 'rss') {
        return RssTitles;
    } else if(type == 'extracted') {
        return Extracted;
    }
}


// function randomQuery() {
//     let queryset =[];
//     if(Math.Random < 0.5) queryset = Extracted;
//     if(queryset.length == 0) queryset = RssTitles;
//     let term = randomElement(queryset);
//     if(debug) console.log(term);
//     return term;
// }


// here query randomization happens - randomize query type and select random query
// TODO - improve logic - already improved but ..
function randomQuery() {
    let distributionOfQueries = ["zeitgeist", "rss", "rss", "extracted", "extracted", "extracted"];
    let qtype = randomElement(distributionOfQueries);
    while ( Queries(qtype).length == 0) {
        qtype = randomElement(distributionOfQueries);
        if(debug) console.log('randomQuery: while loop: ' + qtype);
    }
    console.log('randomQuery: query type: ' + qtype);
    if (qtype == 'extracted') {
        let queries = Queries(qtype);
        // if(debug) console.log(queries);
        let query = randomElement(queries);
        console.log("extracted query:" + query);
        let term = nlpQuery(query);
        if (term.split(' ').length > 5 ) {
            term = getSubQuery(term);
        }
        return term;
    }
    if (qtype == 'zeitgeist' ) {    // TODO - think of something better here
        let queryset = Queries(qtype);
        let query = randomElement(queryset);
        console.log("zeitgeist term: " + query);
        let term = query;
        return term;
    }
    // rss
    if (qtype != 'extracted' && qtype != 'zeitgeist' ) {
        let queryset = Queries(qtype);
        let query = randomElement(queryset);
        console.log("query rss: " + query);
        let term = nlpQuery(query);
        if (term.split(' ').length > 5 ) {
            term = getSubQuery(term);
        }
        return term;
    }
    if(debug) console.log('randomQuery: term: ' + term);
    if (!term || term.length < 1)
        throw new Error(" randomQuery: term='" + term);

}

// Much much shoter then original which had some weird logic here
function getQuery() {
    let term = chomp(randomQuery());
    while(term.length < 3) {
        term = chomp(randomQuery());
    }
    term = term.replace(/^\s+/, ''); //remove the first space // if (term[0] == ' ') term = term.substr(1);
    if (Math.random() < 0.8) term = term.toLowerCase();
    console.log('getQuery: term: ' + term);
    return term;
}

//Now using XRegExp and allowing also other Unicode scripts not just ISO
// caled by extractQueries() & extractRssTitles()
function addQuery(term, queryList) {
    // TODO - this is duplicating some effort from extractQueries()
    // if(debug) console.log('addQuery: received: ' + term);
    // @flow-NotIssue
    let notNLZ = new XRegExp('[^\\p{N}\\p{L}\\p{Z}@\-]+', 'g'); // NLZ - number, letter, separator
    term = XRegExp.replace(term, notNLZ, '');
    term = term.replace(/\s\s+/g, ' ');
    // if (isBlackList(term))
    //     return false;
    if (!term || (term.length < 3) || (queryList.indexOf(term) > 0))
        return false;
    if (term.indexOf("\"\"") > -1 || term.indexOf("--") > -1)
        return false;
    // test for negation of a single term (eg '-prison')
    if (term.indexOf("-") == 0 && term.indexOf(" ") < 0)
        return false;
    // if(debug) console.log('addQuery: added: ' + term);
    queryList.push(term);

    return true;
}
// extracts queries from HTML with search results
// Heavily fe-factored and more ideas yet
// This if optimized for extracion from Google Search result pages
function extractQueries(html) {
    if (!html) {
        console.log("extractQueries: No HTML!");
        return;
    }
    let possibleSearchResults = html.split("<span class=\"st\">")
    // if (typeof Extracted == 'undefined') Extracted = [];
    let i = possibleSearchResults.length;
    while (i--) {
        let singleSearchResult = possibleSearchResults[i].split('</span>')[0]
        // if(debug) console.log('extractQueries: ' + singleSearchResult);
        // Not too short, not too long
        if (singleSearchResult.length < 16 || singleSearchResult.length > 256) continue;
        // remove remaining HTML  tags
        singleSearchResult = singleSearchResult.replace(/<(?:.|\n)*?>/gm, '');
        // removes '&amp;', '&nbsp;' etc.
        singleSearchResult = singleSearchResult.replace(/&(.*?);/gm, '');
        if (querySkip(singleSearchResult) ) {
            // if(debug) console.log('extractQueries: querySkip: ' + querySkip(singleSearchResult ) + ' : ' + singleSearchResult );
            continue;
        }
        // if(debug) console.log('extractQueries: ' + singleSearchResult);
        // cleans '-' and ',' '.'  '(' ')' '?'
        singleSearchResult = singleSearchResult.replace(/, |- |\. | \(|\) |\? /gm, ' ');
        // remove English language glue
        let cleanSearchResult = singleSearchResult.replace(/ and | with | a | an | any | it | in | has /gm, ' ');
        // let cleanSearchResult = singleSearchResult;
        // console.log('extractQueries: cleaned and added: ' + cleanSearchResult);
        // return results (addQuery() does some more cleaning)
        addQuery(cleanSearchResult, Extracted);
    }
    //  Here we prune extracted queries keeping maximum of MAX_EXTRACTED
    //  Small value aggressively rotate extracted queries (which are high noise)
    //  also with larger vaules (c.a. 60) we hit chrome.storage QUOTA_BYTES_PER_ITEM limit
    while (Extracted.length > MAX_EXTRACTED) {
        console.log("Trimming Extracted queries");
        let r = roll(0, Extracted.length - 1);
        Extracted.splice(r, 1);
    }
    if(debug) console.log(Extracted);
    save("Extracted");

    return 0;
}


