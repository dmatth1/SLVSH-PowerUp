/**
  * Created by Daniel Mattheiss, 06/04/2016
  * Last updated 06/05/2016
  * This Google chrome extension adds needed functionality to slvsh.com, a competition freeskiing business, website, and concept.
  * Current features include infinite scroll, search, and adding videos to favorites.
  *
  * Plans for the future include new video notifications, queueing videos, tournament view for the SLVSH Cups, improved search and UI,
  *  playlist creation and sharing, comments sections, game ratings, and better video sorting
  * Feel free to fork/contribute. If you are planning to work on one of the above (unimplemented) features, communicate with me so we don't have conflicting code.
  *
  * Licensed under the MIT License
  */


//Variables
var searchResults, jsonVideos = [], games = [], theater = [];
var searchResultsMouseOver = false, favoritesBarMouseOver = false;


//Instantiates auto load on scroll
function loadMore() {
    if(document.getElementsByClassName("load-more").length > 0){
        loadMoreBtn = document.getElementsByClassName("load-more")[0];
        $(window).scroll(function() {
           if($(window).scrollTop() + $(window).height() > $(document).height()-150) {
                $(window).unbind('scroll');
                loadMoreBtn.click();
                setTimeout(loadMore, 500);
           }
        });
    }
}

//
//Not working right - cant handle asynchronous load more
function postFunctions() {
    var postFunctionsHtml = "<div class='post-functions'><!--<div class='post-functions-btn'>Queue</div><span class='vertical'>|</span>--><div class='post-functions-btn'>&#9734; Favorite</div></div>";
    /*$(".paginate.posts").on('mouseenter', ".post > .inner", function() {
        console.log(this);
        $(this).prepend(postFunctionsHtml);
    });
    $(".post > .inner").mouseleave(() => $(".post-functions").remove());*/

    $(document).on({
        mouseenter: function() {
            $(this).prepend(postFunctionsHtml);
             //Set up queue and favorite clicks
             storeFavorites();
        },
        mouseleave: function() {
            $(".post-functions").remove();            
        }
    }, ".post > .inner");

}

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
        if(result)
            searchResults.append("<a href='/games/" + result.id + "' class='search-results-link'>" + result.title + "</a>");
    }
    searchResults.css({top: bottom, left: left, position:'absolute'});
    searchResults.show();
}


//Ajax get request for json games and theater
function getAllVideos() {
    //Get first page of games to get the next n pages
    $.get("http://www.slvsh.com/games.json", function(data) {
        games = data.posts;
        for(var i = data.current_page + 1; i < data.total_pages + 1; i++){
            $.get("http://www.slvsh.com/games.json", { page: i, is_active: !0}, function(data, status){
                games = games.concat(data.posts);
            });
        }
    });

    //At the same time add to theater
    $.get("http://www.slvsh.com/theater.json", function(data) {
        theater = data.posts;
        for(var i = data.current_page + 1; i < data.total_pages + 1; i++){
            $.get("http://www.slvsh.com/theater.json", { page: i, is_active: !0}, function(data, status){
                theater = theater.concat(data.posts);
            });
        }
    });
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

//Binds to click event for storing favorites
function storeFavorites() {
    $(".post-functions-btn").click(function() {
        var favorites = [];
        var link = $(this).parent().next().attr("href").toLowerCase();
        chrome.storage.sync.get("favorites", function(items) {
            favorites = items.favorites;
            var jsonfile = {};
            favorites.push(link);
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
        for(var i = 0; i < favorites.length; i++){
            var link = favorites[i];
            var id = link.split("/")[2].substring(0,3);

            var data = getPostById(id);
            if(data){
                actionsContentHtml = "<div class='col-xs-2 favorites-item'><a href='" + link + "'>" + data.title + "</a></div>";
                actionsContent.append(actionsContentHtml);
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


//Adds all current features to the document!
function instantiate() {
    getAllVideos();     //Retrieve all slvsh videos in json format asynchronously
    loadMore();         //Infinite scroll
    searchBar();        //Add search bar and associated elements
    postFunctions();    //Add functions to each video post 
    actionsBar();        //Add footer bar for queueing and favorites
}

function reinit() {
    postFunctions();
}

instantiate();





