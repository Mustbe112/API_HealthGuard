import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  /** All allowed browser origins (Next 3000 + Vite 5173). FRONTEND_URL must not drop either. */
  frontendOrigins: [
    ...new Set(
      [
        ...(process.env.FRONTEND_URL ?? "http://localhost:3000").split(","),
        "http://localhost:3000",
        "http://localhost:5173",
      ]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ],
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  encryptionKey: required("ENCRYPTION_KEY"),
};
