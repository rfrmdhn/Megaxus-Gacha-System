"use client";

import { ReactNode, useEffect } from "react";
import { CloseOutlined } from "@ant-design/icons";

export function Dialog({
  onClose,
  title,
  children,
  footer,
  widthClassName = "max-w-lg",
}: {
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClassName} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black"
          >
            <CloseOutlined />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
