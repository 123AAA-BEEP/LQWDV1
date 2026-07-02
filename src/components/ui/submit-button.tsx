"use client";

import { useFormStatus } from "react-dom";
import { Button, type Variant, type Size } from "./button";

/** Submit button that shows a pending state while a Server Action runs. */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
