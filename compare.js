const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const stb = require('stream-to-buffer');

async function bufferToPng(buffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    stb(stream, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer);
    });
  });
}

/**
 * https://github.com/americanexpress/jest-image-snapshot/pull/42/files
 * Helper function to create reusable image resizer
 */
const createImageResizer = (width, height) => (source) => {
  const resized = new PNG({ width, height, fill: true });
  PNG.bitblt(source, resized, 0, 0, source.width, source.height, 0, 0);
  return resized;
};

/**
 * https://github.com/americanexpress/jest-image-snapshot/pull/42/files
 * Fills diff area with black transparent color for meaningful diff
 */
const fillSizeDifference = (width, height) => (image) => {
  const inArea = (x, y) => y > height || x > width;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (inArea(x, y)) {
        const idx = ((image.width * y) + x) << 2;
        image.data[idx] = 0;
        image.data[idx + 1] = 0;
        image.data[idx + 2] = 0;
        image.data[idx + 3] = 64;
      }
    }
  }
  return image;
};

/**
 * https://github.com/americanexpress/jest-image-snapshot/pull/42/files
 * Aligns images sizes to biggest common value
 * and fills new pixels with transparent pixels
 */
const alignImagesToSameSize = (firstImage, secondImage) => {
  // Keep original sizes to fill extended area later
  const firstImageWidth = firstImage.width;
  const firstImageHeight = firstImage.height;
  const secondImageWidth = secondImage.width;
  const secondImageHeight = secondImage.height;
  // Calculate biggest common values
  const resizeToSameSize = createImageResizer(
    Math.max(firstImageWidth, secondImageWidth),
    Math.max(firstImageHeight, secondImageHeight)
  );
  // Resize both images
  const resizedFirst = resizeToSameSize(firstImage);
  const resizedSecond = resizeToSameSize(secondImage);
  // Fill resized area with black transparent pixels
  return [
    fillSizeDifference(firstImageWidth, firstImageHeight)(resizedFirst),
    fillSizeDifference(secondImageWidth, secondImageHeight)(resizedSecond),
  ];
};

async function getDiffImage(buffer1, buffer2) {
  const [rawReceivedImage, rawBaselineImage] = await Promise.all([bufferToPng(buffer1), bufferToPng(buffer2)]);
  
  const hasSizeMismatch = (
    rawReceivedImage.height !== rawBaselineImage.height ||
    rawReceivedImage.width !== rawBaselineImage.width
  );
  // Align images in size if different
  const [receivedImage, baselineImage] = hasSizeMismatch
    ? alignImagesToSameSize(rawReceivedImage, rawBaselineImage)
    : [rawReceivedImage, rawBaselineImage];
  const imageWidth = receivedImage.width;
  const imageHeight = receivedImage.height;

  const diffImage = new PNG({width: imageWidth, height: imageHeight});
  pixelmatch(receivedImage.data, baselineImage.data, diffImage.data, imageWidth, imageHeight, {threshold: 0.1});
  const buffer = await streamToBuffer(diffImage.pack())
  return buffer;
}

module.exports = { getDiffImage };
