// Where the backend lives. Empty = same origin (local dev via Vite proxy, or
// all-in-one hosting). For a split deploy (static client + separate server),
// set VITE_SERVER_URL to the server's URL at build time.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
