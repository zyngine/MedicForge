// Zoom OAuth Configuration

export const ZOOM_CONFIG = {
  clientId: process.env.ZOOM_CLIENT_ID || "",
  clientSecret: process.env.ZOOM_CLIENT_SECRET || "",
  redirectUri: process.env.ZOOM_REDIRECT_URI || "",

  // OAuth URLs
  authorizationUrl: "https://zoom.us/oauth/authorize",
  tokenUrl: "https://zoom.us/oauth/token",

  // API Base URL
  apiBaseUrl: "https://api.zoom.us/v2",

  // Scopes needed for meeting management
  scopes: [
    "meeting:write:admin",
    "meeting:read:admin",
    "user:read:admin",
    "recording:read:admin",
  ],
};

export function getZoomAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ZOOM_CONFIG.clientId,
    redirect_uri: ZOOM_CONFIG.redirectUri,
    state,
  });

  return `${ZOOM_CONFIG.authorizationUrl}?${params.toString()}`;
}

export function isZoomConfigured(): boolean {
  return !!(
    ZOOM_CONFIG.clientId &&
    ZOOM_CONFIG.clientSecret &&
    ZOOM_CONFIG.redirectUri
  );
}
