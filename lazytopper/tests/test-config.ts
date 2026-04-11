export const CANONICAL_PORT = 25246;
export const CANONICAL_BASE_URL =
  process.env.E2E_BASE_URL ??
  process.env.PW_BASE_URL ??
  `http://localhost:${CANONICAL_PORT}`;

export const API_SERVER_PORT = 8080;
export const API_SERVER_URL = `http://localhost:${API_SERVER_PORT}`;
