console.log("called");

const alarmName = "SLVSH New Post";
const notificationId = "new_slvsh_game";

const gamesAPI = "http://www.slvsh.com/games.json?page=1&is_active=false";
const notificationIcon = "images/slvsh-logo.png";
const notificationTitle = "New SLVSH Game!";

const newGameCheckIntervalInMins = 120;


//Check to see if slvsh new post alarm exists. If not, create it with the options
chrome.alarms.get(alarmName, function(alarm) {
	if(alarm === undefined){
		chrome.alarms.create(alarmName, {
	        when: 1000,
	        periodInMinutes: newGameCheckIntervalInMins
	    }); 
	    console.log("new alarm created");
	}
	else{
		console.log("found alarm");
	}
	//chrome.alarms.clearAll();
});

//Check JSON API to see if the most recent game id stored in chrome.storage is out of date. If so, update storage and display a notification with options
chrome.alarms.onAlarm.addListener(function (alarm) {

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
    	if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
	    	let responseJson = JSON.parse(xmlhttp.responseText);
	    	let newGameId = responseJson.posts[0].id;

	    	//Determine if the game is new
		    chrome.storage.sync.get("most_recent_game", function(items) {
		        let most_recent_game = items.most_recent_game;
		        let jsonfile = {};
		        most_recent_game = 1;
		        //chrome.storage.sync.clear();

		        if(!most_recent_game || most_recent_game === undefined || newGameId > most_recent_game){
		            jsonfile["most_recent_game"] = newGameId;
		            console.log("new most recent game logged");
		            chrome.storage.sync.set(jsonfile);
		            if(!most_recent_game || most_recent_game === undefined){
		            	console.log("first time the alarm is running");
		          		return;		//If this is the first time the alarm runs, do not display new video notification
      				}
			    	let newGameTitle = responseJson.posts[0].title;
			    	newGameTitle = decodeEntities(newGameTitle);
					console.log(newGameTitle);

					var options = {
					  iconUrl: notificationIcon,
					  type: 'basic',
					  title: notificationTitle,
					  message: newGameTitle,
					  priority: 1,
					};
					chrome.notifications.create(notificationId, options, function() { console.log('new notification created!'); });	
					chrome.notifications.onClicked.addListener(function(notificationId) {
				        chrome.tabs.create({url: "http://www.slvsh.com/games/" + newGameId + "?autoplay=1"});
				        chrome.notifications.clear(notificationId);
				    });
		        }
		        else{
		        	console.log("no new games");
		        	return;
		        }
		    });    	
    	}
    };


    xmlhttp.open("GET", gamesAPI, true);
    xmlhttp.send();

    console.log("alarm called");
});


let decodeEntities = (function() {
  // this prevents any overhead from creating the object each time
  let element = document.createElement('div');

  function decodeHTMLEntities (str) {
    if(str && typeof str === 'string') {
      // strip script/html tags
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
      element.innerHTML = str;
      str = element.textContent;
      element.textContent = '';
    }

    return str;
  }

  return decodeHTMLEntities;
})();


//Replaces all instances of '/films' in xmlhttprequests sent
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if(details.url.indexOf("/films") > -1){
	    let old_url = details.url;
    	let new_url = old_url.replace("/films", "/theater");
        return { redirectUrl: new_url };
    }
  },
  {urls: ['*://*.slvsh.com/*']},
  [ 'blocking']
);