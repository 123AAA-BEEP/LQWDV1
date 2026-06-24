/**
 * LIQWD Terms of Service.
 *
 * TEMPLATE / STARTING POINT — this is not legal advice. Before relying on it:
 *   1. Replace every [bracketed] placeholder with your real details.
 *   2. Have Ontario legal counsel review it (especially the accuracy
 *      disclaimer, limitation of liability, and governing-law clauses).
 * Drafted for an Ontario, Canada context and the broker-portal model.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern access to and use of the LIQWD broker portal.",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated="June 24, 2026"
      intro={
        <p>
          These Terms of Service (the “Terms”) govern your access to and use of
          the LIQWD broker portal and{" "}
          <Link href="/">liqwd.ca</Link> (the “Service”), operated by [LIQWD
          legal entity name] (“LIQWD,” “we,” “us,” or “our”). By creating an
          account or using the Service, you agree to these Terms. If you do not
          agree, do not use the Service.
        </p>
      }
    >
      <LegalSection heading="1. Eligibility">
        <p>
          The Service is intended solely for licensed Ontario real estate
          professionals who are at least 18 years old. To obtain full access you
          must complete verification using accurate RECO registration details.
          We may grant, deny, suspend, or revoke access at our discretion.
        </p>
      </LegalSection>

      <LegalSection heading="2. What LIQWD is — and is not">
        <p>
          LIQWD is an information and workflow platform that helps verified
          Ontario realtors find and work through new-home project information in
          one place. LIQWD is <strong>not</strong> a real estate brokerage, is{" "}
          <strong>not</strong> a party to any real estate transaction, and does
          not represent any buyer, seller, builder, or brokerage. Nothing in the
          Service creates an agency, partnership, employment, or representation
          relationship. LIQWD is not affiliated with or endorsed by the Real
          Estate Council of Ontario (RECO) and does not provide MLS® data.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your account">
        <p>
          You are responsible for providing accurate registration information,
          for keeping your login credentials confidential, and for all activity
          that occurs under your account. Notify us promptly of any unauthorized
          use. You may not share your account or transfer it to anyone else.
        </p>
      </LegalSection>

      <LegalSection heading="4. Verification and access">
        <p>
          Access to broker-only features depends on successful RECO
          verification, which is reviewed manually. We may request additional
          information, and we may approve, decline, suspend, or revoke
          verification and access at any time to protect the integrity of this
          broker-to-broker network. Misrepresenting your licensing status or
          identity is grounds for immediate termination.
        </p>
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>You agree that you will not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            use the Service in violation of the Trust in Real Estate Services
            Act, 2002, RECO rules, or any other applicable law or professional
            obligation;
          </li>
          <li>
            scrape, crawl, harvest, or use automated means to extract data from
            the Service;
          </li>
          <li>
            resell, redistribute, sublicense, or publicly republish data or
            content obtained through the Service;
          </li>
          <li>
            misrepresent yourself, impersonate others, or upload unlawful,
            infringing, or misleading content;
          </li>
          <li>
            attempt to gain unauthorized access to the Service or interfere with
            its operation or security.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Project information and accuracy">
        <p>
          Project listings — including descriptions, pricing, incentives,
          availability, locations, and amenity details — are provided for
          general information only. Some information is sourced from third
          parties or generated through automated enrichment, and it may be
          incomplete, inaccurate, or out of date. It does not constitute an
          offer, solicitation, appraisal, or professional advice. You are
          responsible for independently verifying any information with the
          relevant builder or brokerage before relying on it or advising a
          client.
        </p>
      </LegalSection>

      <LegalSection heading="7. Content and submissions you provide">
        <p>
          You retain ownership of the content you submit (such as project
          submissions, profile details, and media). You grant LIQWD a
          non-exclusive, worldwide, royalty-free licence to host, store, display,
          and use that content as needed to operate and improve the Service. You
          represent that you have the rights to submit it and that it does not
          infringe any third-party rights. We may review, moderate, or remove
          content at our discretion.
        </p>
      </LegalSection>

      <LegalSection heading="8. Leads and personal information">
        <p>
          If you receive consumer inquiries (leads) through the Service, you must
          handle that personal information lawfully, in accordance with PIPEDA
          and your professional obligations, and use it only to respond to the
          inquiry. Our handling of personal information is described in our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="9. Intellectual property">
        <p>
          The Service, including its software, design, text, and the LIQWD name
          and logo, is owned by LIQWD or its licensors and is protected by
          intellectual-property laws. Subject to these Terms, we grant you a
          limited, non-exclusive, non-transferable, revocable licence to use the
          Service for your internal professional purposes.
        </p>
      </LegalSection>

      <LegalSection heading="10. Third-party links and portals">
        <p>
          The Service may link to third-party websites and builder or brokerage
          portals that we do not control. We are not responsible for their
          content, accuracy, or practices, and your use of them is at your own
          risk and subject to their terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Disclaimers">
        <p>
          The Service is provided “as is” and “as available,” without warranties
          of any kind, whether express or implied, including implied warranties
          of merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be
          uninterrupted, error-free, or that any information will be accurate or
          complete.
        </p>
      </LegalSection>

      <LegalSection heading="12. Limitation of liability">
        <p>
          To the maximum extent permitted by law, LIQWD and its directors,
          officers, employees, and suppliers will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or for any
          loss of profits, data, goodwill, or business, arising out of or related
          to your use of the Service. Because the Service is provided free of
          charge, our total aggregate liability for all claims will not exceed
          CAD $100.
        </p>
      </LegalSection>

      <LegalSection heading="13. Indemnification">
        <p>
          You agree to indemnify and hold harmless LIQWD and its representatives
          from any claims, losses, liabilities, and expenses (including
          reasonable legal fees) arising from your use of the Service, your
          content, or your breach of these Terms or of any law or professional
          obligation.
        </p>
      </LegalSection>

      <LegalSection heading="14. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate
          your access at any time, with or without notice, if we believe you have
          violated these Terms or to protect the Service or other users. Sections
          that by their nature should survive termination (including ownership,
          disclaimers, limitation of liability, and indemnification) will
          survive.
        </p>
      </LegalSection>

      <LegalSection heading="15. Changes to the Service and these Terms">
        <p>
          We may modify or discontinue the Service, and we may update these Terms,
          at any time. When we change the Terms we will revise the “Last updated”
          date above and, where appropriate, provide additional notice. Your
          continued use of the Service after changes take effect means you accept
          the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="16. Governing law">
        <p>
          These Terms are governed by the laws of the Province of Ontario and the
          federal laws of Canada applicable there, without regard to conflict-of-laws
          rules. You agree to the exclusive jurisdiction of the courts located in
          Ontario for any dispute arising out of or relating to these Terms or the
          Service.
        </p>
      </LegalSection>

      <LegalSection heading="17. Contact us">
        <p>
          Questions about these Terms can be sent to:
        </p>
        <p>
          [LIQWD legal entity name]
          <br />
          [business mailing address]
          <br />
          <a href="mailto:[legal@liqwd.ca]">[legal@liqwd.ca]</a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
