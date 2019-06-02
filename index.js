const { parse } = require('url');
const { getScreenshot } = require('./chromium');
const { getDiffImage } = require('./compare');
const { isValidUrl } = require('./validator');

function setBadRequest(res, content) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html');
    res.end(content);
}

module.exports = async function (req, res) {
    try {
        const { query = {} } = parse(req.url, true);
        if (!query.url) {
            return setBadRequest(res, `<h1>Bad Request</h1><p>Pass two urls using url query. For example: <code>?url=https://google.com,https://instagram.com</code></p>`);
        }

        const urls = query.url.split(',');
        if (urls.length !== 2) {
            return setBadRequest(res, `<h1>Bad Request</h1><p>Pass two urls using url query. For example: <code>?url=https://google.com,https://instagram.com</code></p>`);
        }

        const isValidUrls = urls.map(isValidUrl);
        if (isValidUrls.includes(false)) {
            return setBadRequest(res, `<h1>Bad Request</h1><p>The url ${isValidUrls.filter(!Boolean).map((v, i) => `<em>${url[i]}</em>`)} is not valid.</p>`);
        }

        const files = await Promise.all([
            await getScreenshot(urls[0]),
            await getScreenshot(urls[1])
        ])
        const file = await getDiffImage(...files);
        
        res.statusCode = 200;
        res.setHeader('Content-Type', `image/png`);
        res.end(file);
    } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>Server Error</h1><p>Sorry, there was a problem</p>');
        console.error(e.message);
    }
};
