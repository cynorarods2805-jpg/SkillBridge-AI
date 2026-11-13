import { betterAuth } from "better-auth";
import { db } from "./db.js";

const origins = [
  "http://localhost:5173",
  "http://localhost:3001",
  ...(process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim()) : []),
];

if (!process.env.BETTER_AUTH_SECRET) {
  console.warn("⚠  BETTER_AUTH_SECRET is not set – using an insecure development secret. Set it in server/.env.");
}

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET || "dev-only-insecure-secret-change-me-0123456789",
  trustedOrigins: origins,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: {
    additionalFields: {
      // input:false => a client can never choose its own role when signing up.
      role: { type: "string", required: false, defaultValue: "student", input: false },
    },
  },
});
