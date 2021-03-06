/**
	Created by Daniel Mattheiss, 07/14/16

	Responsible for 2 functionalities: 
		Add an alarm that fires off every N minutes -> if there is a new slvsh game, then send of a notification!
		For all web requests that contains '/films', redirect appropriately to '/theater'

**/

const alarmName = "SLVSH New Post";
const notificationId = "new_slvsh_game";

const gamesAPI = "http://www.slvsh.com/games.json?page=1&is_active=false";
const postsAPI = "http://www.slvsh.com/posts.json?page=1&is_active=false";
const notificationIcon = "images/slvsh-logo.png";
const notificationTitle = "New SLVSH Post";

const newGameCheckIntervalInMins = 30;

//Clear old alarm so the user is using the most recent alarm
chrome.alarms.clear(alarmName);

//Check to see if slvsh new post alarm exists. If not, create it with the options
chrome.alarms.get(alarmName, function(alarm) {
	if(alarm === undefined){
		chrome.alarms.create(alarmName, {
	        when: 1000,
	        periodInMinutes: newGameCheckIntervalInMins
	    }); 
	   	console.debug("new alarm created");
	}
});

//On a ERR_NETWORK_IO_SUSPENDED we retry once - to allow the user to log in and then get their notification
let retriedNewGameAlarm = false;

//Check JSON API to see if the most recent game id stored in chrome.storage is out of date. If so, update storage and display a notification with options
chrome.alarms.onAlarm.addListener(newGameAlarm);
function newGameAlarm(alarm) {
	chrome.storage.sync.get("notifications", function(items){
		let notificationsSetting = items.notifications;
		if(notificationsSetting === "never") return;


		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

				//Get most recently found game id
				let responseJson = JSON.parse(xmlhttp.responseText);
				let newGameId = responseJson.posts[0].id;

				console.log(newGameId);

				let gameKey = notificationsSetting === "all_content" ? "most_recent_content" : "most_recent_game";

				//Determine if the game is newer than the cached most_recent_game
				chrome.storage.sync.get(gameKey, function(items) {
					let most_recent_game = items[gameKey];
					let jsonfile = {};

					if(!most_recent_game || most_recent_game === undefined || newGameId > most_recent_game){	//Is newer or is not defined in the cache yet

						//Set/update the most_rescent_game in the cache
						jsonfile[gameKey] = newGameId;
						chrome.storage.sync.set(jsonfile);

						if(!most_recent_game || most_recent_game === undefined){
							//If this is the first time the alarm runs, do not display new video notification
							console.debug("first time")
							return;
						}

						//Set notification options
						let newGameTitle = responseJson.posts[0].title;
						newGameTitle = decodeEntities(newGameTitle);
						var options = {
							iconUrl: notificationIcon,
							type: 'basic',
							title: notificationTitle,
							message: newGameTitle,
							priority: 1,
						};

						//Create notification that links to the game's url and autoplays
						chrome.notifications.create(notificationId, options);
						chrome.notifications.onClicked.addListener(function(notificationId) {
							chrome.tabs.create({url: "http://www.slvsh.com/games/" + newGameId + "?autoplay=1"});
							chrome.notifications.clear(notificationId);
						});
					}
					else{
						//Not newer
						console.debug("no new one");
						return;
					}
				});

				//Reset retry on successful ajax request
				retriedNewGameAlarm = false;
			}
			else if(xmlhttp.readyState == 4 && xmlhttp.status == 0){

				//Retry ONCE if we get a ERR_NETWORK_IO_SUSPENDED - this is usually caused by chrome calling the alarm before the computer is unlocked,
				// so we want to give the user time to unlock the computer so the alarm is called properly upon wake up
				if(!retriedNewGameAlarm){
					setTimeout(newGameAlarm, 60000);
					console.debug("retrying in a minute");
					retriedNewGameAlarm = true;
				}
			}
		};


		//Send the AJAX request
		if(notificationsSetting === "all_content") xmlhttp.open("GET", postsAPI, true);
		else xmlhttp.open("GET", gamesAPI, true);
		xmlhttp.send();
	});

}

//Convert's any strange characters into english readable words - e.g. an accent over a letter
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