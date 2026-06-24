/**
 * LIQWD Privacy Policy.
 *
 * TEMPLATE / STARTING POINT — this is not legal advice. Before relying on it:
 *   1. Replace every [bracketed] placeholder with your real details.
 *   2. Have Ontario legal counsel review it.
 * Drafted for a Canadian (PIPEDA) context, reflecting the data the platform
 * actually handles (realtor accounts, RECO verification, and consumer leads).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How LIQWD collects, uses, discloses, and protects personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="June 24, 2026"
      intro={
        <p>
          This Privacy Policy explains how [LIQWD legal entity name] (“LIQWD,”
          “we,” “us,” or “our”) collects, uses, discloses, and safeguards
          personal information when you visit{" "}
          <Link href="/">liqwd.ca</Link> and use the LIQWD broker portal (the
          “Service”). We handle personal information in accordance with Canada’s
          Personal Information Protection and Electronic Documents Act (PIPEDA)
          and other applicable privacy laws.
        </p>
      }
    >
      <LegalSection heading="1. Information we collect">
        <p>We collect the following categories of personal information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account and professional details</strong> you provide when
            you register: your first and last name, email address, phone number,
            brokerage name, professional title, and RECO registration number.
          </li>
          <li>
            <strong>Login credentials.</strong> Your password is stored in
            hashed form by our authentication provider; we never have access to
            it in plain text.
          </li>
          <li>
            <strong>Profile media</strong> you choose to upload, such as a
            profile photo and a brokerage logo.
          </li>
          <li>
            <strong>Verification information</strong> you submit so we can
            confirm you are a licensed Ontario real estate professional,
            including your RECO registration number and any notes you provide.
          </li>
          <li>
            <strong>Submissions</strong> you send us, such as new-project details
            or update requests.
          </li>
          <li>
            <strong>Inquiry (lead) information.</strong> When someone submits an
            inquiry through a public project page, we collect the name, email,
            phone number, and message they provide. This information is shared
            with the realtor or brokerage associated with that project so they
            can respond.
          </li>
          <li>
            <strong>Technical and usage data</strong> collected automatically,
            such as IP address, device and browser type, pages viewed, and
            cookie identifiers (see “Cookies and similar technologies” below).
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use personal information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>create, operate, secure, and support your account and the Service;</li>
          <li>
            verify that you are a licensed Ontario real estate professional using
            your RECO registration details;
          </li>
          <li>
            route consumer inquiries (leads) to the appropriate realtor or
            brokerage;
          </li>
          <li>
            send transactional and service communications (for example, email
            confirmation, verification status, and password resets);
          </li>
          <li>maintain the integrity and security of the platform and prevent misuse;</li>
          <li>analyze and improve the Service; and</li>
          <li>comply with our legal and regulatory obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Consent">
        <p>
          We collect, use, and disclose personal information with your consent,
          except where the law permits or requires otherwise. By creating an
          account or submitting information, you consent to the practices
          described in this Policy. You may withdraw your consent at any time
          (see “Your privacy rights”), though doing so may limit or end your
          ability to use the Service.
        </p>
      </LegalSection>

      <LegalSection heading="4. How we disclose personal information">
        <p>We do not sell personal information. We disclose it only as follows:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>To realtors and brokerages.</strong> Lead and inquiry
            information is provided to the realtor or brokerage associated with
            the relevant project.
          </li>
          <li>
            <strong>To service providers.</strong> We use trusted third parties
            to host and operate the Service (including our cloud database and
            authentication provider) and to deliver email. These providers may
            process personal information only on our instructions and for the
            purposes described here.
          </li>
          <li>
            <strong>For legal and safety reasons.</strong> Where we believe in
            good faith it is required to comply with the law, enforce our terms,
            or protect the rights, safety, or property of LIQWD, our users, or
            others.
          </li>
          <li>
            <strong>In a business transfer.</strong> In connection with a merger,
            acquisition, financing, or sale of assets, subject to appropriate
            safeguards.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Cookies and similar technologies">
        <p>
          We use cookies that are necessary to operate the Service, including to
          keep you signed in and to maintain session security. [If applicable,
          describe any analytics or performance cookies here — otherwise state:
          “We do not use third-party advertising or analytics cookies.”] Most
          browsers let you control cookies through their settings; blocking
          essential cookies may prevent you from signing in.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data storage and location">
        <p>
          Personal information is stored and processed by our cloud
          infrastructure provider (Supabase, running on Amazon Web Services) in
          the United States (US West region, “us-west-2”). Because this is
          outside Canada, your information may be subject to the laws of the
          United States, including lawful access by U.S. courts, governments,
          and law-enforcement authorities. We take reasonable steps to ensure
          comparable protection through our service-provider arrangements.
        </p>
      </LegalSection>

      <LegalSection heading="7. Retention">
        <p>
          We retain personal information only as long as necessary for the
          purposes described in this Policy or as required by law. Account and
          profile information is kept while your account is active and for a
          reasonable period afterward. Lead information is retained so the
          relevant realtor can follow up and to maintain our records. When
          information is no longer needed, we take reasonable steps to delete or
          de-identify it.
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          We use reasonable administrative, technical, and physical safeguards
          designed to protect personal information against loss, theft, and
          unauthorized access, use, or disclosure — including encryption in
          transit, access controls, and row-level security on our database. No
          method of transmission or storage is completely secure, however, and
          we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection heading="9. Your privacy rights">
        <p>
          Subject to applicable law, you may request to access, correct, or
          update your personal information, or withdraw your consent to our use
          of it. You can manage much of your information directly in your{" "}
          <Link href="/dashboard/profile">profile settings</Link>, or contact us
          using the details below. We may need to verify your identity before
          acting on a request. If you are not satisfied with our response, you
          may contact the Office of the Privacy Commissioner of Canada at{" "}
          <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">
            priv.gc.ca
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="10. Children">
        <p>
          The Service is intended for real estate professionals and is not
          directed to individuals under the age of 18. We do not knowingly
          collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection heading="11. Changes to this Policy">
        <p>
          We may update this Policy from time to time. When we do, we will revise
          the “Last updated” date above and, where appropriate, provide
          additional notice. Your continued use of the Service after changes take
          effect means you accept the updated Policy.
        </p>
      </LegalSection>

      <LegalSection heading="12. Contact us">
        <p>
          If you have questions about this Policy or how we handle personal
          information, contact our Privacy Officer:
        </p>
        <p>
          [LIQWD legal entity name]
          <br />
          Attn: Privacy Officer
          <br />
          [business mailing address]
          <br />
          <a href="mailto:[privacy@liqwd.ca]">[privacy@liqwd.ca]</a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
