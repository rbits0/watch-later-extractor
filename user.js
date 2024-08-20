// ==UserScript==
// @name         Watch Later Extractor
// @namespace    rbits.watch-later-extractor
// @version      0.0.2
// @description  Exports videos from your YouTube Watch Later page to a JSON file
// @author       rbits
// @match        https://www.youtube.com/playlist*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_registerMenuCommand
// ==/UserScript==



function runScript() {
    console.log("Watch Later Extractor script running");
    
    let box = document.createElement("div");
    box.style = `
        color: white;
        background-color: #555555;
        border-radius: 2rem;
        width: 50rem;
        height: 20rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        padding: 2rem;
    `;
    
    let textElement = document.createElement("p");
    textElement.innerHTML = "Enter id/url of video to stop at<br>(leave blank to process all videos)"
    textElement.style = `
        font-size: 2rem;
        text-align: center;
    `
    box.appendChild(textElement);

    
    let videoIdInput = document.createElement("input");
    videoIdInput.style = `
        font-size: 2rem;
        width: 80%;
    `
    box.appendChild(videoIdInput);
    
    let button = document.createElement("button");
    button.textContent = "Start";
    button.style = `
        font-size: 2rem;
        padding: 0.5rem;
    `
    box.appendChild(button);

    let flex = document.createElement("div");
    flex.style = `
        width: 100vw;
        height: 100vh;
        position: fixed;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `
    flex.appendChild(box);

    document.body.appendChild(flex);
    

    button.onclick = () => {
        startProcessing(videoIdInput.value);
        document.body.removeChild(flex);
    };
}


function startProcessing(stopVideoId) {
    // Convert url to id
    const videoIdMatch = stopVideoId.match(/\/watch\?v=([^&]*)/);
    if (videoIdMatch) {
        stopVideoId = videoIdMatch[1];
    }

    let videosElement = document.querySelector("ytd-playlist-video-renderer").parentElement;
    let signals = {
        allLoaded: false,
    }

    parseVideos(videosElement, stopVideoId, signals)
        .then(handleParsedVideos);


    repeatScroll(videosElement, signals);
}


// Parses all videos as they appear in videos
// Once signals.allLoaded is set, it finishes parsing all remaining videos then
// returns list of parsed videos
async function parseVideos(videosElement, stopVideoId, signals) {
    console.log("Starting video parsing");
    if (stopVideoId !== "") {
        console.log("Stopping at %s", stopVideoId);
    }

    let videos = videosElement.children;
    let parsedVideos = [];
    let i = 0;
    let didFinishEarly = false;

    // videos can grow at any time
    while (true) {
        while (i < videos.length - 1) {
            const parsedVideo = parseVideo(videos.item(i));
            parsedVideos.push(parsedVideo);
            i++;
            
            if (parsedVideo.videoId === stopVideoId) {
                didFinishEarly = true;
                signals.allLoaded = true;
                break;
            }
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
    if (isEnd(videos) && !didFinishEarly) {
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
        if (isEnd(videos) || signals.allLoaded) {
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
    
    const jsonString = JSON.stringify(parsedVideos);
    const base64String = stringToBase64(jsonString);

    var downloadLink = document.createElement("a");
    downloadLink.href = "data:text/plain;base64," + base64String;
    downloadLink.download = "playlist.json";
    downloadLink.click();
    
    // console.dir(parsedVideos);
}


// From https://developer.mozilla.org/en-US/docs/Glossary/Base64
function stringToBase64(string) {
    const bytes = new TextEncoder().encode(string);
    const binString = Array.from(bytes, (byte) =>
        String.fromCodePoint(byte),
    ).join("");
    return btoa(binString);
}



(function() {
    'use strict';

    GM_registerMenuCommand(
        "Run script",
        runScript,
    );
})();