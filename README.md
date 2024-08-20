# Watch Later Extractor
[Tampermonkey](https://www.tampermonkey.net/) script to export videos from your YouTube Watch Later page to a JSON file

## Usage
- Go to your [Watch Later](https://www.youtube.com/playlist?list=WL) and wait for the page to load
- Click Run script in the Tampermonkey menu
- Enter URL or ID of video you want to stop at (so it doesn't have to process the whole playlist). Alternatively leave it blank to process the whole playlist
- Wait until download dialog appears

Disabling images might make the process faster. To do this in Firefox, head to [about:config](about:config) and set `permissions.default.image` to `2` (make sure to set it back to default once you're done).