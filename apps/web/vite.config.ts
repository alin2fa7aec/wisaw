import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function serveLocalImages(): Plugin {
    const root = path.resolve(__dirname, "assets/images");
    return {
        name: "serve-local-images",
        configureServer(server) {
            server.middlewares.use("/images", (req, res, next) => {
                const file = path.join(root, req.url?.slice(1) ?? "");
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
        },
    },
});
