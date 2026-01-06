export function Webhooks() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Webhooks</h1>
      <p className="mt-2 text-slate-600">View and manage received webhooks.</p>

      <div className="mt-8 bg-white rounded-lg border border-slate-200">
        <div className="p-6 text-center text-slate-500">
          <p>No webhooks received yet. Configure an integration to start receiving webhooks.</p>
        </div>
      </div>
    </div>
  );
}
