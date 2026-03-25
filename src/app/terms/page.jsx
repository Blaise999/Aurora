import Link from "next/link";

export const metadata = {
  title: "Terms of Service — AuroraNFT.art",
  description: "Terms and conditions for using the AuroraNFT.art platform.",
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
          <p className="text-sm text-muted-dim">Effective Date: [Insert Date]</p>
        </div>

        <div className="prose-custom space-y-8 text-muted leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <p>
              Welcome to AuroraNFT (“AuroraNFT,” “we,” “our,” or “us”). These
              Terms of Service (“Terms”) govern your access to and use of
              AuroraNFT.art (the “Platform”). By accessing or using the
              Platform, you agree to be bound by these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              1. Nature of the Platform
            </h2>
            <p>
              AuroraNFT provides a platform that enables users to discover
              digital artworks, mint NFTs, and interact with blockchain-based
              assets. AuroraNFT does not take custody of user assets and does
              not act as a buyer, seller, or intermediary in transactions
              between users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              2. User Responsibility
            </h2>
            <p>
              You are solely responsible for your wallet, private keys, and all
              transactions conducted through the Platform. All blockchain
              transactions are irreversible. AuroraNFT does not have the ability
              to reverse, cancel, or recover any transaction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              3. Identity Verification
            </h2>
            <p>
              AuroraNFT may, at its sole discretion, require users to complete
              identity verification procedures from time to time. Such
              requirements may vary based on user location, regulatory
              obligations, or internal risk assessments. Access to certain
              features of the Platform may be restricted until verification is
              completed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              4. Fees
            </h2>

            <div className="space-y-3">
              <h3 className="font-display font-semibold text-base text-text">
                a. Minting Fee
              </h3>
              <p>
                AuroraNFT charges an upfront fee for minting NFTs. This fee is
                required before minting is completed and may vary from time to
                time at AuroraNFT’s discretion.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-display font-semibold text-base text-text">
                b. Transactions
              </h3>
              <p>
                When purchasing NFTs, any applicable fee will be included in the
                displayed purchase price at the point of transaction.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-display font-semibold text-base text-text">
                c. No Additional Fees
              </h3>
              <p>AuroraNFT does not charge:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Withdrawal fees</li>
                <li>Listing fees</li>
                <li>Hidden fees</li>
                <li>
                  Any additional platform usage fees beyond the minting fee and
                  clearly displayed transaction amount
                </li>
              </ul>
              <p>
                Withdrawals are processed for the exact amount specified by the
                user, without deductions by AuroraNFT.
              </p>
              <p>
                Users remain responsible for any applicable blockchain network
                (gas) fees or third-party service charges.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              5. Prohibited Activities
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>
                Upload or mint content that infringes on intellectual property
                rights
              </li>
              <li>Misrepresent ownership of digital assets</li>
              <li>
                Engage in fraudulent, deceptive, or manipulative activities
              </li>
            </ul>
            <p>
              AuroraNFT reserves the right to determine violations at its sole
              discretion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              6. Content and Listings
            </h2>
            <p>
              You are solely responsible for any content you create, upload, or
              mint on the Platform. AuroraNFT does not verify the authenticity,
              legality, or originality of NFTs and does not guarantee
              visibility, discovery, or sale of any asset. AuroraNFT reserves
              the right to remove or restrict content at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              7. Platform Control
            </h2>
            <p>
              AuroraNFT reserves the right to suspend, restrict, or terminate
              access to the Platform, including removal of content or accounts,
              at its sole discretion, with or without notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              8. No Warranties
            </h2>
            <p>
              The Platform is provided on an “as is” and “as available” basis.
              AuroraNFT makes no warranties or guarantees regarding
              availability, reliability, accuracy, or performance of the
              Platform or any transactions conducted through it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              9. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, AuroraNFT shall not be
              liable for any loss of funds, digital assets, or data, including
              but not limited to losses resulting from user error, unauthorized
              access, smart contract vulnerabilities, or service interruptions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              10. Third-Party Services
            </h2>
            <p>
              The Platform may interact with third-party services, including
              blockchain networks and wallet providers. AuroraNFT does not
              control and is not responsible for the operation, security, or
              functionality of such services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              11. Intellectual Property
            </h2>
            <p>
              Users retain ownership of the content they create, subject to
              applicable laws. Purchasing an NFT does not grant ownership of
              underlying intellectual property rights unless explicitly stated.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              12. Modifications
            </h2>
            <p>
              AuroraNFT reserves the right to modify or discontinue any aspect
              of the Platform at any time. These Terms may be updated
              periodically, and continued use of the Platform constitutes
              acceptance of any revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              13. Termination
            </h2>
            <p>
              AuroraNFT may suspend or terminate your access to the Platform at
              its discretion, including for violations of these Terms or
              compliance with legal obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              14. Dispute Resolution
            </h2>
            <p>
              Any disputes arising from or related to the use of the Platform
              shall be resolved through legally recognized dispute resolution
              mechanisms, including arbitration where applicable. Users waive
              the right to participate in class-action lawsuits where permitted
              by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              15. Geographic Restrictions
            </h2>
            <p>
              Access to the Platform may be restricted in certain jurisdictions
              in accordance with applicable laws and regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-text">
              16. Entire Agreement
            </h2>
            <p>
              These Terms constitute the entire agreement between you and
              AuroraNFT regarding your use of the Platform.
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


