const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const cropLeft = 95;
const cropTop = 184;
const cropRight = 110;
const cropBottom = 5;

const outputDir = './data/slices/';

async function processImages(filename) {
  const colors = [];
  console.log(`  ℹ️ Processing ${filename} ...`);
  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (e) {
    console.error(e);
  }

  let img;
  try {
    img = await loadImage(filename);
  } catch (e) {
    throw new Error('  ❌ Error loading image ...', e);
  }

  console.log('  ✅ Image loaded ...');

  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const minX = cropLeft;
  const minY = cropTop;
  const maxX = img.width - cropRight;
  const maxY = img.height - cropBottom;

  if (minX >= maxX || minY >= maxY) {
    throw new Error('  ❌ Cropping dimensions exceed image size ...');
  }

  const croppedCanvas = createCanvas(maxX - minX, maxY - minY);
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(canvas, minX, minY, maxX - minX, maxY - minY, 0, 0, maxX - minX, maxY - minY);

  console.log('  ✅ Cropped image created ...');

  // save cropped image to file
  const croppedFilename = `./data/${path.parse(filename).name}-cropped.png`;
  const out = fs.createWriteStream(croppedFilename);
  const stream = croppedCanvas.createPNGStream();
  stream.pipe(out);

  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });

  const cellsX = 24; // Number of columns
  const cellsY = 6; // Number of rows
  const cellWidth = croppedCanvas.width / cellsX;
  const cellHeight = croppedCanvas.height / cellsY;

  for (let row = 0; row < cellsY; row++) {
    for (let col = 0; col < cellsX; col++) {
      // console.log(`Processing cell ${row}x${col}...`);
      // Create a canvas for the cell
      const cellCanvas = createCanvas(cellWidth, cellHeight);
      const cellCtx = cellCanvas.getContext('2d');

      // Draw the corresponding part of the cropped image onto the cell canvas
      cellCtx.drawImage(
        croppedCanvas,
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight, // Source
        0,
        0,
        cellWidth,
        cellHeight // Destination
      );

      const color = getDominatedCellColor(cellCtx, colors);
      colors[row] = colors[row] || [];
      colors[row][col] = color;

      // Generate a filename for the slice
      const fileName = `${outputDir}/slice_${row}x${col}.png`;

      // Write the image to the filesystem
      const out = fs.createWriteStream(fileName);
      const stream = cellCanvas.createPNGStream();
      stream.pipe(out);
      await new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
      });
      // out.on('finish', () => console.log(`Saved: ${fileName}`));
    }
  }

  return colors;
}

function getDominatedCellColor(ctx, colors) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const cellColors = {
    red: 0,
    green: 0,
    blue: 0,
  };

  for (let i = 0; i < data.length; i += 4) {
    cellColors.red += data[i];
    cellColors.green += data[i + 1];
    cellColors.blue += data[i + 2];
  }
  
  // console.log('Cell colors', cellColors);

  if (cellColors.red  > cellColors.green) {
    return 1;
  }

  return 0;
}

function rgbToHex(r, g, b) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function componentToHex(c) {
  const hex = c.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

module.exports = processImages;
