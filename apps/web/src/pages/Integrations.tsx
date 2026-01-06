import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';
import { Button } from '../components/ui/button';

type Integration = {
  id: string;
  name: string;
  endpoint: string;
  createdAt: string;
};

export function Integrations() {
  const api = useApi();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Integration[]>('/v1/integrations');
        setIntegrations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
      }
    };

    void load();
  }, [api]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
          <p className="mt-2 text-slate-600">Manage your webhook integrations.</p>
        </div>
        <Button>New Integration</Button>
      </div>

      <div className="mt-8 bg-white rounded-lg border border-slate-200">
        <div className="p-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && integrations === null && (
            <p className="text-slate-500">Loading integrations...</p>
          )}
          {!error && integrations?.length === 0 && (
            <p className="text-slate-500">
              No integrations yet. Create your first integration to get started.
            </p>
          )}
          {!error && integrations && integrations.length > 0 && (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{integration.name}</p>
                    <p className="text-xs text-slate-500">{integration.endpoint}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Created {new Date(integration.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
