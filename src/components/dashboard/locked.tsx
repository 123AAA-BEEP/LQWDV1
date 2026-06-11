import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

/** Shown when a verified-only area is accessed by a non-approved user. */
export function VerificationRequired() {
  return (
    <Card>
      <CardBody className="text-center">
        <h2 className="text-lg font-semibold text-ink">
          Verification required
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          This area is reserved for verified Ontario realtors. Submit your RECO
          registration details to unlock project browsing and broker-only tools.
        </p>
        <div className="mt-4">
          <ButtonLink href="/dashboard/verify" size="sm">
            Start verification
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}
