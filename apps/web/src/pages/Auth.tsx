import { SignIn, SignUp } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <SignIn routing="path" path="/sign-in" redirectUrl="/" />
    </div>
  );
}

export function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <SignUp routing="path" path="/sign-up" redirectUrl="/" />
    </div>
  );
}
