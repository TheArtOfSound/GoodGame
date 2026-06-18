import axios from "axios";
import { BACKEND_URL } from "./config";

export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export async function getJSON(path) {
  const r = await api.get(path);
  return r.data;
}

export async function postJSON(path, data) {
  const r = await api.post(path, data);
  return r.data;
}

export async function postForm(path, formData) {
  const r = await api.post(path, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
}
