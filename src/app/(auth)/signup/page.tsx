import { redirect } from "next/navigation";

// Signup and login are the same "log in with LinkedIn" flow now — no
// separate account-creation step. Land on the register tab for continuity.
export default function SignupPage() {
  redirect("/login?mode=register");
}
