export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-xl font-semibold tracking-tight text-neutral-900">ReachOS</span>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
