export const n8nConfig = {
  baseUrl: process.env.EXPO_PUBLIC_N8N_BASE_URL || 'http://192.168.1.6:5678',
  env: process.env.EXPO_PUBLIC_N8N_ENV || 'prod',
  webhooks: {
    alerta: process.env.EXPO_PUBLIC_N8N_WEBHOOK_ALERTA || 'alerta-operativa',
    cierreRonda: process.env.EXPO_PUBLIC_N8N_WEBHOOK_CIERRE_RONDA || 'cierre-ronda-ia',
  },
} as const;

export function getN8nWebhookUrl(name: keyof typeof n8nConfig.webhooks): string {
  return `${n8nConfig.baseUrl}/webhook/${n8nConfig.webhooks[name]}`;
}
