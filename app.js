const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const downloadDir = './data/';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      // '--no-sandbox',
      // '--disable-setuid-sandbox',
      // '--disable-gpu',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-sandbox',
      '--no-zygote',
      '--deterministic-fetch',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 2000 });

  console.log('Navigating to the website...');
  await page.goto('https://poweron.loe.lviv.ua/', {
    waitUntil: 'domcontentloaded',
  });

  console.log('Waiting for the React app to render...');
  await page.waitForSelector('img[src*="media"]');

  console.log('Taking a screenshot...');
  await page.screenshot({ path: path.join(downloadDir, 'screenshot.png') });

  console.log('Extracting image sources...');
  const imgSrcs = await page.$$eval("img[src*='media']", (imgs) => imgs.map((img) => img.getAttribute('src')));

  if (imgSrcs.length === 0) {
    console.log('No images found. Exiting...');
    await browser.close();
    return;
  }

  console.log(`Found ${imgSrcs.length} image(s). Downloading...`);
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  await Promise.all(imgSrcs.map((src) => downloadImage(src)));

  console.log('Saving date data...');
  const timestamps = imgSrcs.map((src) => {
    const filename = path.basename(src);
    return fileToUnixTimestamp(filename);
  });

  timestamps.sort();
  fs.writeFileSync(path.join(downloadDir, 'date.txt'), timestamps[timestamps.length - 1], 'utf-8');

  console.log('Done! Closing browser...');
  await browser.close();
})();

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(url);
    const extension = path.extname(filename);
    const filepath = path.join(downloadDir, fileToUnixTimestamp(filename) + extension);

    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(`Failed to download file: HTTP status ${res.statusCode}`);
        }

        const fileStream = fs.createWriteStream(filepath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Downloaded ${filepath}`);
          resolve();
        });
      })
      .on('error', reject);
  });
}

function fileToUnixTimestamp(filename) {
  const hexTimestamp = filename.slice(0, 8);

  const bytes = Buffer.from(hexTimestamp, 'hex');
  const timestamp = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

  return timestamp.toString();
}


