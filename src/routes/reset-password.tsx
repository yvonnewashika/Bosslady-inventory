import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return (
    <div>
      <h1>Reset Password</h1>
      <p>Password reset page is working.</p>
    </div>
  );
}