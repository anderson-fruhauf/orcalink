import { validateEnv } from './env';

describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://localhost/orcalink',
    RESEND_API_KEY: 're_test',
    RESEND_FROM_EMAIL: 'noreply@orcalink.com',
    APP_URL: 'https://app.orcalink.com',
    NODE_ENV: 'production',
  };

  it('accepts a complete production env', () => {
    expect(validateEnv(validEnv)).toMatchObject({
      DATABASE_URL: validEnv.DATABASE_URL,
      RESEND_FROM_EMAIL: validEnv.RESEND_FROM_EMAIL,
      SERVICE_ROLE: 'api',
      PORT: '3333',
    });
  });

  it('fails when RESEND_FROM_EMAIL is empty (Cloud Run secret unset)', () => {
    const exit = jest.fn(() => {
      throw new Error('exit');
    }) as unknown as (code: number) => never;

    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() =>
      validateEnv({ ...validEnv, RESEND_FROM_EMAIL: '' }, exit),
    ).toThrow('exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain('RESEND_FROM_EMAIL');

    errorSpy.mockRestore();
  });

  it('fails when required vars are missing', () => {
    const exit = jest.fn(() => {
      throw new Error('exit');
    }) as unknown as (code: number) => never;

    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => validateEnv({ NODE_ENV: 'production' }, exit)).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain('DATABASE_URL');

    errorSpy.mockRestore();
  });
});
