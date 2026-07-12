import fs from "fs";
import path from "path";
import sharp from "sharp";

const GALLERY_DIR = "apps/web/assets/images/gallery";
const THUMBS_DIR = path.join(GALLERY_DIR, "thumbs");
const MANIFEST_FILE = path.join(GALLERY_DIR, "manifest.json");
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
const entries = await Promise.all(
    files.map(async (file) => {
        const src = path.join(GALLERY_DIR, file);
        const dest = path.join(THUMBS_DIR, file);
        // .rotate() で EXIF の向きをピクセルへ焼き込む。
        // これでタグに依存せず常に正立し、ブラウザによる自動回転も起きない。
        const info = await sharp(src)
            .rotate()
            .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "inside" })
            .jpeg({ quality: QUALITY })
            .toFile(dest);
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${files.length}`);
        // 回転後の出力寸法を manifest に使う (縦横比が実表示と一致する)
        return { file, w: info.width, h: info.height };
    }),
);

// ファイル名順で安定させてから書き出す
entries.sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(MANIFEST_FILE, JSON.stringify(entries));

console.log(`Done. ${files.length} thumbnails saved to ${THUMBS_DIR}`);
console.log(`Manifest written to ${MANIFEST_FILE}`);
