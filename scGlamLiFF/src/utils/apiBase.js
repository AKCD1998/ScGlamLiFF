import { apiBaseUrl } from "../config/env";

export const buildApiUrl = (baseUrl, path) => {
  if (!path) {
    return path;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

export const apiUrl = (path) => buildApiUrl(apiBaseUrl, path);
