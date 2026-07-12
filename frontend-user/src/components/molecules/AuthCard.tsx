import { ReactNode } from "react";
import Image from "next/image";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-3xl bg-gradient-to-br from-brand-cyan via-brand-purple to-brand-pink p-[2px] shadow-xl shadow-brand-purple/20">
          <div className="rounded-[calc(1.5rem-2px)] bg-white px-6 py-8">
            <div className="mb-6 flex flex-col items-center gap-3">
              <Image
                src="/ayodance-logo.jpg"
                alt="AyoDance Audition"
                width={200}
                height={106}
                className="h-auto w-40"
                priority
              />
              <h1 className="text-xl font-semibold text-brand-ink">{title}</h1>
              {subtitle && <p className="text-center text-sm text-black/60">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
