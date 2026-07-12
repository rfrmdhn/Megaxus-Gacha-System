"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Skeleton } from "@/components/Skeleton";

function RedirectSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getCurrentUser() ? "/gacha" : "/login");
  }, [router]);

  return <RedirectSkeleton />;
}
