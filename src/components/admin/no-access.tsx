import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

/** Friendly no-access state for users hitting a restricted route. */
export function NoAccess({
  title = "Admin access required",
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="text-center">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          {children ??
            "This area is limited to LIQWD administrators. If you believe you should have access, contact your administrator."}
        </p>
        <div className="mt-4">
          <ButtonLink href="/dashboard" size="sm" variant="secondary">
            Back to dashboard
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}
