import { redirect } from "next/navigation";

// Signup and login are the same "log in with LinkedIn" flow now — no
// separate account-creation step.
export default function SignupPage() {
  redirect("/login");
}
