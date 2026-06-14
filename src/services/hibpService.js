import axios from "axios";

const HIBP_KEY = import.meta.env.VITE_HIBP_API_KEY;

// Check an email against HaveIBeenPwned breaches.
// Returns an array of breach objects or an empty array.
export async function checkHIBP(email) {
	if (!email) return [];

	if (!HIBP_KEY) {
		console.warn("HIBP API key not set (VITE_HIBP_API_KEY). Skipping HIBP lookup.");
		return [];
	}

	const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;

	try {
		const res = await axios.get(url, {
			headers: {
				"hibp-api-key": HIBP_KEY,
				"User-Agent": "SentryWatch",
			},
		});

		return Array.isArray(res.data) ? res.data : [];
	} catch (err) {
		if (err.response && err.response.status === 404) {
			// 404 means no breach found for that account
			return [];
		}

		console.error("HIBP lookup error", err?.response?.status || err.message || err);
		return [];
	}
}

