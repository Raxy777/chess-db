"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md">
        An error occurred while loading this page. This is usually transient — try again.
      </p>
      {error.digest ? <p className="text-xs font-mono text-muted-foreground">Ref: {error.digest}</p> : null}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
