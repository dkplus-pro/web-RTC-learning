import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const lessons = [
  '01-media-capture',
  '02-device-constraints',
  '03-peer-connection',
  '04-ice-signaling',
  '05-data-channel',
  '06-screen-share',
  '07-stats-debugging',
  '08-production-architecture',
];

const requiredFiles = ['README.md', 'index.html', 'style.css', 'app.js'];
const failures = [];

for (const lesson of lessons) {
  for (const file of requiredFiles) {
    const path = `lessons/${lesson}/${file}`;
    try {
      await access(path, constants.R_OK);
    } catch {
      failures.push(`Missing ${path}`);
      continue;
    }
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.md')) {
      const content = await readFile(path, 'utf8');
      if (content.trim().length < 80) failures.push(`${path} is unexpectedly short`);
    }
  }
}

if (failures.length) {
  console.error('Course validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Course validation passed for ${lessons.length} lessons.`);
