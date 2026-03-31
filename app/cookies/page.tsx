import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy | Genetrify",
  description:
    "Cookie Policy for genetrify.com by Genetrify Information Technology Services.",
};

const sections = [
  {
    title: "1. What cookies are",
    body: [
      "This Cookie Policy explains how Genetrify Information Technology Services uses cookies and similar technologies on genetrify.com. Cookies are small text files stored on your browser or device that help websites remember information about your visit.",
      "Similar technologies may include local storage, pixels, SDKs, tags, and session identifiers that support comparable functions.",
    ],
  },
  {
    title: "2. How Genetrify uses cookies",
    body: [
      "We use strictly necessary cookies and related storage technologies to keep users signed in, maintain session state, protect accounts, remember security preferences, and support core platform functionality.",
      "We may also use functional, analytics, and performance cookies to understand how users interact with genetrify.com, diagnose issues, measure feature usage, and improve the quality and speed of the service.",
    ],
  },
  {
    title: "3. Third-party cookies and service providers",
    body: [
      "Some cookies or similar technologies may be placed by third-party providers that support hosting, authentication, analytics, payments, or embedded features used by Genetrify Information Technology Services.",
      "Those providers may process technical information according to their own terms and privacy notices. We use such providers to operate the service, not to sell your browsing history as a separate product.",
    ],
  },
  {
    title: "4. Your choices",
    body: [
      "You can usually control cookies through your browser settings, including blocking, deleting, or limiting certain categories. Please note that disabling necessary cookies may prevent parts of genetrify.com from working properly.",
      "Where a consent mechanism is offered, your choices can also be managed through that tool. You remain responsible for any browser-level settings you apply across your devices.",
    ],
  },
  {
    title: "5. Updates to this policy",
    body: [
      "Genetrify Information Technology Services may update this Cookie Policy from time to time to reflect legal, technical, or operational changes. The current version posted on genetrify.com applies as of its effective date.",
    ],
  },
] as const;

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Cookie Policy"
      summary="This policy describes how Genetrify Information Technology Services uses cookies and similar technologies on genetrify.com."
      effectiveDate="March 31, 2026"
      sections={[...sections]}
    />
  );
}
