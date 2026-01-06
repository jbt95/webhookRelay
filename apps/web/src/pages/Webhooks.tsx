import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

type Webhook = {
  id: string;
  status: 'pending' | 'delivered' | 'failed';
  createdAt: string;
};

type Attempt = {
  id: string;
  webhookId: string;
  statusCode: number | null;
  durationMs: number | null;
  createdAt: string;
};

export function Webhooks() {
  const api = useApi();
  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Webhook[]>('/v1/webhooks');
        setWebhooks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load webhooks');
      }
    };

    void load();
  }, [api]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Webhooks</h1>
      <p className="mt-2 text-slate-600">View and manage received webhooks.</p>

      <div className="mt-8 bg-white rounded-lg border border-slate-200">
        <div className="p-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && webhooks === null && <p className="text-slate-500">Loading webhooks...</p>}
          {!error && webhooks?.length === 0 && (
            <p className="text-slate-500">
              No webhooks received yet. Configure an integration to start receiving webhooks.
            </p>
          )}
          {!error && webhooks && webhooks.length > 0 && (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Webhook {webhook.id}</p>
                      <p className="text-xs text-slate-500">Status: {webhook.status}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Created {new Date(webhook.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
