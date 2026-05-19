const FALLBACK_API_URL = 'https://conceptgraphai.onrender.com/api';
const configuredApiUrl = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || '';
const isLocalhostUrl = /localhost|127\.0\.0\.1/i.test(configuredApiUrl);

export const API_BASE_URL = (configuredApiUrl && !isLocalhostUrl ? configuredApiUrl : FALLBACK_API_URL).replace(/\/+$/, '');

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
