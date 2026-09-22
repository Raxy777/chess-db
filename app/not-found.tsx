import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground max-w-md">
        That opening, family, or position isn&apos;t in the database. It may have been merged into
        another line via transposition, or never recorded.
      </p>
      <div className="flex gap-2">
        <Link href="/"><Button>Browse openings</Button></Link>
        <Link href="/explore"><Button variant="outline">Open explorer</Button></Link>
      </div>
    </div>
  );
}
