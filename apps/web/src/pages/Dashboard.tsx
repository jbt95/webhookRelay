import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

type Webhook = {
  status: 'pending' | 'delivered' | 'failed';
};

const formatNumber = (value: number): string => value.toLocaleString();

const calculateRate = (delivered: number, failed: number): string => {
  const total = delivered + failed;
  if (total === 0) return '0%';
  const rate = Math.round((delivered / total) * 1000) / 10;
  return `${rate}%`;
};

export function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState<{ total: number; delivered: number; failed: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Webhook[]>('/v1/webhooks');
        const delivered = data.filter((w) => w.status === 'delivered').length;
        const failed = data.filter((w) => w.status === 'failed').length;
        setStats({ total: data.length, delivered, failed });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      }
    };

    void load();
  }, [api]);

  const cards = stats
    ? [
        { label: 'Total Webhooks', value: formatNumber(stats.total) },
        { label: 'Delivered', value: formatNumber(stats.delivered) },
        { label: 'Failed', value: formatNumber(stats.failed) },
        { label: 'Success Rate', value: calculateRate(stats.delivered, stats.failed) },
      ]
    : [
        { label: 'Total Webhooks', value: '—' },
        { label: 'Delivered', value: '—' },
        { label: 'Failed', value: '—' },
        { label: 'Success Rate', value: '—' },
      ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">Overview of your webhook activity.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && !stats && <p className="text-slate-500">Loading dashboard...</p>}
        {!error && stats && <p className="text-slate-500">Webhook insights coming soon.</p>}
      </div>
    </div>
  );
}
