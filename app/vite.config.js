import { defineConfig, loadEnv } from "vite";

import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
	const rootDir = path.dirname(fileURLToPath(import.meta.url));
	const env = loadEnv(mode, rootDir, "");
	const backendTarget = `http://${env.VITE_BACKEND_HOST}:${env.VITE_BACKEND_PORT}`;

	return {
		plugins: [react()],
		server: {
			proxy: {
				"/api": {
					target: backendTarget,
					changeOrigin: true,
				},
			},
		},
		preview: {
			proxy: {
				"/api": {
					target: backendTarget,
					changeOrigin: true,
				},
			},
		},
	};
});
