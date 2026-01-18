/**
 * Vercel Serverless Function
 * Proxies requests to Google Apps Script securely.
 */

export default async function handler(req, res) {
    const GOOGLE_URL = process.env.GOOGLE_SCRIPT_URL;

    if (!GOOGLE_URL) {
        return res.status(500).json({ error: 'Server configuration error (Missing URL)' });
    }

    try {
        const isPost = req.method === 'POST';
        let url = GOOGLE_URL;

        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (isPost) {
            // Forward the body
            options.body = JSON.stringify(req.body);
        } else {
            // Forward query params
            const query = new URLSearchParams(req.query).toString();
            url += (url.includes('?') ? '&' : '?') + query;
        }

        const response = await fetch(url, options);
        const data = await response.json();

        return res.status(200).json(data);
    } catch (error) {
        console.error('[Proxy Error]:', error);
        return res.status(500).json({ error: 'Failed to communicate with database', details: error.message });
    }
}
