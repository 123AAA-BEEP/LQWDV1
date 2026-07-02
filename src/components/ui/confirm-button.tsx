"use client";

import { useRef, type ComponentProps, type MouseEvent } from "react";
import { Button } from "./button";

/**
 * A button that interposes a confirmation dialog before its action fires —
 * for destructive or outward-facing actions (archive, suspend, send batch).
 *
 * Inside a `<form action={…}>`, render it as `type="submit"`: on confirm it
 * re-submits the form with this button as the submitter, so `name`/`value`
 * pairs and the pending spinner behave exactly like a plain submit Button.
 * Standalone (client-side handlers), pass `onConfirm` instead.
 */
export function ConfirmButton({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function open(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    dialogRef.current?.showModal();
  }

  function confirm() {
    dialogRef.current?.close();
    if (onConfirm) onConfirm();
    else {
      const btn = buttonRef.current;
      btn?.form?.requestSubmit(btn);
    }
  }

  const destructive = props.variant === "danger";

  return (
    <>
      <Button ref={buttonRef} {...props} onClick={open}>
        {children}
      </Button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-ink/40"
      >
        <div className="p-5">
          <h2 className="font-semibold text-ink">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {message}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={destructive ? "danger" : "primary"}
              size="sm"
              onClick={confirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
