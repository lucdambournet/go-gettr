// @ts-nocheck
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function ErrorAlert({ error }: { error: Error | null }) {
  return (
    <Alert variant="destructive" className="m-4">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{error?.message ?? "An unexpected error occurred."}</AlertDescription>
    </Alert>
  );
}
