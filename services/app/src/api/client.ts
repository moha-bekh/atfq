import ky from "ky";

type RefreshResponse = {
  status: string;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
    has_password: boolean;
    mfa_enabled: boolean;
  };
};

const configuredApiUrl = import.meta.env.VITE_API_URL || "/api/v1";
const API_URL = configuredApiUrl.startsWith("http")
  ? configuredApiUrl
  : new URL(configuredApiUrl, window.location.origin).toString();
const REFRESH_MARGIN_SECONDS = 30;

let refreshPromise: Promise<string | null> | null = null;

const getTokenExpiration = (token: string) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decodedPayload = JSON.parse(atob(normalizedPayload)) as { exp?: number };

    return decodedPayload.exp ?? null;
  } catch {
    return null;
  }
};

const shouldRefreshToken = (token: string) => {
  const expiresAt = getTokenExpiration(token);

  if (!expiresAt) return false;

  return expiresAt - REFRESH_MARGIN_SECONDS <= Math.floor(Date.now() / 1000);
};

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { useAppStore } = await import("@/stores/app.store");
    const { refreshToken } = useAppStore.getState();

    if (!refreshToken) return null;

    try {
      const data = await ky.post(`${API_URL}/auth/refresh`, {
        json: { refresh_token: refreshToken },
        timeout: 10000,
      }).json<RefreshResponse>();

      if (data.access_token && data.refresh_token && data.user) {
        useAppStore.getState().setAuth({
          user: data.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        return data.access_token;
      }
    } catch {
      await useAppStore.getState().logout();
    }

    return null;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const api = ky.create({
  prefixUrl: API_URL,
  timeout: 10000,
  hooks: {
    beforeRequest: [
      async (request) => {
        // Import dynamique du store seulement quand on en a besoin
        const { useAppStore } = await import("@/stores/app.store");
        let token = useAppStore.getState().accessToken;

        if (token && shouldRefreshToken(token)) {
          token = await refreshAccessToken();
        }
        
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      }
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status !== 401 || request.url.endsWith('/auth/refresh')) {
          return response;
        }

        const token = await refreshAccessToken();

        if (!token) return response;

        const retryRequest = new Request(request, {
          headers: request.headers,
        });
        retryRequest.headers.set("Authorization", `Bearer ${token}`);

        return ky(retryRequest);
      },
    ]
  }
})
