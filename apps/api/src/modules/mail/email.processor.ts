import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';
import { Resend } from 'resend';

@Processor('emails')
export class EmailProcessor extends WorkerHost {
  private readonly resend: Resend;

  constructor(private readonly prisma: PrismaService) {
    super();
    // Initialize Resend SDK using the env variable, with a fallback for development/tests
    const apiKey = process.env['RESEND_API_KEY'] || 're_mock_key';
    this.resend = new Resend(apiKey);
  }

  async process(job: Job<{ quotationSupplierId: string }>): Promise<any> {
    const { quotationSupplierId } = job.data;

    // Retrieve the QuotationSupplier association
    const qs = await this.prisma.quotationSupplier.findUnique({
      where: { id: quotationSupplierId },
      include: {
        supplier: true,
        quotation: {
          include: {
            tenant: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!qs) {
      throw new Error(
        `QuotationSupplier association not found for ID: ${quotationSupplierId}`,
      );
    }

    const tenantId = qs.quotation.tenantId;

    // Execute queries and updates within the tenant's context
    return TenantContext.run(tenantId, async () => {
      // Find the active MagicLink for this supplier and quotation
      const magicLink = await this.prisma.magicLink.findFirst({
        where: {
          quotationId: qs.quotationId,
          supplierId: qs.supplierId,
          active: true,
        },
      });

      if (!magicLink) {
        throw new Error(
          `Active MagicLink not found for supplier ${qs.supplierId} on quotation ${qs.quotationId}`,
        );
      }

      // Format items list: max 5, then "+X itens"
      const items = qs.quotation.items;
      const displayItems = items.slice(0, 5);
      const remainingCount = items.length - 5;

      const itemsHtml = displayItems
        .map(
          (item: any) =>
            `<li style="margin-bottom: 8px; font-size: 14px; color: #475569; line-height: 20px;">
              <strong>${item.product.name}</strong> - ${item.quantity} ${item.product.unit}
              ${
                item.observation
                  ? `<br><span style="font-size: 12px; color: #64748B; font-style: italic;">Obs: ${item.observation}</span>`
                  : ''
              }
            </li>`,
        )
        .join('');

      const remainingText =
        remainingCount > 0
          ? `<p style="font-size: 14px; color: #64748B; font-weight: 500; margin-top: 12px; margin-bottom: 0;">
              + ${remainingCount} ${remainingCount === 1 ? 'item' : 'itens'}
             </p>`
          : '';

      const appUrl = process.env['APP_URL'] || 'http://localhost:5173';
      const magicLinkUrl = `${appUrl}/v/${magicLink.token}`;

      // Format the deadline to a readable format in pt-BR
      const deadlineStr = new Date(qs.quotation.deadline).toLocaleDateString(
        'pt-BR',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );

      // Construct visually rich HTML email matching section 10 of styles.md
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Solicitação de Cotação — Orçalink</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);">
          <!-- Header (linear gradient --primary-600 to --primary-500) -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); padding: 32px 24px; text-align: center;">
              <span style="color: #FFFFFF; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">Orçalink</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 28px;">
                Olá, ${qs.supplier.contactName || qs.supplier.name}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #334155;">
                A empresa <strong>${qs.quotation.tenant.name}</strong> solicita uma cotação de preços para os itens listados abaixo.
              </p>
              
              <!-- Quotation Details Card -->
              <div style="background-color: #F1F5F9; border-radius: 8px; padding: 18px; margin-bottom: 28px; border: 1px solid #E2E8F0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569; line-height: 20px;">
                  <strong>Cotação:</strong> ${qs.quotation.title}
                </p>
                <p style="margin: 0; font-size: 14px; color: #475569; line-height: 20px;">
                  <strong>Prazo Limite:</strong> ${deadlineStr}
                </p>
              </div>

              <!-- Items List -->
              <h2 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
                Itens Solicitados
              </h2>
              <ul style="margin: 0 0 32px 0; padding-left: 20px; list-style-type: disc;">
                ${itemsHtml}
              </ul>
              ${remainingText}

              <!-- Button CTA -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-top: 10px; padding-bottom: 10px;">
                    <a href="${magicLinkUrl}" target="_blank" style="display: inline-block; background-color: #6366F1; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35); text-align: center;">
                      Enviar Proposta
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94A3B8; line-height: 18px;">
                Esta é uma mensagem automática enviada pela plataforma Orçalink em nome de ${qs.quotation.tenant.name}.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="${appUrl}/politica-de-privacidade" target="_blank" style="color: #6366F1; text-decoration: none; font-weight: 500;">
                  Política de Privacidade
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      const senderEmail =
        process.env['RESEND_FROM_EMAIL'] || 'onboarding@resend.dev';

      // Dispatch via Resend
      const { data, error } = await this.resend.emails.send({
        from: `Orçalink <${senderEmail}>`,
        to: [qs.supplier.email],
        subject: `Solicitação de Cotação: ${qs.quotation.title} - ${qs.quotation.tenant.name}`,
        html: htmlContent,
      });

      if (error) {
        throw new Error(
          `Resend failed to send email: ${JSON.stringify(error)}`,
        );
      }

      // Update sentAt in QuotationSupplier
      await this.prisma.quotationSupplier.update({
        where: { id: qs.id },
        data: { sentAt: new Date() },
      });

      return data;
    });
  }
}
