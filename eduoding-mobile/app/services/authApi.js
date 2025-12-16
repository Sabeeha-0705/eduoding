// eduoding-mobile/app/services/authApi.js
import axios from "axios";

const API = axios.create({
  baseURL: "https://eduoding-backend.onrender.com",
});

export const loginUser = async (email, password) => {
  const res = await API.post("/auth/login", {
    email: email.toLowerCase().trim(),
    password,
  });
  return res.data;
};
