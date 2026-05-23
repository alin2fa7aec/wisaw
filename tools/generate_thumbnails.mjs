import fs from "fs";
import path from "path";
import sharp from "sharp";

const GALLERY_DIR = "apps/web/assets/images/gallery";
const THUMBS_DIR = path.join(GALLERY_DIR, "thumbs");
const MAX_SIZE = 500;
const QUALITY = 75;

const EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;

if (!fs.existsSync(GALLERY_DIR)) {
    console.error(`Error: ${GALLERY_DIR} not found`);
    process.exit(1);
}

fs.mkdirSync(THUMBS_DIR, { recursive: true });

const files = fs.readdirSync(GALLERY_DIR).filter((f) => EXTS.test(f));
console.log(`Generating ${files.length} thumbnails...`);

let done = 0;
await Promise.all(
    files.map(async (file) => {
        const src = path.join(GALLERY_DIR, file);
        const dest = path.join(THUMBS_DIR, file);
        await sharp(src)
            .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "inside" })
            .jpeg({ quality: QUALITY })
            .toFile(dest);
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${files.length}`);
    }),
);

console.log(`Done. ${files.length} thumbnails saved to ${THUMBS_DIR}`);
