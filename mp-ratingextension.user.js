// Extension for MoviePilot to load and add ratings from other movie websites with the help of Google
// 2015-12-12
//
// "THE MOVIE-WARE LICENSE" (Revision 42):
// <rockschlumpf@googlemail.com> wrote this file. As long as you retain this notice you
// can do whatever your want with the content.  If you think it is worth it, feel free to
// send me a movie in return. Kevin Gaarmann
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: http://greasemonkey.mozdev.org/
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// To uninstall, go to Tools/Manage User Scripts,
// select the script, and click Uninstall.
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          MoviePilot Rating-Extension
// @namespace     http://www.moviepilot.de/movies/*
// @description   Script, mit dem die Bewertungen von IMDb und anderen Plattformen ermittelt und angezeigt werden sollen
// @include       http://www.moviepilot.de/movies/*
// @exclude       http://www.moviepilot.de/movies/*/*
// @grant         GM_xmlhttpRequest

// ==/UserScript==

//----- Settings ----------------
  //Request-Settings
var REQ_SYNCHRONOUS = false; // asynchroner oder synchroner Request
var REQ_TIMEOUT = 10000;     // Timeout nach x ms

var LINK_WEBSITES = true;  // Link zu den Webseiten anzeigen
//------/Settings----------------

//-------Constants---------------
var C_SHOWRATINGS = 'showExtRatings';
var C_ID_IMDBRATING = 'imdbRating';
var C_ID_RTRATINGS = 'rtRatings';
var C_ID_RTTOMATOMETER = 'rtTomatometer';
var C_ID_RTCRITICSRATING = 'rtCritRating';
var C_ID_RTCOMMUNITYRATING = 'rtComRating';
var C_ID_MCRATINGS = 'mcMetacritic';
var C_ID_MCCRITICSRATING = 'mcCritRating';
var C_ID_MCCOMMUNITYRATING = 'mcComRating';

var C_ID_WIKIINFO = 'wikiInfo';
//------/Constants---------------

//-----SETUP---------------------
fixMPLayout();
var movieData = getMovieData();
setupExtension();
//-----/SETUP--------------------

//-----Requests------------------
requestIMDBRating();
requestRTRating();
requestMCRating();
requestWikipediaInfo();
//-----/Requests-----------------

//-----Implementierung-----------

function getMovieData() {
  /* Herausfiltern der Film-Informationen der aktuell aufgerufenen Film-Seite auf MP */
  var movieData = document.getElementsByClassName('movie--data')[0];
  titles = getTitles(movieData.children[0].innerHTML);
  titles.push(document.getElementsByClassName('movie--headline')[0].innerHTML);
  var movieData = document.getElementsByClassName('movie--data clearfix')[0];
  var i = 0;
  do{
    i++;
    year = movieData.children[i].innerHTML;
  } while (year.match(/\d\d\d\d/) == null && i < 5)
  
  return [titles, year];
}

function getTitles(title) {
  var atSplit = title.split('/ AT:');
  var slashSplit;
  var titles = [];
  for(var i = 0; i < atSplit.length; i++) {
    slashSplit = atSplit[i].split('/');
    for(var j = 0; j < slashSplit.length; j++) {
      titles.push(slashSplit[j]);
    }
  }
  return titles;
}

function getURLEmbeddedMovieData(movieData) {
  /* Titel und Jahr fuer das Einfuegen in eine URL vorbereiten */
  var title = movieData[0][0].trim();
  var year = movieData[1].trim();
  var embedded = title.replace(/ /g ,"+");
  return embedded +"+"+ year;
}

function fixMPLayout() {
  /* MPs Struktur anpassen, damit alle Bewertungen gleich aussehen */
  var userAction = document.getElementsByClassName('movie_user_action')[0];
  userAction.style.width   = "180px";
  userAction.style.margin  = "0px 25px 0px 25px";
  userAction.style.padding = "0px";
  userAction.style.float   = "left";
  
  var criticsCount = document.getElementsByClassName('criticscount')[0];
  criticsCount.style.width   = "180px";
  criticsCount.style.margin  = "0px 25px 0px 25px";
  criticsCount.style.padding = "0px";
  criticsCount.style.float   = "left";
  
  var contentCount = document.getElementsByClassName('contentcount')[0];
  contentCount.style.width   = "180px";
  contentCount.style.margin  = "0px 25px 0px 25px";
  contentCount.style.padding = "0px";
  contentCount.style.float   = "left";
  
  var huge = document.getElementsByClassName('huge');
  for (i = 0; i < huge.length; i++) {
    huge[i].style.width   = "35px";
    huge[i].style.margin  = "10px 3px 0px 0px";
    huge[i].style.padding = "0px";
    huge[i].style.float   = "left";
    huge[i].style.textAlign   = "center";
  }
  
  var quite = document.getElementsByClassName('quite');
  for (i = 0; i < quite.length; i++) {
    quite[i].style.margin  = "0px";
    quite[i].style.padding = "0px";
    quite[i].style.float   = "left";
  }
}

function setupExtension() {
  /* Aufbau der Extension
   * Einfuegen von Kontrollelementen
   */
  var bewertung = document.getElementsByClassName('forecastcount')[0];
  var parent = bewertung.parentNode;
  
  var ratingExtensionDiv = createElementWithId('div', 'ratingExtension');
  var extRatingsDiv = createElementWithId('div', 'extRatings');
  var ratingExtensionControlDiv = createElementWithId('div', 'ratingExtControl');
  var hr1 = document.createElement('hr');
  var hr2 = document.createElement('hr');  
  var toggleContentButton = createElementWithId('span', 'toggleContentButton');
  var showSettingsButton = createElementWithId('span', 'settingsButton');
  
  var imdbDiv = createElementWithId('div', 'imdb');
  var rtDiv = createElementWithId('div', 'rt');
  var mcDiv = createElementWithId('div', 'mc');
  
  var infoDiv = createElementWithId('div', 'info');
  
  var showRatings = localStorage.getItem("showExtRatings")
  if(getInfoFromLocalStorage(C_SHOWRATINGS)){
    extRatingsDiv.style.display = 'inline'; 
  } else{
    extRatingsDiv.style.display = 'none'; 
  }
  
  ratingExtensionControlDiv.style.margin = '0px 0px 0px 25px';
  
  toggleContentButton.style.color = '#9C9C9C';
  toggleContentButton.style.cursor = 'pointer';
  if(getInfoFromLocalStorage(C_SHOWRATINGS)) {
    toggleContentButton.innerHTML = 'Externe Bewertungen verbergen';
  } else {
    toggleContentButton.innerHTML = 'Externe Bewertungen anzeigen';
  }
  toggleContentButton.onclick = onToggleContentButtonClick;
  
  showSettingsButton.style.color = '#9C9C9C';
  showSettingsButton.style.cursor = 'pointer';
  showSettingsButton.innerHTML = 'Einstellungen';
  showSettingsButton.onclick = onSettingButtonBlick;
  
  hr1.style.margin = '5px 0px 5px 0px';
  hr2.style.margin = '5px 0px 5px 0px';
  
  extRatingsDiv.appendChild(imdbDiv);
  extRatingsDiv.appendChild(rtDiv);
  extRatingsDiv.appendChild(mcDiv);
  
  extRatingsDiv.appendChild(infoDiv);
  
  ratingExtensionDiv.appendChild(hr1);
  ratingExtensionDiv.appendChild(extRatingsDiv);
  ratingExtensionDiv.appendChild(hr2);
  ratingExtensionControlDiv.appendChild(toggleContentButton);
  ratingExtensionControlDiv.appendChild(document.createTextNode(' | '));
  ratingExtensionControlDiv.appendChild(showSettingsButton);
  ratingExtensionDiv.appendChild(ratingExtensionControlDiv);
  parent.insertBefore(ratingExtensionDiv, bewertung.nextSibling);
  
  return extRatingsDiv;
}

function createElementWithId(element, id) {
  var newDiv = document.createElement(element);
  newDiv.id = id;
  return newDiv;
}

function onToggleContentButtonClick() {
  /* Handler fuer Click Event - toggleContentButton */
  var content = document.getElementById('extRatings');
  var button = document.getElementById('toggleContentButton');
  if(content.style.display == 'inline') {
    content.style.display = 'none';
    button.innerHTML = 'Externe Bewertungen anzeigen';
    setInfoInLocalStorage(C_SHOWRATINGS, false);
  } else {
    content.style.display = 'inline';
    button.innerHTML ='Externe Bewertungen verbergen';
    setInfoInLocalStorage(C_SHOWRATINGS, true);
  }
}

function onSettingButtonBlick() {
  /* Handler fuer Click Event - settingsButton
   * Erzeugt auf Demand Einstellungen und zeigt sie an
   */
  var overlay = document.getElementById('overlay');  
  if(overlay != null) {
    overlay.style.visibility = 'visible';
  } else {
    overlay = addSettingsOverlay();
    document.getElementById('ratingExtension').appendChild(overlay);
    overlay.style.visibility = 'visible';
  }
}

function addSettingsOverlay() {
  /* Einstellungen fuer die Extension */
  var overlayDiv = document.createElement('div');
  var overlayContentDiv = document.createElement('div');
  var exitButton = document.createElement('a');

  var imdbCheckBox     = getCheckBoxFor(C_ID_IMDBRATING, 'IMDb Bewertungen');
  var rtTomatoCheckBox = getCheckBoxFor(C_ID_RTTOMATOMETER, 'RT Tomatometer');
  var rtCritCheckBox   = getCheckBoxFor(C_ID_RTCRITICSRATING, 'RT Kritiker Bewertungen');
  var rtComCheckBox    = getCheckBoxFor(C_ID_RTCOMMUNITYRATING, 'RT Community Bewertungen');
  var mcMetaCheckBox   = getCheckBoxFor(C_ID_MCCRITICSRATING, 'MC Metascore');
  var mcComCheckBox    = getCheckBoxFor(C_ID_MCCOMMUNITYRATING, 'MC Community Bewertungen');
  var infoWikiCheckBox = getCheckBoxFor(C_ID_WIKIINFO, 'Wikipedia Infos');
  
  overlayDiv.id               = 'overlay';
  overlayDiv.style.visibility = 'hidden';
  overlayDiv.style.position   = 'absolute';
  overlayDiv.style.left       = '0px';
  overlayDiv.style.top        = '0px';
  overlayDiv.style.width      = '100%';
  overlayDiv.style.height     = '100%';
  overlayDiv.style.textAlign  = 'center';
  overlayDiv.style.zIndex     = '1000';
  
  overlayContentDiv.style.width           = '300px';
  overlayContentDiv.style.margin          = '100px auto';
  overlayContentDiv.style.backgroundColor = '#fff';
  overlayContentDiv.style.border          = 'solid #000';
  overlayContentDiv.style.padding         = '15px';
  overlayContentDiv.style.textAlign       = 'left';
  
  exitButton.innerHTML = 'Einstellungen schließen';
  exitButton.onclick = function() {document.getElementById('overlay').style.visibility = 'hidden';};

  overlayContentDiv.appendChild(imdbCheckBox);
  overlayContentDiv.appendChild(rtTomatoCheckBox);
  overlayContentDiv.appendChild(rtCritCheckBox);
  overlayContentDiv.appendChild(rtComCheckBox);
  overlayContentDiv.appendChild(mcMetaCheckBox);
  overlayContentDiv.appendChild(mcComCheckBox);
  overlayContentDiv.appendChild(infoWikiCheckBox);
  overlayContentDiv.appendChild(exitButton);
  
  overlayDiv.appendChild(overlayContentDiv);
  return overlayDiv;
}

function getCheckBoxFor(id, infoText) {
  /* Erstellen einzelner Einstellungen */
  var label = document.createElement('label');
  var checkBox = document.createElement('input');
  
  label.appendChild(checkBox);
  label.appendChild(document.createTextNode(' '+infoText+' anzeigen'));
  label.appendChild(document.createElement('br'));
  
  checkBox.id = id+'CheckBox';
  checkBox.type = 'checkbox';
  checkBox.checked = getInfoFromLocalStorage(id);
  checkBox.onchange = function() {
    setInfoInLocalStorage(id, this.checked);
    if(this.checked) {
      document.getElementById(id).style.display = 'inline';
    } else {
      document.getElementById(id).style.display = 'none';
    }
  };
  return label;
}

function addRating(id, rating) {
  /* Einfuegen einer Bewertung auf MP */
  document.getElementById(id).appendChild(rating);
}

function getNotFoundRating(source, ratingRange, id) {
  /* Erstellen eines Default-Ratings fuer nicht gefundene Ratings */
  return buildRating('X', source, '0', ratingRange, id);
}

function getNotYetRating(source, ratingRange, id) {
  /* Erstellen eines Default-Ratings fuer noch nicht bewertete/freigegebene Filme */
  return buildRating('-', source, '0', ratingRange, id);
}

function wrapRatingWithLink(rating, movieURL) {
  /* Wrapped ein Rating in Link zur entsprechenden Seite */
  var linkedRating = document.createElement('a');
  linkedRating.appendChild(rating);
  linkedRating.title = movieURL;
  linkedRating.href = movieURL;
  return linkedRating;
}

function buildRating(rating, source, ratingCount, range, id) {
  /* Nachbauen der Bewertungs-Struktur auf MP */
  var ratingWrapper = document.createElement('div');
  ratingWrapper.id            = id;
  ratingWrapper.className     = "criticscount";
  ratingWrapper.style.width   = "180px";
  ratingWrapper.style.margin  = "0px 25px 0px 25px";
  ratingWrapper.style.padding = "0px";
  ratingWrapper.style.float   = "left";
  if(getInfoFromLocalStorage(id)) {
    ratingWrapper.style.display = 'inline';
  } else {
    ratingWrapper.style.display = 'none';
  }
  
  var span = document.createElement('span');
  span.className     = "huge";
  span.innerHTML     = rating;
  span.style.width   = "35px";
  span.style.margin  = "10px 3px 0px 0px";
  span.style.padding = "0px";
  span.style.float   = "left";
  span.style.textAlign = "center";
  ratingWrapper.appendChild(span);
  
  var ratingInfo = document.createElement('div');
  ratingInfo.className     = "quite";
  ratingInfo.style.margin  = "0px";
  ratingInfo.style.padding = "0px";
  ratingInfo.style.float   = "left";
  
  var sourceInfo = document.createTextNode(source);
  ratingInfo.appendChild(sourceInfo);
  ratingInfo.appendChild(document.createElement('br'));
  
  var countInfo = document.createElement('span');
  countInfo.innerHTML = ratingCount+" Bewertungen";
  ratingInfo.appendChild(countInfo);
  ratingInfo.appendChild(document.createElement('br'));

  var rangeInfo = document.createElement('span');
  rangeInfo.className = "small";
  rangeInfo.innerHTML = "Skala 0 bis "+range;
  ratingInfo.appendChild(rangeInfo);
  
  ratingWrapper.appendChild(ratingInfo);
  return ratingWrapper;
}

function buildInfo(source, sourceInfo, sourceInfoExt, id) {
  /* Nachbauen der Bewertungs-Struktur auf MP */
  var infoWrapper = document.createElement('div');
  infoWrapper.id            = id;
  infoWrapper.className     = "criticscount";
  infoWrapper.style.width   = "180px";
  infoWrapper.style.margin  = "0px 25px 0px 25px";
  infoWrapper.style.padding = "0px";
  infoWrapper.style.float   = "left";
  if(getInfoFromLocalStorage(id)) {
    infoWrapper.style.display = 'inline';
  } else {
    infoWrapper.style.display = 'none';
  }
  
  var span = document.createElement('span');
  span.className     = "huge";
  span.innerHTML     = "i"; //Infosymbol
  span.style.width   = "35px";
  span.style.margin  = "10px 3px 0px 0px";
  span.style.padding = "0px";
  span.style.float   = "left";
  span.style.textAlign = "center";
  infoWrapper.appendChild(span);
  
  var info = document.createElement('div');
  info.className     = "quite";
  info.style.margin  = "0px";
  info.style.padding = "0px";
  info.style.float   = "left";
  
  var sourceText = document.createTextNode(source); // Quelle
  info.appendChild(sourceText);
  info.appendChild(document.createElement('br'));
  
  var sourceInfoText = document.createElement('span');
  sourceInfoText.innerHTML = sourceInfo;
  info.appendChild(sourceInfoText);
  info.appendChild(document.createElement('br'));

  var sourceInfoExtText = document.createElement('span');
  sourceInfoExtText.className = "small";
  sourceInfoExtText.innerHTML = sourceInfoExt;
  info.appendChild(sourceInfoExtText);

  infoWrapper.appendChild(info);
  return infoWrapper;
}


function requestIMDBRating() {
  /* Anstoss eines Requests fuer IMDB Ratings */
  var imdbByGoogle = "https://www.google.de/search?q="+getURLEmbeddedMovieData(movieData)+"+imdb+original+title";
  sendRequest(imdbByGoogle, handleGoogleIMDBResponse);  
}

function requestRTRating() {
  /* Anstoss eines Requests fuer Rotten Tomatoes Ratings */
  var rtByGoogle = "https://www.google.de/search?q="+getURLEmbeddedMovieData(movieData)+"+rotten+tomatoes";
  sendRequest(rtByGoogle, handleGoogleRTResponse);  
}

function requestMCRating() {
  /* Anstoss eines Requests fuer Metacritic Ratings */
  var mcByGoogle = "https://www.google.de/search?q="+getURLEmbeddedMovieData(movieData)+"+metacritic";
  sendRequest(mcByGoogle, handleGoogleMCResponse);  
}

function requestWikipediaInfo() {
  /* Anstoss eines Requests fuer Metacritic Ratings */
  var wikiByGoogle = "https://www.google.de/search?q=site:en.wikipedia.org+"+getURLEmbeddedMovieData(movieData)+"+movie";
  sendRequest(wikiByGoogle, handleGoogleWikipediaResponse);  
}

function handleGoogleWikipediaResponse(request, response) {
  /* Google-Handler - Prueft auf plausible Ergebnisse und stoesst ggf weitere Request an*/
  var fqdmRegExp = "wikipedia.org";
  var googleHTML = response.responseText;
  var googleResult = returnPlausibleGoogleResult(googleHTML,fqdmRegExp);
  if(googleResult != null) {
    var movieURL = googleResult[0];
    if(LINK_WEBSITES) {
      var info = buildInfo('Wikipedia', 'The Free', 'Encyclopedia', C_ID_WIKIINFO);
      addRating('info', wrapRatingWithLink(info, movieURL));
    }
  }
}

function handleGoogleIMDBResponse(request, response) {
  /* Google-Handler - Prueft auf plausible Ergebnisse und stoesst ggf weitere Request an*/
  var fqdmRegExp = "www.imdb.com";
  var googleHTML = response.responseText;
  var googleResult = returnPlausibleGoogleResult(googleHTML,fqdmRegExp);
  if(googleResult != null) {
    var movieURL = googleResult[0];
    var rating = getRatingByGoogle(googleResult[1], 'imdb', '10', C_ID_IMDBRATING);
    if(LINK_WEBSITES) {
      addRating('imdb', wrapRatingWithLink(rating, movieURL));
    } else {
      addRating('imdb', rating);
    }
  } else {
    addRating('imdb', getNotFoundRating('imdb', '10', C_ID_IMDBRATING));
  }
}

function getRatingByGoogle(googleHTML, source, ratingRange, id) {
  /* Allgemeiner Scrapper fuer Bewertung, angezeigt von Google */
  googleHTML = refineHTML(googleHTML);
  var ratingHTML = extractDiv(googleHTML, '<div class="f slp"');
  if(ratingHTML != null) {
    ratingHTML = ratingHTML.match(/\d,?\d?\/10 - \d(\d|\.)*/);
    if(ratingHTML != null) {
      ratingHTML = ratingHTML[0].split('-');
      var rating = ratingHTML[0].trim();
      var ratingCount =  ratingHTML[1].trim();
      return buildRating(refineRating(rating), source, refineRatingCount(ratingCount), ratingRange, id);
    }
  }
  return getNotYetRating(source, ratingRange, id);
}

function handleGoogleRTResponse(request, response) {
  /* Google-Handler - Prueft auf plausible Ergebnisse und stoesst ggf weitere Request an*/
  var fqdmRegExp = "www.rottentomatoes.com";
  var googleHTML = response.responseText;
  var googleResult = returnPlausibleGoogleResult(googleHTML,fqdmRegExp);
  if(googleResult != null) {
    var movieURL = googleResult[0];
    sendRequest(movieURL, handleRTResponse);
  } else {
    addRating('rt', getNotFoundRating('rotten tomatoes', '100', C_ID_RTRATINGS));
  }
}

function handleRTResponse(request, response) {
  /* Rotten-Tomatoes-Handler - Hinzufuegen (verlinkter) Bewertungen */
  var rtHTML = response.responseText;
  var ratings = getRTRatings(rtHTML);
  if(LINK_WEBSITES) {
    addRating('rt', wrapRatingWithLink(ratings, request));
  } else {
    addRating('rt', ratings);
  }
}

function getRTRatings(rtHTML) {
  /* Rating-Scrapper fuer Rotten Tomatoes */
  
  var rt_div = document.createElement('div');
  rt_div.id = C_ID_RTRATINGS;

  var encodedRtHTML = refineHTML(rtHTML);
  
  // Kritiker
  var critStatsHTML = extractDiv(encodedRtHTML, '<div id="scoreStats"');
  if(critStatsHTML != null) {
    var critStats  = critStatsHTML.split("/div");
    var critAvrRating   = critStats[0].match(/\d\.?\d?/);
    var critRatingCount = critStats[1].match(/\d(\d|,)*/)[0];
    var critFresh       = critStats[2].match(/\d(\d|,)*/)[0];
    var critRotten      = critStats[3].match(/\d(\d|,)*/)[0];

    if(critFresh != null && critRotten != null && critRatingCount != null) {
      rt_div.appendChild(buildRating(Math.round((critFresh/critRatingCount)*100), 'RT Tomatometer', refineRatingCount(critRatingCount), '100', C_ID_RTTOMATOMETER));  
    } else {
      rt_div.appendChild(getNotYetRating('RT Tomatometer', '100', C_ID_RTTOMATOMETER));
    }
    if(critAvrRating != null && critRatingCount != null) {
      rt_div.appendChild(buildRating(critAvrRating, 'RT Kritiker', refineRatingCount(critRatingCount), '10', C_ID_RTCRITICSRATING));
    } else {
      rt_div.appendChild(getNotYetRating('RT Kritiker', '100', C_ID_RTCRITICSRATING));
    }
  } else {
    rt_div.appendChild(getNotYetRating('RT Tomatometer', '100', C_ID_RTTOMATOMETER));
    rt_div.appendChild(getNotYetRating('RT Kritiker', '10', C_ID_RTCRITICSRATING));
  }
  
  // Audience
  if(encodedRtHTML.search('<div class="wts media') < 0) {
    var audStatsHTML = extractDiv(encodedRtHTML, '<div class="audience-info');
    if(audStatsHTML != null && divIsNotEmpty(audStatsHTML)) {
      audStatsHTML = audStatsHTML.replace(/%(\d|[ABCDEF])(\d|[ABCDEF])/g,"");
      var audStats  = audStatsHTML.split("/div");
      var audAvrRating   = audStats[0].match(/\d\.?\d?/)[0];
      var audRatingCount = audStats[1].match(/\d(\d|,)*/)[0];
      if(audAvrRating != null && audRatingCount != null) {
        rt_div.appendChild(buildRating(refineRating(audAvrRating), 'RT Community', refineRatingCount(audRatingCount), '5', C_ID_RTCOMMUNITYRATING));
      }
    }
  } else {
    rt_div.appendChild(getNotYetRating('RT Community', '5', C_ID_RTCOMMUNITYRATING));
  }
  return rt_div;
}

function handleGoogleMCResponse(request, response) {
  /* Google-Handler - Prueft auf plausible Ergebnisse und stoesst ggf weitere Request an*/
  var fqdmRegExp = "www.metacritic.com";
  var googleHTML = response.responseText;
  var googleResult = returnPlausibleGoogleResult(googleHTML,fqdmRegExp);
  if(googleResult != null) {
    var movieURL = googleResult[0];
    sendRequest(movieURL, handleMCResponse);
  } else {
    addRating('mc', getNotFoundRating('metacritic', '100', C_ID_MCRATINGS));
  }
}

function handleMCResponse(request, response) {
  /* Rotten-Tomatoes-Handler - Hinzufuegen (verlinkter) Bewertungen */
  var mcHTML = response.responseText;
  var ratings = getMCRatings(mcHTML);
  if(LINK_WEBSITES) {
    addRating('mc', wrapRatingWithLink(ratings, request));
  } else {
    addRating('mc', ratings);
  }
}

function getMCRatings(mcHTML) {
  var mc_div = document.createElement('div');
  mc_div.id = C_ID_MCRATINGS;

  var encodedHTML = refineHTML(mcHTML);
  var metascoreDiv = extractDiv(encodedHTML, '<div class="score_summary');
  if(metascoreDiv != null) {
    var mcCritRatingHTML = metascoreDiv.match(/ratingValue">\d\d?\d?/);
    var mcCritRatingCountHTML = extractDiv(metascoreDiv, '<div class="summary');
    if(mcCritRatingHTML != null && mcCritRatingCountHTML != null) {
      var mcCritRating = mcCritRatingHTML[0].match(/\d\d?\d?/)[0];
      var mcCritRatingCount = mcCritRatingCountHTML.match(/\d(\d)*/)[0];
      mc_div.appendChild(buildRating(refineRating(mcCritRating), 'MC Metascore', refineRatingCount(mcCritRatingCount), '100', C_ID_MCCRITICSRATING));
    } else {
      mc_div.appendChild(getNotYetRating('MC Metascore', '100', C_ID_MCCRITICSRATING));
    }
  } else {
    mc_div.appendChild(getNotYetRating('MC Metascore', '100', C_ID_MCCRITICSRATING));
  }
  
  var userscoreDiv = extractDiv(encodedHTML, '<div class="userscore_wrap');
  if(userscoreDiv != null) {
    var mcComRatingHTML = userscoreDiv.match(/metascore_w(.)*?\d\.?\d?/);
    var mcComRatingCountHTML = extractDiv(userscoreDiv, '<div class="summary');
    if(mcComRatingHTML != null && mcComRatingCountHTML != null) {
      var mcComRating = mcComRatingHTML[0].match(/\d\.?\d?/)[0];
      var mcComRatingCount = mcComRatingCountHTML.match(/\d\d*/)[0];
      mc_div.appendChild(buildRating(mcComRating, 'MC User Score', refineRatingCount(mcComRatingCount), '10', C_ID_MCCOMMUNITYRATING));
    } else {
      mc_div.appendChild(getNotYetRating('MC User Score', '10', C_ID_MCCOMMUNITYRATING));
    }
  } else {
    mc_div.appendChild(getNotYetRating('MC User Score', '10', C_ID_MCCOMMUNITYRATING));
  }
  return mc_div;
}

function returnPlausibleGoogleResult(googleHTML, fqdmRegExp) {
  /* Result-Scrapper fuer Google
   * Ueberprueft erstes Ergebnis
   *
   * return   Array: Link zum Ergebnis, HTML des Google-Ergebnisses oder null
   */
  var encodedGoogleHTML = refineHTML(googleHTML);
  var result = extractDiv(encodedGoogleHTML, '<div class="g"');
  var link = extractFirstLink(result);
  var info = extractSpan(result, '<span class="st"');
  var url = link.match(/"http.*?"/)[0];
  url = url.replace(/"/g,"");
  
  // Titel auf Inhalt pruefen
  var regExpMovieData = movieData[0];
  for(var j = 0; j < regExpMovieData.length; j++) {
    regExpMovieData[j] = refineHTML(regExpMovieData[j]);
    regExpMovieData[j] =regExpMovieData[j].replace(/(- |:)/g, '');
    var regExpMovieDataSplits = regExpMovieData[j].split(' ');
    var foundCounter = 0;
    // Heuristik - Gefundener Titel muss mindestens die Haelfte der gesuchten Woerter enthalten
    for(var i = 0; i < regExpMovieDataSplits.length; i++) {
      var regExp = new RegExp(regExpMovieDataSplits[i], 'i');
      if(link.search(regExp) >= 0 || info.search(regExp) >= 0) {
        foundCounter++;
      }
    }
    if(url.search(fqdmRegExp) >= 0 && foundCounter >= (regExpMovieDataSplits.length/2)) {
      return [url, result];
    }
  }
  return null;
}

function sendRequest(request, handler) {
  /* Absetzen eines Requests
   *
   * request      Ziel-URL mit Request
   * source       Anzeige-Information
   * ratingRange  maximal moegliche Bewertung
   */
  if (REQ_SYNCHRONOUS) {  //synchron oder asynchron
    var response = GM_xmlhttpRequest({
        method: 'GET',
      url: request,
      synchronous: REQ_SYNCHRONOUS,   //synchron oder asynchron
      timeout: REQ_TIMEOUT,
      ontimeout: function(response) {alert("Timeout(MP-Rating-Extension):  "+request);}
      });
    if(response.status == 200) {
      handler(request, response);
    } else {
      alert("Error: No synchornous operation.");
    }
  } else {
    GM_xmlhttpRequest({
      method: 'GET',
    url: request,
    synchronous: REQ_SYNCHRONOUS,
    timeout: REQ_TIMEOUT,
    onreadystatechange: function(response) {
      if(response.status == 200 && response.readyState == 4) {
        handler(request, response);
      }
    },
      ontimeout: function(response) {alert("Timeout(MP-Rating-Extension): "+request);}
    });
  }
}

//---------REFINE-FUNCTIONS--------
function refineTitle(title) {
  /* Titel bearbeiten */
  var refinedTitle = title.split("/ AT:")[0];  // Alternativer Titel weg
  return refinedTitle;
}

function refineRating(rating) {
  /* Bewertung anpassen und auf Gueltigkeit ueberpruefen */
  var refinedRating = rating.replace(/,/,".");
  refinedRating = refinedRating.split(" ")[0];
  refinedRating = refinedRating.split("/")[0];
  if(refinedRating.match(/\d\.?\d?/)) {
    return refinedRating;
  } else {
    return '-';
  }
}

function refineRatingCount(ratingCount) {
  /* BewertungsAnzahl anpassen und auf Gueltigkeit ueberpruefen */
  var refinedRatingCount = ratingCount.replace(/(\.|,)/g,"");
  if(refinedRatingCount.match(/^\d+$/)) {
    return refinedRatingCount;
  } else {
    return "0";
  }
}

function refineHTML(html) {
  var encodedHTML = encodeURI(html);
  encodedHTML = encodedHTML.replace(/%E2%80%93/g,'-');
  encodedHTML = encodedHTML.replace(/%25E2%2580%2593/g,'–');
  encodedHTML = encodedHTML.replace(/%3C/g,'<');
  encodedHTML = encodedHTML.replace(/%3E/g,'>');
  encodedHTML = encodedHTML.replace(/%22/g,'"');
  encodedHTML = encodedHTML.replace(/%20/g,' ');
  encodedHTML = encodedHTML.replace(/%(\d|[ABCDEF])(\d|[ABCDEF])/g,"");
  return encodedHTML;
}
//---------/REFINE-FUNCTIONS-------

//---------HTML-STRUCTURE-FUNCTIONS----
function divIsNotEmpty(html) {
  /* Testen, ob sich etwas im innerHTML befindet */
  if(html.match(/<div class="(.)*?">.?<\/div>/)) {
    return false;
  } else {
    return true;
  }
}

function extractDiv(html, selector) {
  /* Extrahieren eines Div Containers mit dessen Inhalt */
  var divPosition = html.search(selector);
  if(divPosition > 0) {
    var htmlArray = html.split('');
    var i = 0;
    var divs = 0;
    do{
      if(htmlArray[divPosition+i] == '<' && htmlArray[divPosition+i+1] == 'd') {
        divs++;
      }
      if(htmlArray[divPosition+i] == '<' && htmlArray[divPosition+i+1] == '/' && htmlArray[divPosition+i+2] == 'd') {
        divs--;
      }
      i++;
    } while (divs != 0);
    return html.substring(divPosition, divPosition+i+5);
  }
  return null;
}

function extractSpan(html, selector) {
  /* Extrahieren eines Spans mit dessen Inhalt */
  var spanPosition = html.search(selector);
  if(spanPosition > 0) {
    var htmlArray = html.split('');
    var i = 0;
    var spans = 0;
    do{
      if(htmlArray[spanPosition+i] == '<' && htmlArray[spanPosition+i+1] == 's' && htmlArray[spanPosition+i+2] == 'p') {
        spans++;
      }
      if(htmlArray[spanPosition+i] == '<' && htmlArray[spanPosition+i+1] == '/' && htmlArray[spanPosition+i+2] == 's' && htmlArray[spanPosition+i+3] == 'p') {
        spans--;
      }
      i++;
    } while (spans != 0);
    return html.substring(spanPosition, spanPosition+i+5);
  }
  return null;
}

function extractFirstLink(html) {
  /* Extrahieren des ersten Links mit dessen Inhalt */
  var aPosition = html.search('<a ');
  if(aPosition > 0) {
    var htmlArray = html.split('');
    var i = 0;
    var as = 0;
    do {
      if(htmlArray[aPosition+i] == '<' && htmlArray[aPosition+i+1] == 'a') {
        as++;
      }
      if(htmlArray[aPosition+i] == '<' && htmlArray[aPosition+i+1] == '/' && htmlArray[aPosition+i+2] == 'a') {
        as--;
      }
      i++;
    } while (as != 0);
    return html.substring(aPosition, aPosition+i+3);
  }
  return null;
}

//---------/HTML-STRUCTURE-FUNCTIONS---

//-----LOCALSTORAGE-ADAPTER------------
/* Nur Hinterlegung binaerer Daten */

function getInfoFromLocalStorage(info) {
  if(typeof(Storage) !== "undefined") {
    var result = localStorage.getItem(info);
    if(result == null) {  // nicht initialisiert
      initializeLocalStorageFor(info);
      return true;
    } else if (result == 'true') {  //Wert true
      return true
    } else {  // Wert false
      return false;
    }
  } else {  //  keine local storage unterstuetzung, Default-Wert nutzen
      return true;
  }
}

function setInfoInLocalStorage(info, value){
    if(typeof(Storage) !== "undefined") {
      localStorage.setItem(info, value.toString());
  }
}

function initializeLocalStorageFor(info) {
  setInfoInLocalStorage(info, true);
}
//-----/LOCALSTORAGE-ADAPTER-----------
