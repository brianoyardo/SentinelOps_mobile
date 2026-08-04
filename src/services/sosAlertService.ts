import { getN8nWebhookUrl } from '@/config/n8n';

interface SosPayload {
  type: 'panic';
  timestamp: number;
  guardId?: string;
  guardName?: string;
  guardCode?: string;
  location?: { lat: number; lng: number };
  batteryLevel?: number;
}

export async function sendPanicAlert(payload: SosPayload): Promise<void> {
  const url = getN8nWebhookUrl('alerta');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook error: ${response.status}`);
  }
}
