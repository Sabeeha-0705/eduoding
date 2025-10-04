import axios from "axios";

const judge0 = axios.create({
  baseURL: process.env.JUDGE0_BASE,
  headers: {
    "x-rapidapi-host": process.env.JUDGE0_HOST,
    "x-rapidapi-key": process.env.JUDGE0_KEY,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export default judge0;
