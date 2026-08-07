import { z } from 'zod';

/** Empty Cloud Run / GitHub secrets arrive as `""` — treat like missing. */
const requiredString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1),
);

const envSchema = z.object({
  DATABASE_URL: requiredString,
  RESEND_API_KEY: requiredString,
  RESEND_FROM_EMAIL: requiredString,
  APP_URL: requiredString,
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().optional().default('3333'),
  SERVICE_ROLE: z.enum(['api', 'worker']).optional().default('api'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
  exitOnError: (code: number) => never = (code) => process.exit(code) as never,
): Env {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.') || '(root)')),
    ].join(', ');

    console.error(
      `Invalid or missing required environment variables: ${fields}. ` +
        'Empty values count as missing. Check GitHub Environment secrets / Cloud Run env.',
    );
    exitOnError(1);
  }

  return result.data;
}
