const configuredApiUrl = import.meta.env.VITE_API_URL || "/api/v1";

const getAssetOrigin = () => {
  const apiUrl = new URL(configuredApiUrl, window.location.origin);
  return apiUrl.origin;
};

export const getProfilePictureUrl = (url?: string | null) => {
  if (!url) return null;

  try {
    const parsed = new URL(url, window.location.origin);

    const isMinioUrl = parsed.port === "9000" || parsed.hostname === "minio" || parsed.hostname === "minio-user";

    if (parsed.pathname.startsWith("/profiles/") && isMinioUrl) {
      return `${getAssetOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }

  return url;
};
