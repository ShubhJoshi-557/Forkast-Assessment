// In apps/web/src/components/ErrorFallback.tsx
export function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 bg-red-900/50 text-red-300 rounded-lg" role="alert">
      <h2 className="font-bold">Something went wrong:</h2>
      <pre className="text-sm">{error.message}</pre>
    </div>
  );
}