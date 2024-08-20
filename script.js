// ==UserScript==
// @name         Watch Later Extractor
// @namespace    rbits.watch-later-extractor
// @version      0.0.1
// @description  Exports videos from your yYouTube Watch Later page to a JSON file
// @author       rbits
// @match        https://www.youtube.com/playlist*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_registerMenuCommand
// ==/UserScript==


// permissions.default.image


function runScript() {
    console.log("Script running");
    
    let videosElement = document.querySelector("ytd-playlist-video-renderer").parentElement;
    let signals = {
        allLoaded: false,
    }

    parseVideos(videosElement, signals)
        // .then((parsedVideos) => {console.dir(parsedVideos)});
        .then(handleParsedVideos);


    repeatScroll(videosElement, signals);
}


// Parses all videos as they appear in videos
// Once signals.allLoaded is set, it parses all remaining videos then
// returns list of parsed videos
async function parseVideos(videosElement, signals) {
    let videos = videosElement.children;
    let parsedVideos = [];
    let i = 0;

    // videos can grow at any time
    while (true) {
        while (i < videos.length - 1) {
            parsedVideos.push(parseVideo(videos.item(i)));
            i++;
        }
        
        if (signals.allLoaded) {
            break;
        }
        
        console.log("Parsed %d videos, waiting for more videos", i);
        while (i >= videos.length - 1 && !signals.allLoaded) {
            // Wait 0.1s between checks
            await new Promise(executor => setTimeout(executor, 100))
        }
    }
    
    // Usually last item is ytd-continuation-item-renderer so isn't parsed
    // It's probably a video now, so it should be parsed now
    if (isEnd(videos)) {
        const lastItem = videos.item(videos.length - 1);
        parsedVideos.push(parseVideo(lastItem));
    } else {
        console.log("Exited early: parsing finished but continuation item still exists");
    }

    return parsedVideos;
}


function parseVideo(videoElement) {
    // const thumbnail = videoElement.getElementsByTagName("img")[0].src;

    const titleElement = videoElement.querySelector("#video-title");
    const videoId = titleElement.href.match(/\/watch\?v=([^&]*)/)[1];
    const title = titleElement.title;
    
    const channelElement = videoElement.querySelector("#channel-name")
        .getElementsByTagName("a")[0];
    const channelUrl = channelElement.href;
    const channelName = channelElement.textContent;

    return {
        videoId,
        // thumbnail,
        title,
        channelName,
        channelUrl,
    };
}


async function repeatScroll(videosElement, signals) {
    let videos = videosElement.children;
    
    // No need to scroll, already loaded
    if (isEnd(videos)) {
        signals.allLoaded = true;
        return;
    }

    const mutationCallback = (_mutationList, observer) => {
        if (isEnd(videos)) {
            signals.allLoaded = true;
            observer.disconnect();
        } else {
            scrollToBottom()
        }
    }

    const observer = new MutationObserver(mutationCallback);
    observer.observe(videosElement, { childList: true });

    scrollToBottom();
}


function scrollToBottom() {
    window.scroll(0, document.documentElement.scrollHeight);
    console.log("Scrolled to " + document.documentElement.scrollHeight);
}


function isEnd(videos) {
    const lastItem = videos.item(videos.length - 1);
    if (lastItem.tagName === "YTD-PLAYLIST-VIDEO-RENDERER") {
        return true;
    } else if (lastItem.tagName === "YTD-CONTINUATION-ITEM-RENDERER") {
        return false;
    } else {
        console.error(lastItem.tagName);
        throw new Error("Unknown item in video list");
    }
}


function handleParsedVideos(parsedVideos) {
    console.log("All videos parsed, creating file");

    var downloadLink = document.createElement("a");
    downloadLink.href = "data:text/plain," + JSON.stringify(parsedVideos);
    downloadLink.download = "playlist.json";
    downloadLink.click();
}



(function() {
    'use strict';

    GM_registerMenuCommand(
        "Run script",
        runScript,
    );
})();