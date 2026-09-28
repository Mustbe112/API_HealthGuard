export const LOCAL_CORS_SNIPPET = `app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});`;

export function isLocalHttpTarget(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

export function localTargetError(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (url.port === "3000" || url.port === "5173") {
      return (
        `${url.origin} looks like a website (Next/Vite), not an API. Create a new project and set Base URL to the API process, ` +
        `for example http://localhost:4000 or http://localhost:5000 — the port you see when you start that other project.`
      );
    }
  } catch {
    // fall through
  }
  return (
    `This site reached ${baseUrl} but the browser blocked the responses (CORS). ` +
    `Add this to the API you are testing (not to HealthGuard):\n\n${LOCAL_CORS_SNIPPET}`
  );
}
