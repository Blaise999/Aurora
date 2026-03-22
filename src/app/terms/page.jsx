import Link from "next/link";

export const metadata = {
  title: "Terms of Service — AuroraNft",
  description: "Terms and conditions for using the AuroraNft platform.",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-muted-dim">Last updated: January 2025</p>
        </div>

        <div className="prose-custom space-y-8 text-muted leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using AuroraNft ("the Platform"), you agree to be
              bound by these Terms of Service. If you do not agree, please do
              not use the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years old and legally capable of entering
              into binding agreements to use this Platform. By using the
              Platform, you represent and warrant that you meet these
              requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              3. Account & Wallet
            </h2>
            <p>
              You are responsible for maintaining the security of your wallet
              credentials. AuroraNft does not have access to your private keys.
              Any transactions you authorize through your connected wallet are
              your sole responsibility.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              4. NFT Transactions
            </h2>
            <p>
              All NFT purchases and mints are final once confirmed on the
              blockchain. AuroraNft facilitates the transaction but does not
              guarantee the future value of any NFT. Gas fees and network costs
              are the responsibility of the buyer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              5. Intellectual Property
            </h2>
            <p>
              The Platform's design, code, branding, and original content are
              owned by AuroraNft. Purchasing an NFT grants you ownership of
              the digital token but not necessarily the underlying intellectual
              property, unless explicitly stated by the creator.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              6. Prohibited Conduct
            </h2>
            <p>
              You agree not to use the Platform for any unlawful purpose,
              including but not limited to fraud, money laundering, or the
              distribution of harmful content. We reserve the right to suspend
              or terminate access for violations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              7. Disclaimers & Limitation of Liability
            </h2>
            <p>
              The Platform is provided "as is" without warranties of any kind.
              AuroraNft is not liable for any losses arising from blockchain
              transactions, wallet security breaches, smart contract
              vulnerabilities, or market volatility.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              8. Modifications
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              Platform after changes constitutes acceptance of the revised
              Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              9. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              applicable law, without regard to conflict of law principles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              10. Contact
            </h2>
            <p>
              If you have any questions about these Terms, please contact us
              through the Platform's support channels.
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
