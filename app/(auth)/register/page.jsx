import { Suspense } from "react";

import { RegisterForm } from "./RegisterForm";

export const metadata = {
  title: "Create an account",
  description: "Create a JobAI account to score your CV against ATS checks and apply to roles.",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
