const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 64, 192, 512];
const publicDir = path.join(__dirname, '../public');

// Ensure the public directory exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PNG icons
sizes.forEach(size => {
    sharp(path.join(publicDir, 'icon.svg'))
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `logo${size}.png`))
        .then(() => console.log(`Generated logo${size}.png`))
        .catch(err => console.error(`Error generating logo${size}.png:`, err));
});

// Generate favicon.ico (16x16, 32x32)
sharp(path.join(publicDir, 'icon.svg'))
    .resize(32, 32)
    .toFile(path.join(publicDir, 'favicon.ico'))
    .then(() => console.log('Generated favicon.ico'))
    .catch(err => console.error('Error generating favicon.ico:', err)); 