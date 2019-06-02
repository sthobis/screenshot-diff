const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const exePath = "C:/Users/sthobis/AppData/Roaming/npm/node_modules/puppeteer/.local-chromium/win64-662092/chrome-win/chrome.exe"
const getOptions = async () => {
  return process.env.NOW_REGION === "dev1"
    ? {
        args: [],
        executablePath: exePath,
        headless: true,
    }
    : {
        args: [...chrome.args, '--font-render-hinting=medium'],
        executablePath: await chrome.executablePath,
        headless: chrome.headless,
    }
}

async function getScreenshot(url) {
    const browser = await puppeteer.launch(await getOptions());

    const page = await browser.newPage();
    page.setViewport({
        width: 1368,
        height: 768,
        isLandscape: true
    });
    await page.goto(url);
    const file = await page.screenshot({ type: 'png', fullPage: true });
    await browser.close();
    return file;
}

module.exports = { getScreenshot };
