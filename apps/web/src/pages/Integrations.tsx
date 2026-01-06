export function Integrations() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
          <p className="mt-2 text-slate-600">Manage your webhook integrations.</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          New Integration
        </button>
      </div>

      <div className="mt-8 bg-white rounded-lg border border-slate-200">
        <div className="p-6 text-center text-slate-500">
          <p>No integrations yet. Create your first integration to get started.</p>
        </div>
      </div>
    </div>
  );
}
