import { apiBaseUrl } from "../config/env";

export const apiUrl = (path) => {
  if (!path) {
    return path;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};
