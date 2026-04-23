export function ErrorAlert({ error }: { error: Error | null }) {
  return (
    <div role="alert" className="m-4 rounded-lg border border-destructive/50 px-4 py-3 text-sm text-destructive">
      <p className="mb-1 font-medium leading-none tracking-tight">Something went wrong</p>
      <p className="text-sm">{error?.message ?? "An unexpected error occurred."}</p>
    </div>
  );
}
