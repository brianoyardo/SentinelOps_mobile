/**
 * SentinelOps Mobile — Configuración Centralizada de n8n
 *
 * Para cambiar de ambiente, edita el archivo .env:
 *
 *   🟡 DESARROLLO LOCAL   → EXPO_PUBLIC_N8N_BASE_URL=http://localhost:5678    + EXPO_PUBLIC_N8N_ENV=test
 *   🔵 RED LOCAL          → EXPO_PUBLIC_N8N_BASE_URL=http://192.168.1.6:5678  + EXPO_PUBLIC_N8N_ENV=prod
 *   🟢 PRODUCCIÓN VPS     → EXPO_PUBLIC_N8N_BASE_URL=https://tu-dominio.com   + EXPO_PUBLIC_N8N_ENV=prod
 *
 * EXPO_PUBLIC_N8N_ENV controla el prefijo de la ruta:
 *   'test'  → /webhook-test/  (activa los nodos de prueba en n8n)
 *   'prod'  → /webhook/       (activa los nodos de producción en n8n)
 */

export const n8nConfig = {
  baseUrl: process.env.EXPO_PUBLIC_N8N_BASE_URL || 'http://192.168.1.6:5678',
  env: process.env.EXPO_PUBLIC_N8N_ENV || 'prod',
  webhooks: {
    alerta: process.env.EXPO_PUBLIC_N8N_WEBHOOK_ALERTA || 'alerta-operativa',
    cierreRonda: process.env.EXPO_PUBLIC_N8N_WEBHOOK_CIERRE_RONDA || 'cierre-ronda-ia',
  },
} as const;

/**
 * Construye la URL completa del webhook según el ambiente configurado.
 * Usa /webhook-test/ en modo 'test', /webhook/ en modo 'prod'.
 */
export function getN8nWebhookUrl(name: keyof typeof n8nConfig.webhooks): string {
  const prefix = n8nConfig.env === 'test' ? 'webhook-test' : 'webhook';
  return `${n8nConfig.baseUrl}/${prefix}/${n8nConfig.webhooks[name]}`;
}
