import { LegalPage } from "@/components/landing/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/terms",
  title: "Terms of Service",
  description:
    "Terms of Service for genetrify.com by Genetrify Information Technology Services.",
});

const sections = [
  {
    title: "1. Agreement to these terms",
    body: [
      "These Terms of Service govern your access to and use of genetrify.com and the Genetrify platform provided by Genetrify Information Technology Services. By accessing or using the service, you agree to be bound by these terms.",
      "If you use Genetrify on behalf of a business, you represent that you have authority to bind that business to these terms.",
    ],
  },
  {
    title: "2. Eligibility and account responsibility",
    body: [
      "You must provide accurate information, keep your login credentials secure, and remain responsible for activity occurring under your account. You may not share accounts in a way that bypasses plan limits, security controls, or fair usage restrictions.",
      "Genetrify Information Technology Services may suspend or limit access where necessary to protect the platform, investigate abuse, or enforce these terms.",
    ],
  },
  {
    title: "3. Acceptable use",
    body: [
      "You may use Genetrify only for lawful purposes and in accordance with these terms. You may not use the service to infringe intellectual property rights, impersonate others without authorization, distribute malware, attempt unauthorized access, interfere with service operations, or generate unlawful, deceptive, defamatory, or abusive content.",
      "You are responsible for ensuring that your uploaded materials, likeness rights, prompts, generated outputs, and downstream use of the outputs comply with applicable laws, advertising rules, platform rules, and third-party rights.",
    ],
  },
  {
    title: "4. Billing and tokens",
    body: [
      "Paid features, token purchases, QRPH top-ups, token balances, and related billing features are offered subject to the pricing details shown on genetrify.com at the time of purchase. Fees are charged in advance unless stated otherwise.",
      "When you initiate a one-time purchase, you authorize Genetrify Information Technology Services and its payment processors to charge the payment method you provide for that purchase, taxes, and any applicable fees. Subscription billing is not currently available unless explicitly stated.",
    ],
  },
  {
    title: "5. Intellectual property and service availability",
    body: [
      "Genetrify Information Technology Services retains all rights in the Genetrify platform, software, workflows, branding, and related materials, except for rights expressly granted to you. Subject to these terms and payment of applicable fees, you may use outputs generated for your account for your internal business and commercial marketing purposes unless a specific feature or asset states otherwise.",
      "The service may change over time. We may add, remove, or modify features, usage limits, AI providers, plans, or technical requirements, and we do not guarantee uninterrupted or error-free availability.",
    ],
  },
  {
    title: "6. Termination and disclaimers",
    body: [
      "You may stop using the service at any time. We may suspend or terminate access if you violate these terms, create risk for the platform, fail to pay applicable fees, or where required for legal or security reasons.",
      "Genetrify is provided on an as available and as is basis to the maximum extent permitted by law. Genetrify Information Technology Services disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted availability.",
    ],
  },
  {
    title: "7. Limitation of liability and governing policy updates",
    body: [
      "To the maximum extent permitted by law, Genetrify Information Technology Services will not be liable for indirect, incidental, special, consequential, exemplary, or lost-profit damages arising from or related to the service, even if advised of the possibility. Our total liability for claims arising out of the service will not exceed the amounts you paid to us for the service during the twelve months before the event giving rise to the claim.",
      "We may revise these Terms of Service from time to time. Continued use of genetrify.com after updated terms become effective means you accept the revised terms.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms govern access to genetrify.com and the Genetrify services operated by Genetrify Information Technology Services."
      effectiveDate="March 31, 2026"
      sections={[...sections]}
    />
  );
}
