const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/student_attendance_tracker'),
  SESSION_SECRET: z.string().min(32).default('development-only-session-secret-change-me'),
  FRONTEND_ORIGIN: z.url().default('http://localhost:5173'),
  SESSION_MAX_AGE_MS: z.coerce.number().int().positive().default(604800000),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5242880),
});

function loadEnv(source = process.env) {
  return envSchema.parse(source);
}

module.exports = { loadEnv };
