# icicle
no bullshit twitter extension - mute, customize and truly make it your own.

# Building the extension for your browser
Before continuing, ensure you have **Node.js** (rec. v25.9.0) and **npm** (rec. 11.12.1) installed. Keep in mind you can't load packed extensions into Chrome.
1. Clone the repository
2. Run `npm install` in the root of the repository in your terminal
3. Run `node scripts/build.js [chrome/firefox]` to build the extension for your browser.
    Depending on what browser you want to build for, you will have to specify as a parameter followng the command. (example, `node scripts/build.js chrome`)
4. The extension will be in the `dist/` folder of the repository.

## Loading (Chrome & Chromium based browsers)
- Go to `chrome://extensions` (or `your-browser://extensions` for other Chromium based browsers)
- Ensure **Developer Mode** at top right is active
- Click **Load unpacked**
- Go to the `dist/` folder (where the extension was built) and select the `chrome/` folder
- Done!

## Loading (Firefox)
- Go to `about:debugging`
- Click **Load Temporary Add-on**
- Go to the `dist/` folder (where the extension was built) and open (don't select) the `firefox/` folder 
- Select the `manifest.json` file
- Done!

# Why make this?
- I made this to avoid GTA VI spoilers, but you can use it for muting anything since it's more powerful than regular twitter.
- go to https://github.com/gl-aci-al/blocklists if you want pre-made blocklists made by the community

## Manifests notice
Because of the way manifests and `background.js` files are handled between Chrome and Firefox, depending on what browser you want to use, you'll have to take the `manifest.json` file for it (`manifest.firefox.json` for Firefox, `manifest.chrome.json` for Chrome) and rename it to simply `manifest.json`, then load in your browser. 

Our building script (`scripts/build.js`) does this automatically for you.

# How to help
- Report bugs in the issues tab
- Make pull requests for code
- Suggest features I might be missing
- Find ways the blocklist may get bypassed (make a github issue!)
# Known issues and limitations
- Currently, the extension is not on CWS. I am working on fixing that. Until then, you will have to load it unpacked.
- ~~Firefox is unsupported entirely (sorry! - use chromium based browsers)~~ **Firefox is currently in testing and is not 100% supported**. Please report any bugs you encounter in the Issues tab!
- Bug with the "blur until clicked" for images - I needed to get this extension out ASAP, and cannot bother to fix it. Currently semi-functional.
# Contact & Support
- Discord server: work in progress
- Website for Icicle: work in progress
- Email me at hi@gl.aci.al

I have rushed to get this out, so you will see signs of poorly written/possibly AI code. I apologize for that.
