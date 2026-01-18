import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '');

    return {
        server: {
            proxy: {
                // Proxy database calls to Google Apps Script locally
                '/api/db': {
                    target: env.GOOGLE_SCRIPT_URL,
                    changeOrigin: true,
                    rewrite: (path) => '', // We just want to hit the raw URL
                },
            },
        },
        build: {
            outDir: 'dist',
        }
    }
});
