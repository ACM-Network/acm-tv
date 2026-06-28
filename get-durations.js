/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');

const streams = {
  'the-family-star': 'https://d3sgzbosmwirao.cloudfront.net/video/f36f1d5c789e7104ff5b1785a117ffde4de9f9ef39f636b004adb7c6cd309bec/1/hls/h264_high.m3u8',
  'adipurush': 'https://d3sgzbosmwirao.cloudfront.net/video/cd82740e63c46e3515b99131e2e932f6a04435e739697626dca3d0e85fc7b5fc/1/hls/h264_high.m3u8',
  'train-to-busan': 'https://d3sgzbosmwirao.cloudfront.net/video/33c589bec0ad581342ed465c158580742c40f53bc5331d744940c038602972ba/1/hls/h264_high.m3u8',
  'drushyam-2': 'https://d3sgzbosmwirao.cloudfront.net/video/54f32048a38168ce0c2d77363b678205d6b5249d019ed3ac5fa5ac51fd319821/1/hls/h264_high.m3u8',
  'narappa': 'https://d3sgzbosmwirao.cloudfront.net/video/9979233aa3b683125701fc09b457257ad5f89ba83014434447a88811d46cc7d0/1/hls/h264_high.m3u8',
  'ek-mini-katha': 'https://d3sgzbosmwirao.cloudfront.net/video/26cdb458780a6d20bc2dabbd16870d6e0e371dcd26ef67bd58f2c6f0ce95c62d/1/hls/h264_high.m3u8',
  'middle-class-melodies': 'https://d3sgzbosmwirao.cloudfront.net/video/4685562a9dc6e6bf16c381f551240964a1e1f70ad65a83385fd9e394e578a6fa/1/hls/h264_high.m3u8',
  'operation-valentine': 'https://d3sgzbosmwirao.cloudfront.net/video/ab04d2e5ae0b261162badd2490f6e24c8bf9758a5d86e2f648d6e49a84409784/4/hls/h264_high.m3u8'
};

const results = {};

for (const [id, url] of Object.entries(streams)) {
  try {
    const output = execSync(`ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${url}"`);
    const duration = Math.round(parseFloat(output.toString().trim()));
    results[id] = duration;
    console.log(`${id}: ${duration}`);
  } catch (error) {
    console.error(`Error with ${id}`);
  }
}

require('fs').writeFileSync('durations.json', JSON.stringify(results, null, 2));
console.log('Saved to durations.json');
