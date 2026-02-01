import { API_BASE_URL } from "./config";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "shop_token";
const SHOP_NAME_KEY = "shop_name";
const SHOP_ID_KEY = "shop_id";

export async function saveSession(token: string, shopId: string, shopName: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(SHOP_ID_KEY, shopId);
  await SecureStore.setItemAsync(SHOP_NAME_KEY, shopName);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(SHOP_ID_KEY);
  await SecureStore.deleteItemAsync(SHOP_NAME_KEY);
}

export async function authShop(shopCode: string, pin: string) {
  const res = await fetch(`${API_BASE_URL}/auth/shop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shop_code: shopCode, pin }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || "Login failed");
  }

  return res.json() as Promise<{ shop_id: string; shop_name: string; token: string }>;
}

// Example protected call
export async function me() {
  const token = await getToken();
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE_URL}/me`, {
    headers: {
      "X-Shop-Token": token,
    },
  });

  if (!res.ok) throw new Error("Not authorized");
  return res.json();
}

async function getShopTokenOrThrow() {
  const token = await SecureStore.getItemAsync("shop_token");
  if (!token) throw new Error("No session token. Please login again.");
  return token;
}

// Upload image to backend -> returns { key, url }
export async function uploadImage(uri: string, kind: string) {
  const token = await getShopTokenOrThrow();

  const form = new FormData();
  form.append("file", {
    uri,
    name: "upload.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${API_BASE_URL}/upload?kind=${encodeURIComponent(kind)}`, {
    method: "POST",
    headers: {
      "X-Shop-Token": token,
      // NOTE: DO NOT set Content-Type manually for multipart
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }

  return res.json(); // {key, url}
}

export async function generateDummy(fabric_key: string, hero_key: string) {
  const token = await getShopTokenOrThrow();

  const res = await fetch(`${API_BASE_URL}/generate-dummy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shop-Token": token,
    },
    body: JSON.stringify({ fabric_key, hero_key }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Generate failed (${res.status})`);
  }

  return res.json(); // {job_id, output_key, output_url, history_key}
}

export async function generateReal(fabric_key: string, hero_key: string, prompt?: string) {
  const token = await getShopTokenOrThrow();

  const res = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shop-Token": token,
    },
    body: JSON.stringify({
      fabric_key,
      hero_key,
      ...(prompt ? { prompt } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Generate failed (${res.status})`);
  }

  return res.json(); // {job_id, output_key, output_url, history_key, output_mime?}
}

export async function getHistory() {
  const token = await getShopTokenOrThrow();

  const res = await fetch(`${API_BASE_URL}/history?limit=20`, {
    headers: { "X-Shop-Token": token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `History failed (${res.status})`);
  }

  return res.json(); // {count, records}
}

export async function getHeroes() {
  const token = await getShopTokenOrThrow();

  const res = await fetch(`${API_BASE_URL}/heroes?limit=50`, {
    headers: { "X-Shop-Token": token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Heroes failed (${res.status})`);
  }

  return res.json(); // expect: { count, items: [{key,url,last_modified?}] }
}