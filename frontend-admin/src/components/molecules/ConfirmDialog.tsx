"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { Dialog } from "./Dialog";
import { Button } from "@/components/atoms/Button";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(
  null,
);

/**
 * Promise-based replacement for `window.confirm`: renders a single in-app
 * ConfirmDialog and hands out a `confirm()` that resolves to the user's choice.
 * Mounted once near the app root so any component/hook can await a confirmation.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function settle(ok: boolean) {
    if (pending) pending.resolve(ok);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <Dialog
          title={pending.title ?? "Please confirm"}
          onClose={() => settle(false)}
          widthClassName="max-w-sm"
          footer={
            <>
              <Button variant="outline" onClick={() => settle(false)}>
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={
                  pending.danger
                    ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    : "rounded-lg bg-gradient-to-r from-brand-red-600 via-brand-red-700 to-brand-red-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-red-700/30 transition-opacity hover:opacity-90"
                }
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </>
          }
        >
          <div className="text-sm text-black/70">{pending.message}</div>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
