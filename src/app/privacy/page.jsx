import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — AuroraNft",
  description: "How AuroraNft collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-[2px] bg-accent" />
            <span className="text-xs font-display font-semibold text-accent uppercase tracking-widest">
              Legal
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-dim">Last updated: January 2025</p>
        </div>

        <div className="prose-custom space-y-8 text-muted leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              1. Information We Collect
            </h2>
            <p>
              When you use AuroraNft, we may collect the following information:
              your email address (for account creation and login), your public
              wallet address (when you connect a wallet), transaction data
              related to minting and purchasing NFTs, basic device and browser
              information for security purposes, and usage data such as pages
              visited and features used.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              2. How We Use Your Information
            </h2>
            <p>
              We use collected information to provide and improve the Platform,
              authenticate your identity and secure your account, process NFT
              transactions and maintain your collection records, send important
              service updates, and prevent fraud and abuse.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              3. Blockchain Data
            </h2>
            <p>
              Please note that blockchain transactions are public by nature.
              Your wallet address and transaction history on the blockchain are
              visible to anyone. AuroraNft does not control blockchain data
              and cannot delete on-chain information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              4. Data Sharing
            </h2>
            <p>
              We do not sell your personal information. We may share data with
              service providers who help us operate the Platform (such as
              database hosting and email delivery), when required by law or to
              protect our legal rights, and in aggregated, anonymized form for
              analytics purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              5. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              data, including encrypted connections, secure session management,
              and access controls. However, no system is completely secure, and
              we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              6. Cookies & Local Storage
            </h2>
            <p>
              We use HTTP-only session cookies for authentication. We do not
              use tracking cookies or third-party advertising cookies. Your
              wallet connection state may be stored locally in your browser by
              your wallet provider.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              7. Your Rights
            </h2>
            <p>
              You have the right to access and review your personal data,
              request correction of inaccurate information, request deletion
              of your account and associated data (excluding on-chain records),
              and withdraw consent for optional data processing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              8. Data Retention
            </h2>
            <p>
              We retain your account data for as long as your account is active
              or as needed to provide you services. Transaction records may be
              retained for compliance purposes. You may request account deletion
              through our support channels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes through the Platform. Continued
              use after changes constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              10. Contact
            </h2>
            <p>
              For privacy-related inquiries, please reach out through the
              Platform's support channels.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <Link
            href="/"
            className="text-sm text-accent hover:underline transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
