export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
    </div>
  );
}
