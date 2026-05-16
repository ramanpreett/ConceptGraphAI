const FALLBACK_API_URL = 'https://conceptgraphai.onrender.com/api';

export const API_BASE_URL = (process.env.REACT_APP_API_URL || FALLBACK_API_URL).replace(/\/+$/, '');

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
