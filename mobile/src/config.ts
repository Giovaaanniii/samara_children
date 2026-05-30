
function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
if (!fromEnv) {

  console.warn(
    "[config] EXPO_PUBLIC_API_BASE_URL не задан. Создайте mobile/.env по образцу .env.example",
  );
}

export const API_BASE_URL = normalizeBase(
  fromEnv || "http://127.0.0.1:8000/api/v1",
);

export const WEB_BASE_URL = (
  process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || ""
).replace(/\/$/, "");

