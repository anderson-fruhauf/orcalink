import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MAX_PRICE_IN_CENTS } from './proposal-item.dto.js';
import { MAX_DELIVERY_DAYS, SubmitProposalDto } from './submit-proposal.dto.js';

function buildValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    deliveryDays: 5,
    paymentCondition: 'Pix à vista',
    items: [
      {
        quotationItemId: '11111111-1111-4111-8111-111111111111',
        priceInCents: 15000,
        unavailable: false,
      },
    ],
    ...overrides,
  };
}

describe('SubmitProposalDto', () => {
  async function validateDto(payload: Record<string, unknown>) {
    const dto = plainToInstance(SubmitProposalDto, payload);
    return validate(dto);
  }

  it('deve aceitar valores no limite máximo', async () => {
    const errors = await validateDto(
      buildValidPayload({
        deliveryDays: MAX_DELIVERY_DAYS,
        items: [
          {
            quotationItemId: '11111111-1111-4111-8111-111111111111',
            priceInCents: MAX_PRICE_IN_CENTS,
            unavailable: false,
          },
        ],
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it('deve rejeitar deliveryDays acima do teto', async () => {
    const errors = await validateDto(
      buildValidPayload({ deliveryDays: MAX_DELIVERY_DAYS + 1 }),
    );

    expect(errors.length).toBeGreaterThan(0);
    const deliveryError = errors.find((e) => e.property === 'deliveryDays');
    expect(deliveryError).toBeDefined();
    expect(Object.values(deliveryError!.constraints ?? {}).join(' ')).toContain(
      String(MAX_DELIVERY_DAYS),
    );
  });

  it('deve rejeitar priceInCents acima do teto do Int', async () => {
    const errors = await validateDto(
      buildValidPayload({
        items: [
          {
            quotationItemId: '11111111-1111-4111-8111-111111111111',
            priceInCents: MAX_PRICE_IN_CENTS + 1,
            unavailable: false,
          },
        ],
      }),
    );

    expect(errors.length).toBeGreaterThan(0);
    const itemsError = errors.find((e) => e.property === 'items');
    expect(itemsError?.children?.[0]?.children?.length).toBeGreaterThan(0);
    const priceError = itemsError?.children?.[0]?.children?.find(
      (e) => e.property === 'priceInCents',
    );
    expect(priceError).toBeDefined();
  });

  it('deve rejeitar valores absurdos em notação científica (overflow)', async () => {
    const errors = await validateDto(
      buildValidPayload({
        deliveryDays: 1.1111111111111111e121,
        items: [
          {
            quotationItemId: '11111111-1111-4111-8111-111111111111',
            priceInCents: 1.1111111111111111e119,
            unavailable: false,
          },
        ],
      }),
    );

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'deliveryDays')).toBe(true);
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });
});
