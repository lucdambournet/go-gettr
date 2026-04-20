export function useAppManifest(): { name: string; icon: string | null } {
  const name = (import.meta.env.VITE_APP_NAME as string | undefined) || "GoGettr";
  const icon = (import.meta.env.VITE_APP_ICON as string | undefined) || null;
  return { name, icon };
}
