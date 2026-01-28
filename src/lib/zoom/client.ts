// Zoom API Client
// Handles OAuth token exchange, refresh, and API calls

import { ZOOM_CONFIG } from "./config";

interface ZoomTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: number;
  account_id: string;
}

interface ZoomMeeting {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  start_url: string;
  password?: string;
}

interface CreateMeetingParams {
  topic: string;
  type?: number; // 1 = instant, 2 = scheduled, 3 = recurring no fixed time, 8 = recurring fixed time
  start_time?: string; // ISO 8601 format
  duration?: number; // minutes
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    waiting_room?: boolean;
    auto_recording?: "local" | "cloud" | "none";
  };
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(
  code: string
): Promise<ZoomTokenResponse> {
  const credentials = Buffer.from(
    `${ZOOM_CONFIG.clientId}:${ZOOM_CONFIG.clientSecret}`
  ).toString("base64");

  const response = await fetch(ZOOM_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: ZOOM_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

// Refresh access token
export async function refreshAccessToken(
  refreshToken: string
): Promise<ZoomTokenResponse> {
  const credentials = Buffer.from(
    `${ZOOM_CONFIG.clientId}:${ZOOM_CONFIG.clientSecret}`
  ).toString("base64");

  const response = await fetch(ZOOM_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

// Get current user info
export async function getZoomUser(accessToken: string): Promise<ZoomUser> {
  const response = await fetch(`${ZOOM_CONFIG.apiBaseUrl}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Zoom user: ${error}`);
  }

  return response.json();
}

// Create a meeting
export async function createMeeting(
  accessToken: string,
  params: CreateMeetingParams
): Promise<ZoomMeeting> {
  const response = await fetch(`${ZOOM_CONFIG.apiBaseUrl}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: params.topic,
      type: params.type || 2, // Default to scheduled meeting
      start_time: params.start_time,
      duration: params.duration || 60,
      timezone: params.timezone || "America/New_York",
      password: params.password,
      agenda: params.agenda,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: "none",
        ...params.settings,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create meeting: ${error}`);
  }

  return response.json();
}

// Get meeting details
export async function getMeeting(
  accessToken: string,
  meetingId: string
): Promise<ZoomMeeting> {
  const response = await fetch(
    `${ZOOM_CONFIG.apiBaseUrl}/meetings/${meetingId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get meeting: ${error}`);
  }

  return response.json();
}

// Update a meeting
export async function updateMeeting(
  accessToken: string,
  meetingId: string,
  params: Partial<CreateMeetingParams>
): Promise<void> {
  const response = await fetch(
    `${ZOOM_CONFIG.apiBaseUrl}/meetings/${meetingId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update meeting: ${error}`);
  }
}

// Delete a meeting
export async function deleteMeeting(
  accessToken: string,
  meetingId: string
): Promise<void> {
  const response = await fetch(
    `${ZOOM_CONFIG.apiBaseUrl}/meetings/${meetingId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Failed to delete meeting: ${error}`);
  }
}

// List meetings for a user
export async function listMeetings(
  accessToken: string,
  type: "scheduled" | "live" | "upcoming" = "upcoming"
): Promise<{ meetings: ZoomMeeting[] }> {
  const response = await fetch(
    `${ZOOM_CONFIG.apiBaseUrl}/users/me/meetings?type=${type}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list meetings: ${error}`);
  }

  return response.json();
}
