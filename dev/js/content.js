/**
  * Created by Daniel Mattheiss, 06/04/2016
  * Last updated 08/09/2016
  * This Google chrome extension adds needed functionality to slvsh.com, a competition freeskiing business, website, and concept.
  * Current features include search with post caching, adding videos to favorites, and new SLVSH game notifications
  *
  * Plans for the future include SLVSH stats page (using data from a game's json), queueing videos, tournament view for the SLVSH Cups, improved search and UI (include tricks?),
  *  playlist creation and sharing, comments sections, game ratings, and better video sorting
  *
  * Licensed under the MIT License
  */


$(function() {

//Variables
let posts = [];
let searchResults = $("#search-results-powerup");
let searchResultsMouseOver = false;


//Checks the local chrome storage cache to see if we have already loaded all the posts json once
//Unfortunately this has the caveat of not incorporating new videos - so whenever a new video is posted
// we get posts json and reset the cache - while perhaps not the most effecient, it is easy to implement
// and only requires one GET in the best case
//Also, since chrome sync storage doesn't have space to store all returned data - we can only use chrome local storage
function getAllPosts(){
    const postsUrl = "http://www.slvsh.com/posts.json";

    //Two ajax request timelines -> 1st to get total pages and 2nd to batch send for all remaining pages
    $.get(postsUrl, { page: 1, is_active: !0})
    .then(function(data) {
        chrome.storage.local.get(["cached_posts_json", "most_recent_post"], function(items) {
            const cached_posts_json = items.cached_posts_json;
            const most_recent_post = items.most_recent_post;
            const found_recent_post = data.posts[0].id;

            //load posts from cache
            if(cached_posts_json && most_recent_post && found_recent_post === most_recent_post){
                posts = cached_posts_json;
            }

            //load posts from ajax and store posts in local storage
            else{
                let jsonfile = { most_recent_post: found_recent_post};
                posts = data.posts;
                for(let i = 2; i <= data.total_pages; i++){
                    $.get(postsUrl, { page: i, is_active: !0}).then(function(data){
                        posts = posts.concat(data.posts);
                        if(data.total_pages === data.current_page){
                            jsonfile.cached_posts_json = posts;
                            chrome.storage.local.set(jsonfile);
                        }
                    });           
                }
            }
        });
    });
}

function autoplayFix(){
    if($(".vjs-big-play-button").length && window.location.href.indexOf("autoplay=1") > -1){
        $(".vjs-big-play-button").click();
    }
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

    //Create search html
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
            searchResults.append(
                "<div class='row search-result'>" + 
                "<a href='/games/" + result.id + "?autoplay=1'>" +
                "<div class='col-md-4 col-sm-4 col-xs-6'>" + 
                    "<img class='img-responsive' src='" + result.poster_img + "'>" + 
                    "</img>" + 
                "</div>" + 
                "<div class ='col-md-4 col-sm-6 col-xs-6 search-result-title'>" + result.title + "</div>" + 
                "</a>" +
                "</div>"
            );
        }
    }
    searchResults.css({top: bottom, left: left, position:'absolute'});
    searchResults.show();
}

//Returns search results for searching all slvsh videos
function getSearchResults(val) {
    val = val.toLowerCase();
    var foundVideos = [];

    //Search is done with simple ranking and contains
    // 5 points for title
    // 2 points for description, tags_string
    // 1 point for post_class and type
    for(var i = 0; i < posts.length; i++){
        var result = posts[i];
        var rank = 0;
        var isFound = false;
        if(result.post_class && result.post_class.toLowerCase().indexOf(val) > -1){ rank +=1; isFound = true; }
        if(result.title && result.title.toLowerCase().indexOf(val) > -1){ rank +=5; isFound = true; }
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
        return b.searchRank - a.searchRank;
    });
}

//Adds the actions bar and btn to header nav
function actionsBar() {
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

//Loads favorites for a user into the actions bar
function loadFavorites() {
    var actionsContent = $("#actions-content");
    actionsContent.empty();
    var favorites = [];
    var actionsContentHtml = "";

    chrome.storage.sync.get("favorites", function(items) {
        favorites = items.favorites;
        if(!favorites || !favorites.length){
            actionsContent.append("<div class='col-xs-12 favorites-item nofavorites'>You have no favorites yet. Add some!</div>");
        }
        else{
            for(var i = 0; i < favorites.length; i++){
                if(i % 6 == 0){
                    actionsContent.append("<div class='row'>");
                }

                var link = favorites[i];
                var id = link.split("/")[2].substring(0,3);

                var data = getPostById(id);
                if(data){
                    actionsContentHtml = 
                    "<div class='col-md-2 col-sm-4 col-xs-6 favorites-item'>" + 
                        "<a href='" + link + "'>" + 
                            "<div class='col-sm-12'>" + 
                                "<img class='img-responsive' src='" + data.poster_img + "'>" +
                                "</img>" + 
                            "</div>" + 
                            "<div class='col-sm-12 favorites-title'>" + data.title + "</div>" + 
                        "</a>" +
                    "</div>";
                    actionsContent.append(actionsContentHtml);
                }

                if(i % 6 == 0){
                    actionsContent.append("</div>");
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

//Actions for controlling the look, layout, and functionality of the favorite-a-video button
var FavoriteBtn = {
    btn: undefined,
    id: 0,

    //Creates a favorite button on a page -> should only be called if a video page, as there is no internal page validation
    createBtn: function(id){
        this.id = id;
        $("h1").prepend("<span class='favorite-btn'></span>");
        this.btn = $(".favorite-btn");

        chrome.storage.sync.get("favorites", function(items) {
            let favorite = this.isFavorite(items);

            if(favorite){
                this.styleAsFavorited();
            }
            else{
                this.styleAsNonFavorited();
            }
        }.bind(this));
    },

    //Checks to see if is the item is a favorite by comparing stored paths with the item id
    isFavorite: function(items){
        let favorites = items.favorites;

        if(favorites === undefined || !favorites || favorites.length < 1) return false;
        for(let i = 0; i < favorites.length; i++){
            if(favorites[i].indexOf(this.id) > -1){
                return true;
            }
        }

        return false;
    },

    //Styles the favorite button as a favorited item
    styleAsFavorited: function(){
        this.btn.empty().html("&#9733;");
        this.btn.off();
        this.btn.click(function() {
            this.removeFavorite();
            this.styleAsNonFavorited();
        }.bind(this));
    },

    //Styles the favorite button as an unfavorited item
    styleAsNonFavorited: function(){
        this.btn.empty().html("&#9734;");
        this.btn.off();
        this.btn.mouseenter(function() { $(this).html("&#9733;");})
        this.btn.mouseleave(function() { $(this).html("&#9734;");})            
        this.btn.click(function(){
            this.storeFavorite();
            this.styleAsFavorited();
        }.bind(this));        
    },

    //Stores a favorite in chrome local storage for a user and notifies him/her
    storeFavorite: function(){
        let favorites = [], link = window.location.pathname, jsonfile = {};
        chrome.storage.sync.get("favorites", function(items) {
            favorites = items.favorites;
            if(!favorites || !favorites.length) favorites = [link];
            else favorites.push(link);
            jsonfile["favorites"] = favorites;
            chrome.storage.sync.set(jsonfile, function() {
              notify("Favorited!");
            });
        });
    },

    //Removes a favorite from chrome local storage for a user
    removeFavorite: function(){
        let favorites = [], jsonfile = {};
        chrome.storage.sync.get("favorites", function(items){
            favorites = items.favorites.filter( val => val.indexOf(this.id.toString()) === -1);
            jsonfile["favorites"] = favorites;
            chrome.storage.sync.set(jsonfile);
        }.bind(this));
    }
}

function getPostById(id){
    return posts.filter((obj) => obj.id == id)[0];
}

//Returns a promise that resolves to the id associated with the current pathname
function getIdFromUrlPromise(){
    let url = "http://www.slvsh.com" + window.location.pathname + ".json";
    let p = new Promise(function(resolve, reject){
        $.get(url)
        .then(function(data) {   
            if(data){
                resolve(data.id);
            }
            else{
                reject();
            }
        });     
    });

    return p;
}


//Wrapper function to initialize SLVSH PowerUp
function init() {
    getAllPosts();
    searchBar();            //Add search bar and associated elements
    actionsBar();           //Add actions bar for viewing favorites
    //autoplayFix();

    //Binds the favorite button on video pages
    if($("#post-detail").length){   //We are on a video's page  
        let p = getIdFromUrlPromise();
        p.then((id) => FavoriteBtn.createBtn(id));
    }
}

init();

});