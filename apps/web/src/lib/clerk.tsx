import { ClerkProvider } from '@clerk/clerk-react';
import type { ReactNode } from 'react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  // eslint-disable-next-line no-console
  console.warn('Missing VITE_CLERK_PUBLISHABLE_KEY; Clerk will not initialize.');
}

export function withClerk(children: ReactNode): ReactNode {
  if (!publishableKey) return children;
  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
