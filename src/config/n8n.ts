export const n8nConfig = {
  baseUrl: 'http://192.168.1.6:5678',
  env: 'prod',
  webhooks: {
    alerta: 'alerta-operativa',
    cierreRonda: 'cierre-ronda-ia',
  },
} as const;

export function getN8nWebhookUrl(name: keyof typeof n8nConfig.webhooks): string {
  return `${n8nConfig.baseUrl}/webhook/${n8nConfig.webhooks[name]}`;
}
