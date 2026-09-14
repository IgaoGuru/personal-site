import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) {
  console.error('Usage: pnpm import:vibes /path/to/important_images');
  process.exit(1);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'public/vibes');
if (resolve(source) === output) throw new Error('Choose a source folder other than public/vibes.');
const files = (await readdir(source, { withFileTypes: true }))
  .filter((file) => file.isFile() && /\.(jpe?g|png|webp)$/i.test(file.name))
  .map((file) => file.name)
  .sort();
if (!files.length) throw new Error('No supported images found.');

await mkdir(output, { recursive: true });
const images = [];
let originalBytes = 0;
let optimizedBytes = 0;
for (const name of files) {
  const original = await readFile(resolve(source, name));
  const { data, info } = await sharp(original)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 20);
  const filename = `${hash}.webp`;
  await writeFile(resolve(output, filename), data);
  images.push({ src: `/vibes/${filename}`, width: info.width, height: info.height });
  originalBytes += original.length;
  optimizedBytes += data.length;
}

await writeFile(resolve(root, 'src/data/vibes.json'), `${JSON.stringify(images, null, 2)}\n`);
console.log(`Imported ${images.length} images: ${(originalBytes / 1e6).toFixed(1)} MB → ${(optimizedBytes / 1e6).toFixed(1)} MB.`);
