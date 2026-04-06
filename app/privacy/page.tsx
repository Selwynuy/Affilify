import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Genetrify",
  description:
    "Privacy Policy for genetrify.com by Genetrify Information Technology Services.",
};

const sections = [
  {
    title: "1. Who this policy applies to",
    body: [
      "This Privacy Policy explains how Genetrify Information Technology Services collects, uses, stores, and protects personal information when you visit genetrify.com, create an account, purchase token credits or QRPH top-ups, or use Genetrify's AI content generation services.",
      "By using genetrify.com, you acknowledge that your information will be handled as described in this policy.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "We may collect account details such as your name, email address, login credentials, billing information, and support messages. We also collect content you upload to use the service, including profile photos, avatar inputs, product images, prompts, generated assets, and related usage data.",
      "We may also collect technical data such as IP address, browser type, device information, cookies, session identifiers, referral URLs, and product analytics needed to secure, operate, and improve the platform.",
    ],
  },
  {
    title: "3. How we use information",
    body: [
      "Genetrify Information Technology Services uses personal information to provide the service, authenticate users, process payments, generate requested outputs, store project history, answer support requests, prevent abuse, and maintain platform security.",
      "We may also use information to improve features, troubleshoot issues, analyze product performance, enforce our Terms of Service, and send transactional communications such as confirmations, invoices, password resets, billing notices, and service updates.",
    ],
  },
  {
    title: "4. Legal bases and sharing",
    body: [
      "We process information where necessary to perform our contract with you, comply with legal obligations, pursue legitimate business interests, or where you have given consent. We do not sell your personal information as a standalone product.",
      "We may share information with service providers that help us run Genetrify, including infrastructure, authentication, database, email, analytics, payment, and AI generation partners, but only to the extent reasonably necessary for service delivery, security, operations, or compliance.",
    ],
  },
  {
    title: "5. Data retention and security",
    body: [
      "We retain information for as long as reasonably necessary to operate your account, provide purchased services, maintain records, resolve disputes, enforce agreements, and meet legal, tax, accounting, or security requirements.",
      "We use administrative, technical, and organizational safeguards intended to protect information. No online system is completely risk-free, so Genetrify Information Technology Services cannot guarantee absolute security.",
    ],
  },
  {
    title: "6. Your choices and rights",
    body: [
      "You may request access to, correction of, or deletion of your personal information, subject to legal and operational limitations. You may also update some account details directly inside the platform.",
      "If you no longer want marketing communications, you may unsubscribe where available. Transactional and service-related messages may still be sent when necessary for your account or purchases.",
    ],
  },
  {
    title: "7. International processing and policy updates",
    body: [
      "Your information may be processed by systems and providers located outside your local jurisdiction. By using genetrify.com, you understand that cross-border processing may occur where needed to operate the service.",
      "Genetrify Information Technology Services may update this Privacy Policy from time to time. The latest version posted on genetrify.com will control as of its effective date.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      summary="This policy explains how Genetrify Information Technology Services handles personal information collected through genetrify.com and the Genetrify platform."
      effectiveDate="March 31, 2026"
      sections={[...sections]}
    />
  );
}
