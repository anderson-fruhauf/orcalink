type ApiError = {
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
    };
  };
};

const BLOCKED_MESSAGE_PATTERN =
  /\b(firebase|tenant|uuid|token|database|prisma|sql|unauthorized|forbidden|DRAFT|OPEN|CLOSED|PENDING|EXPIRED|SUBMITTED)\b/i;

function extractMessage(error: ApiError): string | undefined {
  const raw = error.response?.data?.message;
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw.join(', ') : raw;
}

function isSafeClientMessage(message: string): boolean {
  if (message.length > 250) return false;
  if (BLOCKED_MESSAGE_PATTERN.test(message)) return false;
  if (/must be|cannot|invalid/i.test(message)) return false;
  return true;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiError;
  const status = err.response?.status;
  const message = extractMessage(err);

  if (status === 401) {
    return 'Sessão expirada ou credenciais inválidas.';
  }

  if (status === 403) {
    return 'Limite do plano Free atingido. Faça upgrade para o plano Pro.';
  }

  if (status === 404) {
    return fallback;
  }

  if (status === 409) {
    return message && isSafeClientMessage(message)
      ? message
      : 'Não foi possível concluir a operação. Verifique os dados informados.';
  }

  if (status === 400 && message && isSafeClientMessage(message)) {
    return message;
  }

  return fallback;
}
