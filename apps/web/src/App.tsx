import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Integrations } from './pages/Integrations';
import { Webhooks } from './pages/Webhooks';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
