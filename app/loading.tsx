import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b border-border">
        <div className="container mx-auto flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 sm:p-6">
        <Skeleton className="h-9 w-64 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-[240px] w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
