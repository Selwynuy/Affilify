import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy | Genetrify",
  description:
    "Refund Policy for genetrify.com by Genetrify Information Technology Services.",
};

const sections = [
  {
    title: "1. Scope of this policy",
    body: [
      "This Refund Policy applies to subscriptions, token purchases, top-ups, and other paid services purchased through genetrify.com from Genetrify Information Technology Services.",
      "By completing a purchase, you agree to this policy in addition to the Terms of Service and any plan-specific pricing disclosures shown at checkout.",
    ],
  },
  {
    title: "2. Subscription charges",
    body: [
      "Subscription fees are generally non-refundable once a billing cycle has started, except where a refund is required by law or where Genetrify Information Technology Services expressly approves an exception.",
      "If you cancel a subscription, cancellation stops future renewals. Your access typically continues through the end of the paid billing period, and partial-period refunds are not normally issued.",
    ],
  },
  {
    title: "3. Token purchases and generated usage",
    body: [
      "One-time token purchases, top-ups, and other consumable credits are generally non-refundable after they are applied to your account. Generated outputs, AI processing, storage usage, and consumed platform resources are treated as delivered services.",
      "If a purchase was duplicated because of a technical billing error or unauthorized card use, contact us promptly so we can investigate and, where appropriate, issue a correction or refund.",
    ],
  },
  {
    title: "4. How refund requests are reviewed",
    body: [
      "Refund requests are reviewed case by case. We may ask for transaction details, account information, timestamps, or a short description of the issue before deciding whether a refund, credit, or other adjustment is appropriate.",
      "Approved refunds, if any, are typically returned through the original payment method, subject to processor timelines and banking delays.",
    ],
  },
  {
    title: "5. Chargebacks and abuse",
    body: [
      "If you believe a charge is incorrect, please contact Genetrify Information Technology Services before filing a chargeback so we can attempt to resolve the issue quickly. Fraudulent disputes, repeated abuse of refund requests, or deliberate misuse of the platform may result in account suspension or termination.",
    ],
  },
] as const;

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Billing"
      title="Refund Policy"
      summary="This policy explains how Genetrify Information Technology Services handles subscription refunds, token purchase disputes, and billing corrections for genetrify.com."
      effectiveDate="March 31, 2026"
      sections={[...sections]}
    />
  );
}
