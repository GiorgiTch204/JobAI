import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to JobAI to score your CV and track your applications.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
