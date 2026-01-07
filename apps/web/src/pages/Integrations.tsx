import { useEffect, useMemo, useState } from 'react';
import { SourceType } from '@webhook-relay/shared';
import { Button } from '../components/ui/button';
import { useApi } from '../lib/api';

import { X } from 'lucide-react';

// NOTE: Simple custom modal to avoid extra deps
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <button
          type="button"
          aria-label="Close"
          className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

type Integration = {
  id: string;
  name: string;
  targetUrl: string;
  sourceType: SourceType;
  signingSecret: string | null;
  idempotencyKeyPath: string | null;
  orderingKeyPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  targetUrl: string;
  sourceType: SourceType;
};

const emptyForm: FormState = {
  name: '',
  targetUrl: '',
  sourceType: 'generic',
};

export function Integrations() {
  const api = useApi();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const response = await api.get<{ data: Integration[] }>('/v1/integrations');
        setIntegrations(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (integration: Integration) => {
    setEditing(integration);
    setForm({
      name: integration.name,
      targetUrl: integration.targetUrl,
      sourceType: integration.sourceType,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      setBusy(true);
      if (editing) {
        await api.patch(`/v1/integrations/${editing.id}`, form);
        setToast('Integration updated');
      } else {
        await api.post('/v1/integrations', form);
        setToast('Integration created');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integration');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await api.delete(`/v1/integrations/${id}`);
      setToast('Integration deleted');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    } finally {
      setDeletingId(null);
    }
  };

  const webhookBase = import.meta.env.VITE_API_BASE_URL ?? '/api';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
          <p className="mt-2 text-slate-600">Manage your webhook integrations.</p>
        </div>
        <Button onClick={openCreate}>New Integration</Button>
      </div>

      <div className="mt-8 bg-white rounded-lg border border-slate-200">
        <div className="p-6 space-y-4">
          {toast && <p className="text-sm text-green-700">{toast}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <p className="text-slate-500">Loading integrations...</p>}
          {!loading && integrations?.length === 0 && (
            <p className="text-slate-500">
              No integrations yet. Create your first integration to get started.
            </p>
          )}
          {!loading && integrations && integrations.length > 0 && (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{integration.name}</p>
                    <p className="text-xs text-slate-500">{integration.targetUrl}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <button
                      type="button"
                      className="text-brand-600 hover:underline"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${webhookBase}/v1/webhooks/in/${integration.id}`
                        )
                      }
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => openEdit(integration)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      disabled={deletingId === integration.id}
                      onClick={() => void confirmDelete(integration.id)}
                    >
                      {deletingId === integration.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2 className="text-lg font-semibold text-slate-900">
          {editing ? 'Edit integration' : 'Create integration'}
        </h2>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Target URL
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Source type
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.sourceType}
              onChange={(e) => setForm({ ...form, sourceType: e.target.value as SourceType })}
            >
              {['generic', 'stripe', 'github', 'shopify'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
