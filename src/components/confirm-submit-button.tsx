"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
};

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
