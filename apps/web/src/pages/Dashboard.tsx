export function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">Overview of your webhook activity.</p>

      {/* Placeholder stats */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Webhooks', value: '0' },
          { label: 'Delivered', value: '0' },
          { label: 'Failed', value: '0' },
          { label: 'Success Rate', value: '0%' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-500">Dashboard content coming soon...</p>
      </div>
    </div>
  );
}
