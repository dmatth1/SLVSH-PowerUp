/**
  * Created by Daniel Mattheiss, 06/04/2016
  * Last updated 06/06/2016
  * This Google chrome extension adds needed functionality to slvsh.com, a competition freeskiing business, website, and concept.
  * Current features include infinite scroll, search, and adding videos to favorites.
  *
  * Plans for the future include fixing filtering -> load more bug (load all videos, not filtered videos), remebering scroll position on back button, 
  *  new video notifications, queueing videos, tournament view for the SLVSH Cups, improved search and UI,
  *  playlist creation and sharing, comments sections, game ratings, and better video sorting
  * Feel free to fork/contribute. If you are planning to work on one of the above (unimplemented) features, communicate with me so we don't have conflicting code.
  *
  * Licensed under the MIT License
  */

//Variables
var searchResults, jsonVideos = [], games = [], theater = [];
var theaterPages = [], gamesPages = [];
var gamesLoaded = false;
var theaterLoaded = false;
var allVideosLoaded = false;
var searchResultsMouseOver = false, favoritesBarMouseOver = false;
var videoScrollPage = 1;
var previousLink = "";
var onVideosListingPage = false;
var currentVideos = [];
var currentVideosLoaded = false;

/*function checkForNewGame(videos){
    //Check for any new videos
    chrome.storage.sync.get("newPost", function(items) {
        newPost = items.newPost;
        var jsonfile = {};
        console.log(newPost);
        if(!newPost){
            newPost = getNewestPost(videos);
            console.log("yo");
        }
        else{
            if(newPost.id <= getNewestPost(videos).id) return;
        }
        console.log(newPost);
        jsonfile["newPost"] = newPost;
        console.log(jsonfile);
        chrome.storage.sync.set(jsonfile, function() {
          //notify("Favorited!");
        });
    });
}
//Helper function to get the newest slvsh post for a set of videos
function getNewestPost(videos){
    var maxID = 1, newestVideo = null, currVideo = null;
    for(var i = 0; i < videos.length; i++){
        currVideo = videos[i];
        if(currVideo.id > maxID){
            maxID = currVideo.id;
            newestVideo = currVideo;
        }
    }

    return newestVideo;
}*/

//Filters all videos json for the videos needed for the current page
function filterVideosForCurrentPage(){
    console.log("filtering");

    var url = window.location.href.toLowerCase();
    var is_category = url.indexOf("category") > -1;

    //On games listing page
    if(url.endsWith("games") || url.endsWith("games/") || (url.indexOf("games") > -1 && is_category)){
        onVideosListingPage = true;
        if(is_category){
            if(url.endsWith("slvsh")){
                console.log("on slvsh games category page");
                currentVideos = games.filter((x) => x.post_class == "slvsh");
            }
            else if(url.endsWith("instabanger")){
                console.log("on instabanger games category page");  
                currentVideos = games.filter((x) => x.post_class == "instabanger");              
            }
            else if(url.endsWith("zero")){
                console.log("on zero games category page");  
                currentVideos = games.filter((x) => x.post_class == "zero");                
            }
            else if(url.endsWith("inonout")){
                console.log("on inonout games category page");  
                currentVideos = games.filter((x) => x.post_class == "inonout");                
            }
            else if(url.endsWith("addon")){
                console.log("on addon games category page");  
                currentVideos = games.filter((x) => x.post_class == "addon");                
            }
        }
        else{
            currentVideos = games;
            console.log("on base games page");
        }
        currentVideos = currentVideos.sort((a,b) => b.id - a.id);
        currentVideosLoaded = true;
        instantiate();
    }
    //On theater listing page
    else if(url.endsWith("theater") || url.endsWith("theater/") || (url.indexOf("theater") > -1 && is_category)){
        onVideosListingPage = true;
        if(is_category){
            if(url.endsWith("edit")){
                console.log("on edit theater category page");  
                currentVideos = theater.filter((x) => x.post_class == "edit");
            }
            else if(url.endsWith("segment")){
                console.log("on segment theater category page");  
                currentVideos = theater.filter((x) => x.post_class == "segment");              
            }
            else if(url.endsWith("fullmovie")){
                console.log("on fullmovie theater category page");
                currentVideos = theater.filter((x) => x.post_class == "fullmovie");                
            }
            else if(url.endsWith("classic")){
                console.log("on classic theater category page");
                currentVideos = theater.filter((x) => x.post_class == "classic");                
            }
        }
        else{
            currentVideos = theater;
            console.log("on base theater page");
        }
        currentVideos = currentVideos.sort((a,b) => b.id - a.id);
        currentVideosLoaded = true;
        instantiate();
    }
    //On homepage
    else if(url == "http://www.slvsh.com/"){
        onVideosListingPage = true;
        currentVideos = games.concat(theater);
        currentVideos = currentVideos.sort((a,b) => b.id - a.id);
        currentVideosLoaded = true;
        console.log("on base home page");
        instantiate();
    }
}



function getGamesJSON(counter){
    var exceededTotalPages = false;
    var gamesTotalPages = 0;
    $.get("http://www.slvsh.com/games.json", { page: counter, is_active: !0}, function(data) {
        gamesTotalPages = data.total_pages;

        if(counter == 1) games = data.posts;
        else games = games.concat(data.posts);

        gamesPages[counter-1] = data.posts;

        if(counter < data.total_pages){
            getGamesJSON(++counter);
        }
        else{
            exceededTotalPages = true;
        }
    }).
    done(function() {
        if(!exceededTotalPages && counter == gamesTotalPages){
            gamesLoaded = true;
            console.log("games loaded");
            if(theaterLoaded){
                filterVideosForCurrentPage();
            }
        }
    });
}

function getTheaterJSON(counter){
    var exceededTotalPages = false;
    var theaterTotalPages = 0;
    $.get("http://www.slvsh.com/theater.json", { page: counter, is_active: !0}, function(data) {
        theaterTotalPages = data.total_pages;
        
        if(counter == 1) theater = data.posts;
        else theater = theater.concat(data.posts);

        theaterPages[counter-1] = data.posts;

        if(counter < data.total_pages){
            getTheaterJSON(++counter);
        }
        else{
            exceededTotalPages = true;
        }
    }).
    done(function() {
       if(!exceededTotalPages && counter == theaterTotalPages){
            theaterLoaded = true;
            console.log("theater loaded");
            if(gamesLoaded){
                filterVideosForCurrentPage();
            }
        } 
    });
}

//Ajax get request for json games and theater - important for search
function getAllVideos() {
    //Get first page of games to get the next n pages
    getGamesJSON(1);

    //At the same time add to theater
    getTheaterJSON(1);
}


function loadMoreInitial(){
    console.log("initial loading");
    if($(".load-more").length || $(".loader").length){
        $(window).scroll(function() {
            if($(window).scrollTop() + $(window).height() > $(document).height() -300){
                $(window).unbind('scroll');
                $(".load-more").click();
                videoScrollPage++;
                setTimeout(loadMoreInitial(), 250);
            }
        });
    }
}

//Instantiates auto load on scroll
// This function has one bug - if a user scrolls to the bottom of the screen before currentVideos has been fully loaded, the user must scroll before the load will execute
// -if the user doesn't scroll from the bottom of the screen nothing no videos will show
function loadMore(waiting = false) {
    console.log("loading");
    if($(".load-more").length || $(".loader").length){
        //console.log("start");
        /*if(waiting){
            var success = loadMoreFunc();
            if(success){
                setTimeout(loadMore(), 1000);
                console.log("inside waiting 1");
            }
            else{
                setTimeout(loadMore(true), 1000);
                                console.log("inside waiting 2");
            }
            return;
        }*/
        if($(window).scrollTop() + $(window).height() > $(document).height() -300){
            $(window).unbind('scroll');
            loadMoreFunc();
            setTimeout(loadMore(), 250);
            console.log("initial scroll");
            return;                
        }
        $(window).scroll(function() {
            //console.log("inside scroll");
            //If we are within infinite scroll threshold or if we are waiting for current videos to load
            if(/*!waiting && */$(window).scrollTop() + $(window).height() > $(document).height() -300) {
                //console.log("scrolled");
                $(window).unbind('scroll');
                loadMoreFunc();
                setTimeout(loadMore(), 250);
           }
        });
    }
}

//Uses a custom timeout to check if window is below threshhold - if so try to load more
/*function infiniteScroll(){
    if($(".load-more").length || $(".loader").length){
        if($(window).scrollTop() + $(window).height() > $(document).height() -300){
            console.log("loading infinite scroll");
            loadMoreFunc();
            setTimeout(infiniteScroll(), 500);
        }
        else{
            setTimeout(infiniteScroll(), 100);
        }
    }
}*/

 /*function paginateVideoScroll(i){
     window.history.pushState(document.innerHtml, document.title, window.location.pathname + "#page" + i);
 }*/


//When we click on a post to view a video, we remember the id of that post so if the 
// user clicks the back button, we auto load more until reaching that post
/*function infiniteScrollMemory(){

    //First bind saving post id to chrome storage onClick
    $(".item-container").on("click", "a", function(e) {
        e.preventDefault();
        var isPost = $(this).parents(".post").length > 0;
        var jsonFile = {};
        var link = $(this).attr("href");
        var id = link.split("/")[2].substring(0,3);
        jsonFile["previous"] = id;
        jsonFile["previousLink"] = link;
        chrome.storage.sync.set(jsonFile, function() {
            if(isPost){
                var jsonFile = {};
                jsonFile["url"] = document.location.href;
                console.log("Fetch current path:" + document.location.href);
                chrome.storage.sync.set(jsonFile, function() {
                    window.location = link;
                });
            }
            else{
                window.location = link;
            }
        });
    });
}*/

//Binds favorite option to all videos using custom function
/*function postFunctions() {
    bindFavoritesToVideos();
}*/

//Adds the searchbar and binds functionality
function searchBar() {

    //Just create actions bar icon here - should be moved in future
    var actionsBarIcon = "<span id='actions-bar-btn' active='false'>&#9734;</span>";
    if($("#account").length) $("#account").prepend(actionsBarIcon);
    else $("#right-nav").prepend(actionsBarIcon);
    $("#actions-bar-btn").mouseenter(function() { $(this).html("&#9733;");})
    $("#actions-bar-btn").mouseleave(function() {
        if($(this).attr("active").toLowerCase() != "true")
            $(this).html("&#9734;");
    })

    var searchBarHtml = "<input type='text' class='form-control' id='search-bar-powerup' placeholder='Search Videos...' /><div id='search-results-powerup'></div>";
    if($("#account").length) $("#account").prepend(searchBarHtml);
    else $("#right-nav").prepend(searchBarHtml);
   var elem = $("#search-bar-powerup");

    // Save current value of element
    elem.data('oldVal', elem.val());
    elem.bind("propertychange change click keyup input paste", function(event){
      // If value has changed...
      if (elem.data('oldVal') != elem.val()) {
       // Updated stored value
        elem.data('oldVal', elem.val());
        searchAction(elem);
    }
     });
     elem.focus(function(event) { searchAction(elem);});
     elem.focusout(function() { 
        if(!searchResultsMouseOver)
            searchResults.hide();
    });
}

//Called for search and to display results
function searchAction(elem) {
    searchResults = $("#search-results-powerup");
    searchResults.mouseover(function() { searchResultsMouseOver = true;})
    searchResults.mouseout(function() { searchResultsMouseOver = false;})
    searchResults.html("");
    var position = elem.position();
    var left = position.left;
    var top = $("#nav").top;
    var bottom = top + $("#nav").height();

    //Add search results to results
    var searchResultsArr = getSearchResults(elem.val());
    for(var i = 0; i < searchResultsArr.length; i++){
        var result = searchResultsArr[i];
        if(result){
            //searchResults.append("<a href='/games/" + result.id + "' class='search-results-link'>" + result.title + "</a>");
            searchResults.append(
                "<div class='row search-result'>" + 
                "<a href='/games/" + result.id + "?autoplay=1'>" +
                "<div class='col-md-4 col-sm-4 col-xs-6'>" + 
                    "<img class='img-responsive' src='" + result.poster_img + "'>" + 
                    "</img>" + 
                "</div>" + 
                "<div class ='col-md-4 col-sm-6 col-xs-6'>" + result.title + "</div>" + 
                "</a>" +
                "</div>"
                /*"<div class='post col-xs-3 col-sm-12 col-md-3 pagination-item game'>" +
                  "<div class='inner'>" +
                    "<a href='/games/" + result.id + "?autoplay=1'>" +
                      "<div class='poster-wrapper'>" +
                        "<figure class='poster' style='background-image: url(" + result.poster_img + ")'></figure>" +
                        "<div class='overlay'>" +
                          "<img alt='Play icon' class='play-button' src='http://d1tajj9tvz4hqc.cloudfront.net/assets/play-icon-64e83e7018e8dc5d963b3f78b6e042a2.png'>" +
                        "</div>" +
                      "</div>" +
                      "<div class='info'>" +
                        "<span class='post-type instabanger'>" +
                          "<span>" + result.game_type + "</span>" +
                        "</span>" +
                        "<h3>" +
                          result.title +
                        "</h3>" +
                        "<p class='post-location'>" + result.location + "</p>" +
                        "<p class='post-date'>&nbsp;" + result.publish_date + "&nbsp;ago</p>" +
                      "</div>" +
                    "</a></div><a href='/games/" + result.id + "?autoplay=1'>" +
                  "</a>" +
                "</div>"*/
            );
        }
    }
    searchResults.css({top: bottom, left: left, position:'absolute'});
    searchResults.show();
}

//Returns search results for searching all slvsh videos
function getSearchResults(val) {
    val = val.toLowerCase();
    jsonVideos = games.concat(theater);
    var foundVideos = [];

    //Search is done with simple ranking and contains
    // 2 points fordescription, title, tags_string
    // 1 point for post_class and type
    for(var i = 0; i < jsonVideos.length; i++){
        var result = jsonVideos[i];
        var rank = 0;
        var isFound = false;
        if(result.post_class && result.post_class.toLowerCase().indexOf(val) > -1){ rank +=1; isFound = true; }
        if(result.title && result.title.toLowerCase().indexOf(val) > -1){ rank +=2; isFound = true; }
        if(result.description && result.description.toLowerCase().indexOf(val) > -1){ rank +=2; isFound = true; }
        if(result.tags_string && result.tags_string.toLowerCase().indexOf(val) > -1){ rank +=2; isFound = true; }
        if(result.type && result.type.toLowerCase().indexOf(val) > -1){ rank +=1; isFound = true; }

        if(isFound){
            result.searchRank = rank;
            foundVideos.push(result);
        }        
    }

    //Finally sort based on searchRank
    return foundVideos.sort(function(a, b) {
        return a.searchRank - b.searchRank;
    });
}

//Adds the actions bar and btn to header nav
function actionsBar() {
    //actionsBar = "<div class='row' id='actions-bar'><div id='actions-btns' class='col-xs-1'><div id='queue-btn'>Queue</div><hr><div id='favorites-btn'>Favorites</div></div><div id='actions-content' class='col-xs-11'></div></div>";
    actionsBar = "<div id='actions-bar'><div id='actions-content' class='col-xs-12'></div></div>";
    $("#nav").append(actionsBar);
    var actionsBar = $("#actions-bar");
    var top = $("#nav").position().top + $("#nav").height();
    actionsBar.css({top: top, left:0});

    $("#actions-bar-btn").click(function() {
        if(actionsBar.css("display") == "none"){
            actionsBar.show();
            $(this).attr("active", "true");
            loadFavorites();
        }
        else if(actionsBar.css("display") == "block"){
            actionsBar.hide();
            $(this).attr("active", "false");
        }
    });
}

//Custom function to bind favorite selection to videos - jquery's On isn't working with dynamic posts for some reason
/*function bindFavoritesToVideos() {
    console.log("binding");
    var postFunctionsHtml = "<div class='post-functions'><!--<div class='post-functions-btn'>Queue</div><span class='vertical'>|</span>--><div class='post-functions-btn'>&#9734; Favorite</div></div>";
    var inners = $(".item-container").children();
    for(var i = 0; i < inners.length; i++){
        var post = $(inners[i]);
        if(post.hasClass("post")){
            post.mouseenter(function() {
                $(this).prepend(postFunctionsHtml);
                 //Set up queue and favorite clicks
                 storeFavorites();        
             });
            post.mouseleave(function() {
                 $(".post-functions").remove();                   
             });
        }
    } 
}
function rebindFavoritesToVideos(){
    /*$(".post").off();
    bindFavoritesToVideos();*/
//}

//Binds to click event for storing favorites
function storeFavorites() {
    $(".post-functions-btn").click(function() { 
        var favorites = [];
        console.log($($(this).parent().next()));
        var link = $(this).parent().next().children("a").attr("href").toLowerCase();
        chrome.storage.sync.get("favorites", function(items) {
            favorites = items.favorites;
            var jsonfile = {};
            if(!favorites || !favorites.length) favorites = [link];
            else favorites.push(link);
            jsonfile["favorites"] = favorites;
            chrome.storage.sync.set(jsonfile, function() {
              notify("Favorited!");
            });
        })
    });
}

//Loads favorites for a user into the actions bar
function loadFavorites() {
    var actionsContent = $("#actions-content");
    actionsContent.empty();
    var favorites = [];
    var actionsContentHtml = "";

    chrome.storage.sync.get("favorites", function(items) {
        favorites = items.favorites;
        if(!favorites || !favorites.length){
            actionsContent.append("<div class='col-xs-12 favorites-item'>You have no favorites yet. Add some!</div>");
        }
        else{
            for(var i = 0; i < favorites.length; i++){
                var link = favorites[i];
                var id = link.split("/")[2].substring(0,3);

                var data = getPostById(id);
                if(data){
                    actionsContentHtml = "<div class='col-xs-2 favorites-item'><a href='" + link + "'>" + data.title + "</a></div>";
                    actionsContent.append(actionsContentHtml);
                }
            }
        }
    });
}

//Pops up a notification bar
function notify(message){
    var notifyBar = "<div class='row' id='notify-bar'>" + message + "</div>";
    $(notifyBar).insertAfter("#nav").delay(3000).fadeOut(function() {
        $(this).remove(); 
    });
    notifyBar = $("#notify-bar");
    var top = $("#nav").position().top + $("#nav").height();
    notifyBar.css({top: top, left:0});
}

//Queries jsonVideos to find a post/video by id
function getPostById(id){
    jsonVideos = games.concat(theater);
    return jsonVideos.filter((obj) => obj.id == id)[0];
}

function getPostsByTag(tag){
    jsonVideos = games.concat(theater);
    var videosIds = [];
    for(var i = 0; i < jsonVideos.length; i++){
        var vid = jsonVideos[i];
        var tags_string = vid.tags_string.toLowerCase();
        //console.log(tags_string);
        if(tags_string && tags_string.indexOf(tag.toLowerCase()) > -1) videosIds.push(vid.id);
    }
    return videosIds;
}

function getPostByLink(link){
    jsonVideos = games.concat(theater);
    for(var i = 0; i < jsonVideos.length; i++){
        var video = jsonVideos[i];
        if(link.indexOf(video.id) > -1){
            return video;
        }
    }
    return null;
}


//Loads extra filters for the games page
/*function loadGamesFilters() {
    var leftSidebar = $("#left-side-bar > .fixed-inner > .hidden-xs");
    loadTournamentFilters(leftSidebar);
}

function loadTournamentFilters(sidebar) {
    console.log("yayo");
    sidebar.append("<li><a class id='sunset-park-cup-filter' href='#slvsh_cup_sunset_park'>Sunset Park Cup</a></li>");
    sidebar.append("<li><a class id='perisher-cup-filter' href='#slvsh_cup_perisher'>Perisher Cup</a></li>");
    $("#sunset-park-cup-filter").click(function() {
        while($(".load-more").length){
            $(".load-more").click();
            setTimeout(500, function() {
                $(".load-more").click();
            })
        }
        var currPosts = $(".paginate.posts > .item-container").children();
        var wantedPostsIds = getPostsByTag("slvshcupsunsetpark");
        var wantedPostsIdsCopy = wantedPostsIds;
        console.log(wantedPostsIds);
        for(var i = 0; i < currPosts.length; i++){
            var post = $(currPosts[i]);
            if(post.hasClass("post")){
                var link = $(post.children("a")[0]).attr("href");

                //See if link containing id is an id of slvsh cup sunset park
                var isNeeded = false;
                console.log(link);
                for(var j = 0; j < wantedPostsIdsCopy.length; j++){
                    if(link.indexOf(wantedPostsIdsCopy[j]) > -1){
                        isNeeded = true;
                        break;
                    }
                }
                if(!isNeeded) post.remove();
            }
        }
    })
}*/

/*function setCurrentAndPreviousPath() {
    //Get the current path from storage, set the previous path to this, then set the current path in storage to the current path
    chrome.storage.sync.get("previous_path", function(items) {
    var previous_path = items.previous_path;
    console.log("Old path:" + previous_path);
        chrome.storage.sync.get("url", function(items) {
            var url = items.url;

            //console.log(url);
            var new_previous_path = "";
            if(!url || !url.length) new_previous_path = getCurrentHref();
            else new_previous_path = url;

            var jsonFile = {};
            jsonFile["previous_path"] = new_previous_path;
            console.log(jsonFile);
            chrome.storage.sync.set(jsonFile, function() {
                jsonFile = {};
                jsonFile["url"] = getCurrentHref();
                console.log(jsonFile);
                chrome.storage.sync.set(jsonFile, function() {
                    if(previous_path && previous_path == document.location.href.toLowerCase()){
                        console.log("back button clicked");
                        scrollToVideo();
                    }
                });
            });
        });
    });

    return true;
}

//Returns the current path with the #pagei annotations
function getCurrentHref(){
    var curr_path = window.location.pathname.toLowerCase();
    var curr_href = document.location.href.toLowerCase();
    if(curr_path == "/games" || curr_path == "/games/" || curr_path.startsWith("/games/?")
        || curr_path == "/theater" || curr_path == "/theater/" || curr_path.startsWith("/theater/?")
        || curr_path == "/"){
        if(curr_href.indexOf("#page") == -1){
            return curr_href + "#page" + videoScrollPage;            
        }
    }
    return curr_href;
}*/

/*function scrollToVideo(){
    chrome.storage.sync.get("previous", function(items) {
        previousId = items.previous;
        chrome.storage.sync.get("previousLink", function(items) {
            iterateScroll(previousId, items.previousLink);
        });
    });
}*/


function overrideLoadMore(){
    displayLoader();
}

//Attempts to append videos to video listing page if videos are loaded
function loadMoreFunc(previousIndex = 0){
    if(!currentVideosLoaded){
        //console.log("waiting for videos to load");
        return false;
    }
    else{
        //console.log("do we get here");
        var addToVideoScroll = 0;
        if(previousIndex > 0){
            addToVideoScroll = Math.trunc(previousIndex / 18) + 1;  
            console.log(videoScrollPage + "::" + addToVideoScroll);
            var currentVideosSection = currentVideos.slice(videoScrollPage * 18, addToVideoScroll * 18);
        } 
        else{
            var currentVideosSection = currentVideos.slice(videoScrollPage * 18, (videoScrollPage + 1) * 18);  
            console.log("no previuos");          
        }
        //console.log(currentVideosSection);
        $(".item-container").append(generatePosts(currentVideosSection));

        if(videoScrollPage >= currentVideos.length / 18){
            $(".loader").remove();
            $(".item-container").next().html("<div class='col-lg-12' style='text-align:center'>End of Selected Videos</div>");
        }
        videoScrollPage++;
        return true;
    }    
}

function generatePosts(posts){
    var generatePostsHtml = "";
    for(var i = 0; i < posts.length; i++){
        var post = posts[i];

        //Every two posts, add a new flex row
        if(i % 2 == 0) generatePostsHtml += "<div class='row row-eq-height'>";

        generatePostsHtml += 
        "<div class='post col-xs-12 col-sm-6 col-md-4 pagination-item game'>" +
          "<div class='inner'>" +
            "<a href='/games/" + post.id + "?autoplay=1'>" +
              "<div class='poster-wrapper'>" +
                "<figure class='poster' style='background-image: url(" + post.poster_img + ")'></figure>" +
                "<div class='overlay'>" +
                  "<img alt='Play icon' class='play-button' src='http://d1tajj9tvz4hqc.cloudfront.net/assets/play-icon-64e83e7018e8dc5d963b3f78b6e042a2.png'>" +
                "</div>" +
              "</div>" +
              "<div class='info'>" +
                "<span class='post-type instabanger'>" +
                  "<span>" + post.game_type + "</span>" +
                "</span>" +
                "<h3>" +
                  post.title +
                "</h3>" +
                "<p class='post-location'>" + post.location + "</p>" +
                "<p class='post-date'>&nbsp;" + post.publish_date + "&nbsp;ago</p>" +
              "</div>" +
            "</a></div><a href='/games/" + post.id + "?autoplay=1'>" +
          "</a>" +
        "</div>"
        ;

        //Every two posts, add a new flex row
        if(i % 2 != 0) generatePostsHtml += "</div>";
    }
    return generatePostsHtml;
}

function displayLoader(){
    var loaderHtml = 
    "    <div class='loader'>" 
    +"            <span class='dot dot_1'></span>"
    +"            <span class='dot dot_2'></span>"
    +"            <span class='dot dot_3'></span>"
    +"            <span class='dot dot_4'></span>"
    +"        </div>"
    +"    </div>"
    ;

    $(".load-more").hide();
    var loaderDiv = $(".item-container").next();
    //loaderDiv.empty();
    loaderDiv.html(loaderHtml);
}
        /*var found = iterateScroll();

        //Rely somewhat on google cache of the back button - takes you to bottom of page
        if(!found){
            //scrollHelper(previousLink);
            iterateScroll(previousLink);
        }
    });
}

function scrollHelper(previousLink) {
    console.log("scrolling")
    if(!iterateScroll(previousLink)){
        $("html, body").animate({ scrollTop: $(document).height() -500 }, function() {
            scrollHelper(previousLink);
        });
    }
}*/

/*function iterateScroll(previousId, previousLink) {
    var links = $("a");
    console.log(previousId);
    var found = false;
    for(var i = 0; i < links.length; i++){
        var link = $(links[i]);
        if(link.attr("href") && link.attr("href").indexOf(previousId) > -1){
            found = true;
        }
    }
    if(!found){
        console.log("searching");
        previousIndex = arrayObjectIndexOf(currentVideos, previousId, "id");
        loadMoreFunc(previousIndex);
        console.log(previousLink);
        setTimeout(function() {
            var post = $("a[href='" + previousLink + "']");
            console.log(post.length);
            $('html,body').animate({
                    scrollTop: post.offset().top - $("#nav").height()
                }, 2000);            
        }, 500);

    }
}*/

function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}
    /*console.log("1");
    var lookingForPost = $(".item-container > a[href='" + previousLink + "']");
    if(lookingForPost.length){
        console.log("a");
        $('html,body').animate({
            scrollTop: lookingForPost.offset().top - $("#nav").height()
        }, 2000);
        console.log("b");
        return;
    }
    else{
        console.log("c");
        $("html, body").animate({ scrollTop: $(document).height() -500 }, function() {
            iterateScroll(previousLink);
        });
        //return false;
    }*/
    /*var lookingForPost = $(".item-container > a[href='" + previousLink + "']");
    if(lookingForPost.length){
        $('html,body').animate({
            scrollTop: lookingForPost.offset().top - $("#nav").height()
        }, 2000);
        return;
    }
    else{
        if(loadMore(false, true)){
            iterateScroll(previousLink);            
        }
        else{
            return;
        }
    }
}*/

function bindFavorites(){
    var postFunctionsHtml = "<div class='post-functions'><!--<div class='post-functions-btn'>Queue</div><span class='vertical'>|</span>--><div class='post-functions-btn'>&#9734; Favorite</div></div>";
    $(".item-container").on({
        mouseenter: function () {
            $(this).prepend(postFunctionsHtml);
             //Set up queue and favorite clicks
             storeFavorites();          
        },

        mouseleave: function () {
             $(".post-functions").remove();                   
        }
    }, '.post');
}

//If pressing back button to a videos listing page, return to the previous scroll position
// Grab previous scroll video id from chrome storage
/*function goToScrollPosition(){
    setCurrentAndPreviousPath();
    //If on videos listing page and back button was pressed
}*/


//Stuff that should be done before initializing
function beforeInit() {
    loadMoreInitial();
    getAllVideos();         //Retrieve all slvsh videos in json format asynchronously
    searchBar();            //Add search bar and associated elements
    bindFavorites();
    actionsBar();           //Add footer bar for queueing and favorites
    overrideLoadMore();
}

//Adds all current features to the document!
//Called after getting all videos
function instantiate() {


    loadMore();             //Infinite scroll
    //goToScrollPosition();               //If pressing back button to a videos listing page, return to the previous scroll position
    //infiniteScrollMemory();
    //postFunctions();        //Add functions to each video post 

    //Url specific functions
    /*var url = window.location.pathname.toLowerCase();
    if(url.startsWith("/games")) loadGamesFilters();*/         //Extra games filters
}


/*function reinit() {
    postFunctions();
}*/

beforeInit();




