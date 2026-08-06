import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
  APP_URL: z.string().min(1),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().optional().default('3333'),
  SERVICE_ROLE: z.enum(['api', 'worker']).optional().default('api'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .filter((i) => i.code === 'invalid_type')
      .map((i) => i.path.join('.'))
      .join(', ');

    console.error(`Missing required environment variables: ${missing}`);
    process.exit(1);
  }

  return result.data;
}
