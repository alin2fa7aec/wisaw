import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function readImageSize(filePath: string): { w: number; h: number } | null {
    const buf = Buffer.alloc(65536);
    const fd = fs.openSync(filePath, "r");
    const n = fs.readSync(fd, buf, 0, 65536, 0);
    fs.closeSync(fd);

    if (buf[0] === 0x89 && buf[1] === 0x50) {
        return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }

    if (buf[0] === 0xff && buf[1] === 0xd8) {
        let off = 2;
        while (off < n - 9) {
            if (buf[off] !== 0xff) break;
            const m = buf[off + 1];
            if (m === 0xc0 || m === 0xc1 || m === 0xc2)
                return { w: buf.readUInt16BE(off + 7), h: buf.readUInt16BE(off + 5) };
            if (m === 0xda || m === 0xd9) break;
            off += 2 + buf.readUInt16BE(off + 2);
        }
    }

    return null;
}

function serveLocalImages(): Plugin {
    const root = path.resolve(__dirname, "assets/images");
    return {
        name: "serve-local-images",
        configureServer(server) {
            server.middlewares.use("/images", (req, res, next) => {
                const relPath = req.url?.slice(1) ?? "";

                if (relPath === "gallery/manifest.json") {
                    const galleryDir = path.join(root, "gallery");
                    // 生成済みの manifest があればそのまま返す。
                    // 表示順(ランダム)と回転後の寸法が本番と一致する。
                    const manifestFile = path.join(galleryDir, "manifest.json");
                    if (fs.existsSync(manifestFile)) {
                        res.setHeader("Content-Type", "application/json");
                        fs.createReadStream(manifestFile).pipe(res);
                        return;
                    }
                    // 未生成のときのみディレクトリから動的に組み立てる(フォールバック)。
                    const entries = fs.existsSync(galleryDir)
                        ? fs.readdirSync(galleryDir)
                              .filter((f) => /\.(jpe?g|png|webp|gif|avif)$/i.test(f))
                              .sort()
                              .map((f) => {
                                  const size = readImageSize(path.join(galleryDir, f));
                                  return { file: f, w: size?.w ?? 1, h: size?.h ?? 1 };
                              })
                        : [];
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(entries));
                    return;
                }

                const file = path.join(root, relPath);
                if (!file.startsWith(root) || !fs.existsSync(file)) return next();
                res.setHeader("Content-Type", `image/${path.extname(file).slice(1)}`);
                fs.createReadStream(file).pipe(res);
            });
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: [["babel-plugin-react-compiler"]],
            },
        }),
        tailwindcss(),
        serveLocalImages(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            "/submit": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
            // /moment/* をまとめて流したいところだが、下の /moments も前方一致して
            // しまうため、API の口は1つずつ挙げる。
            "/moment/presign": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
            "/moment/delete": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
            // 本番では CloudFront が moments/* を専用バケットへ振り分ける。
            // ローカルでは MinIO をパススタイルで叩くため、バケット名を差し込む。
            "/moments": {
                target: "http://localhost:9000",
                changeOrigin: true,
                rewrite: (p) => `/wisaw-local-moments${p}`,
            },
        },
    },
});
