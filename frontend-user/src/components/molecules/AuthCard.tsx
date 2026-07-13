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
        <div className="rounded-3xl bg-gradient-to-br from-brand-red-400 via-brand-red-600 to-brand-red-900 p-[2px] shadow-xl shadow-brand-red-600/20">
          <div className="rounded-[calc(1.5rem-2px)] bg-white px-6 py-8">
            <div className="mb-6 flex flex-col items-center gap-3">
              <Image
                src="/megaxuslogo.png"
                alt="Megaxus"
                width={200}
                height={53}
                className="h-auto w-40"
                priority
              />
              <h1 className="text-xl font-semibold text-brand-gray-950">{title}</h1>
              {subtitle && <p className="text-center text-sm text-black/60">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
