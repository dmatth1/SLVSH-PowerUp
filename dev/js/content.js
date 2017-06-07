/**
  * Created by Daniel Mattheiss, 06/04/2016
  * Last updated 08/09/2016
  * This Google chrome extension adds needed functionality to slvsh.com, a competition freeskiing business, website, and concept.
  * Current features include search with post caching, adding videos to favorites, and new SLVSH game notifications
  *
  * Plans for the future include SLVSH stats page (using data from a game's json), Notification options (none, games, theater, games+ theater),
  *  queueing videos, tournament view for the SLVSH Cups, improved search and UI (include tricks?),
  *  playlist creation and sharing, comments sections, game ratings, and better video sorting
  *
  * Licensed under the MIT License
  */

const statsUrlParam = "?stats=true";

//console.log = function() {};
//console.debug = function() {};

$(function() {

//Variables
let posts = [];
let searchResults = $("#search-results-powerup");
let searchResultsMouseOver = false;
let getAllPostsPromise;


//Checks the local chrome storage cache to see if we have already loaded all the posts json once
//Unfortunately this has the caveat of not incorporating new videos - so whenever a new video is posted
// we get posts json and reset the cache - while perhaps not the most effecient, it is easy to implement
// and only requires one GET in the best case
//Also, since chrome sync storage doesn't have space to store all returned data - we can only use chrome local storage
function getAllPosts(){
    const postsUrl = "http://www.slvsh.com/posts.json";
    let p = new Promise(function(resolve, reject) {

        //Two ajax request timelines -> 1st to get total pages and 2nd to batch send for all remaining pages
        $.get(postsUrl, {page: 1, is_active: !0})
            .then(function (data) {
                chrome.storage.local.get(["cached_posts_json", "most_recent_post"], function (items) {
                    const cached_posts_json = items.cached_posts_json;
                    const most_recent_post = items.most_recent_post;
                    const found_recent_post = data.posts[0].id;

                    //load posts from cache
                    if (cached_posts_json && most_recent_post && found_recent_post === most_recent_post || !data) {
                        posts = cached_posts_json;
                        resolve();
                    }

                    //load posts from ajax and store posts in local storage
                    else {
                        let jsonfile = {most_recent_post: found_recent_post};
                        posts = data.posts;
                        for (let i = 2; i <= data.total_pages; i++) {
                            $.get(postsUrl, {page: i, is_active: !0}).then(function (data) {
                                posts = posts.concat(data.posts);
                                if (data.total_pages === data.current_page) {
                                    jsonfile.cached_posts_json = posts;
                                    chrome.storage.local.set(jsonfile);
                                    resolve();
                                }
                            });
                        }
                    }
                });
            });
    });

    return p;
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

    //Add the Stats link to the slvsh navbar and define its onclick
    let slvshStatsNavLink = function(){
        let navbar = $(".left.nav.navbar-nav");
        navbar.append("<li><a href='/stats'>Stats</a></li>");
        let statsLink = navbar.children().last().children()[0];
        $(statsLink).click(function(e){
            e.preventDefault();
            pushWindowState();
            loadStatsPage();
        });

    };

    //Replace html with stats page html while waiting for posts to be loaded
    var loadStatsPageTries = 0;
    let loadStatsPage = function(){
        console.log("entering");
        let statsLink = $(".left.nav.navbar-nav").children().last().children()[0];
        $(statsLink).parent().attr("class", "current");
        $(statsLink).parent().siblings().attr("class", "");

        let pageContent = $("#page-content");
        pageContent.empty();
        const loadingHTML = "<div class='sampleContainer'>" +
            "<div class='loader'>" + 
            "<span class='dot dot_1'>" + "</span>" + 
            "<span class='dot dot_2'>" + "</span>" + 
            "<span class='dot dot_3'>" + "</span>" + 
            "<span class='dot dot_4'>" + "</span>" + 
            "</div>" + 
            "</div>";

        pageContent.html(loadingHTML);

        getAllPostsPromise.then(function(){
            console.log("hello");
            pageContent.empty();

            //Store player specific results in direct access array
            let players = [];
            for(let i = 0; i < posts.length; i++){
                let post = posts[i];

                if(post.game_type === "S.L.V.S.H."){

                    //Null check - this happened once so this is a quickfix
                    if(post.loser_id == null || post.winner_id == null)
                    {
                        continue;
                    }

                    if(players[post.loser_id] !== undefined){         //Player exists - store game under player
                        let player = players[post.loser_id];
                        player.games.push(post);
                        player.losses.push(post);
                    }
                    else{
                        let player = post.loser;
                        player.games = [post];
                        player.wins = [];
                        player.losses = [post];
                        players[post.loser_id] = player;
                    }
                    if(players[post.winner_id]){         //Player exists - store game under player
                        let player = players[post.winner_id];
                        player.games.push(post);
                        player.wins.push(post);
                    }
                    else{
                        let player = post.winner;
                        player.games = [post];
                        player.wins = [post];
                        player.losses = [];
                        players[post.winner_id] = player;
                    }
                }
            }

            //Now remove all null from array - we will not be performing direct, targeted accesses any more (if we do, comment this next line!)
            //players = players.filter(function(n){ return n !== undefined });

            //Define stats filters
            let statsFilters = "<div id='posts-filters' class='container'>" +
                "<div class='inner col-xs-12'>" +
                "<ul class='hidden-xs'>" +
                "<li><a class='stats-filter' id='stats-filter-total-wins' href='#total-wins'>Total Wins</a></li>" +
                "<li><a href='#winlossratio' class='stats-filter' id='stats-filter-win-percentage'>Win Percentage</a></li>" +
                "<li><a href='#powerrankings' class='stats-filter' id='stats-filter-power-rankings'>Power Rankings</a></li>" +
                "</ul>" +
                "</div>" +
                "</div>";

            pageContent.append("<article id='home-v2'><div class = 'container'><div class='row stats-row'>" + statsFilters + "<div id='stats-body'></div></div></div></article>");
            let container = $("#home-v2 > .container > .row.stats-row > #stats-body");

            //Define each filter's click
            $(".stats-filter").click(function(){
                $(".stats-filter").removeClass("current");
                $(this).addClass("current");
                container.empty();
                container.hide();
            });
            $("#stats-filter-total-wins").click(function(){
                showStatsByTotalWins(container, players.slice());
                container.fadeIn(250);
            });
            $("#stats-filter-win-percentage").click(function(){
                showStatsByWinPercentage(container, players.slice());
                container.fadeIn(250);
            });
            $("#stats-filter-power-rankings").click(function(){
                container.append("Power Rankings calculated by the weight of each players' wins.")
                showsStatsByPowerRankings(container, players.slice());
                container.fadeIn(250);
            });

            //Default
            $("#stats-filter-total-wins").click();

            //Back button functionality
            document.title = "SLVSH Stats";
            pushWindowState("/stats");
        });
    };

    let showsStatsByPowerRankings = function(container, players){

        if(players[5] === undefined || players[5].power_ranking === undefined) calculatePowerRankings(players);

        let playersByPowerRanking = players.sort(function(a,b){
            if(a===undefined) return 1;
            if(b===undefined) return -1;

            if(a.power_ranking > b.power_ranking) return -1;
            if(b.power_ranking > a.power_ranking) return 1;
            if(a.wins > b.wins) return -1;
            if(b.wins > a.wins) return 1;
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        for(let i = 0; i < playersByPowerRanking.length; i++) createPlayerStatsPanel(container, playersByPowerRanking[i], i);

        //Calculate and assigns a power ranking foreach player
        function calculatePowerRankings(players){
            for(let i = 0; i < players.length; i++){
                let player = players[i];
                if(player === undefined) continue;

                let player_power_ranking = player.wins.length - player.losses.length;
                for(let j = 0; j < player.wins.length; j++){
                    let loser = players[player.wins[j].loser_id];
                    if(loser === undefined) continue;

                    //If loser is strong, increase player power ranking by loser win/loss difference
                    if(loser.wins.length > loser.losses.length) player_power_ranking += (loser.wins.length - loser.losses.length) / 2;
                }
                for(let j = 0; j < player.losses.length; j++){
                    let winner = players[player.losses[j].winner_id];
                    if(winner === undefined) continue;

                    //If winner is weak, decrease player power ranking by winner win/loss difference
                    if(winner.wins.length < winner.losses.length) player_power_ranking += (winner.wins.length - winner.losses.length) / 2;
                }
                player.power_ranking = player_power_ranking;
            }

            //Do it twice to clean up from the first time
            for(let i = 0; i < 5; i++) players = iterateThroughPowerRankings(players);
            //for(let i = 0; i < 5; i++) players = iterateThroughPowerRankings(players);

            return players;
        }
    };

    let iterateThroughPowerRankings = function(players){
        //Using each players' power rankings, calculate a second, more precise ranking
        let players_power_rankings = [];
        for(let i = 0; i < players.length; i++){
            let player = players[i];
            if(player === undefined) continue;

            players_power_rankings[i] = player.power_ranking;
            for(let j = 0; j < player.wins.length; j++){
                let loser = players[player.wins[j].loser_id];
                if(loser === undefined) continue;

                //If loser is strong, increase player power ranking by loser/player power_ranking difference
                if(loser.power_ranking > player.power_ranking) players_power_rankings[i] += (loser.power_ranking - player.power_ranking) / 2;
            }
            for(let j = 0; j < player.losses.length; j++){
                let winner = players[player.losses[j].winner_id];
                if(winner === undefined) continue;

                //If winner is weak, decrease player power ranking by winner/player power_ranking difference
                if(winner.power_ranking < player.power_ranking) players_power_rankings[i] += (winner.power_ranking - player.power_ranking) / 2;
            }
        }
        for(let i = 0; i < players.length; i++) {
            if(players[i] !== undefined) players[i].power_ranking = players_power_rankings[i];
        }

        return players;
    };

    let showStatsByWinPercentage = function(container, players){
        let playersByWinPercentage = players.sort(function(a,b){
            if(a === undefined) return 1;
            if(b === undefined) return -1;

            let aPercentage = a.wins.length / (a.wins.length + a.losses.length), bPercentage = b.wins.length / (b.wins.length + b.losses.length);
            if(aPercentage > bPercentage) return -1;
            if(bPercentage > aPercentage) return 1;
            if(a.wins > b.wins) return -1;
            if(b.wins > a.wins) return 1;
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        for(let i = 0; i < playersByWinPercentage.length; i++) createPlayerStatsPanel(container, playersByWinPercentage[i], i);
    };

    let showStatsByTotalWins = function(container, players){
        //Sort players by wins
        let playersByWins = players.sort(function(a, b){
            if(a === undefined) return 1;
            if(b === undefined) return -1;

            if(a.wins > b.wins) return -1;
            if(b.wins > a.wins) return 1;
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        for(let i = 0; i < playersByWins.length; i++){
            let player = playersByWins[i];
            createPlayerStatsPanel(container, player, i);
        }
    };

    let createPlayerStatsPanel = function(container, player, i){
        if(player === undefined) return;

        let playerIdForAvatar = player.id.toString();
        while(playerIdForAvatar.length < 3){
            playerIdForAvatar = "0" + playerIdForAvatar;
        }

        //Create panel string for each player
        let playerStr = "<div class = 'panel panel-primary'>" +
            "<div class='panel-body'>" +
            "<div class='row'>" +
            "<div class='col-xs-12 col-sm-2 col-md-2'>" +
            "<div class='avatar-header'>" + player.name + "</div>" +
            "<img class = 'img-responsive avatar' src='http://slvsh_prod.s3.amazonaws.com/riders/avatars/000/000/" + playerIdForAvatar + "/large/" + player.avatar_file_name + "'/>" +
            "</div><div class='col-sm-1 col-md-1'></div>" +
            "<div class='col-xs-5 col-sm-4 col-md-4'>" +
            "<b>" + player.wins.length + " Wins</b>";

        let winsStr = "", lossesStr = "";
        for(let j = 0; j < player.wins.length; j++){
            let game = player.wins[j];
            winsStr += "<div><a href='" + game.href + "'>" + game.title + "</a></div>";
        }

        playerStr += winsStr;
        playerStr += "</div><div class='col-xs-5 col-sm-4 col-md-4'><b>" + player.losses.length + " Losses</b>";

        for(let j = 0; j < player.losses.length; j++){
            let game = player.losses[j];
            lossesStr += "<div><a href='" + game.href + "'>" + game.title + "</a></div>";
        }

        playerStr += lossesStr + "</div>";

        playerStr += "<div class='col-xs-2 col-sm-1 col-md-1'>";
        playerStr += "<div class='col-xs-12 col-sm-12 col-md-12'><div class='pull-right stats-rank-number'><div class='padding-10'>" + (i+1) + "</div></div></div>";

        let winToLossRatio = (player.wins.length / (player.wins.length + player.losses.length)).toFixed(2) * 100;
        playerStr += "<div class='col-xs-12 col-sm-12 col-md-12'><div class='pull-right'><b>W/L: </b>" + winToLossRatio + "%</div></div>";

        playerStr += "</div>";
        playerStr += "</div></div>" +
            "</div>";

        let playerPanel = $(playerStr);
        container.append(playerPanel);
    };

    //For back button funct.
    let pushWindowState = function(pathname) {
        if(!pathname) pathname = window.location.pathname;
        window.history.pushState({
            "html": document.getElementById("page-content").innerHTML,
            "pageTitle": document.title
        }, "", pathname);
    };
    window.onpopstate = function(e){
        if(e.state){
            document.getElementById("page-content").innerHTML = e.state.html;
            document.title = e.state.pageTitle;
        }
    };

    //Wrapper function to initialize SLVSH PowerUp
    function init() {
        getAllPostsPromise = getAllPosts();
        searchBar();            //Add search bar and associated elements
        actionsBar();           //Add actions bar for viewing favorites
        slvshStatsNavLink();
        //autoplayFix();

        //Binds the favorite button on video pages
        if($("#post-detail").length){   //We are on a video's page
            let p = getIdFromUrlPromise();
            p.then((id) => FavoriteBtn.createBtn(id));
        }
    }

    init();

    //Refresh initiated due to param url, redirect
    if(window.location.href.toLowerCase().indexOf(statsUrlParam) > -1){
        console.log("yay redirect to stats");
        loadStatsPage();
    }

});

//Refreshed, send to home page with param url
if(window.location.pathname.toLowerCase() === "/stats"){
    window.location.href = window.location.origin + statsUrlParam;
}