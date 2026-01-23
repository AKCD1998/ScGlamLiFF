const rawBase = import.meta.env.VITE_API_BASE_URL || "";
const normalizedBase = rawBase.replace(/\/+$/, "");

export const apiUrl = (path) => {
  if (!path) {
    return path;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
};
