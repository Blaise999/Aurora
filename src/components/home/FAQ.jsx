'use client';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    q: 'What wallet do I need to mint?',
    a: 'Any Ethereum-compatible wallet works — MetaMask, Coinbase Wallet, WalletConnect, or Rainbow. Make sure you have enough ETH for the mint price plus gas fees.',
  },
  {
    q: 'How are rarity traits determined?',
    a: 'Traits are generated algorithmically at mint time and stored immutably on-chain. Rarity is calculated based on trait frequency across the entire collection.',
  },
  {
    q: 'Can I mint on other chains?',
    a: 'Currently, minting is available on Ethereum Mainnet only. Cross-chain support for Polygon and Arbitrum is on the roadmap for Q3 2025.',
  },
  {
    q: 'Is the metadata stored on-chain?',
    a: 'Token metadata is stored on IPFS with on-chain pointers. This ensures permanence and verifiability while keeping gas costs reasonable.',
  },
  {
    q: 'What happens after I mint?',
    a: 'Your NFT appears in your wallet immediately after the transaction confirms. You can view it on our platform, list it on any marketplace, or hold it in your collection.',
  },
];

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-white/[0.04]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className={`text-[14px] font-medium transition-colors duration-200 ${isOpen ? 'text-text' : 'text-muted group-hover:text-text'}`}>
          {item.q}
        </span>
        <span className={`shrink-0 ml-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
          ${isOpen ? 'bg-accent/10 text-accent' : 'bg-white/[0.04] text-muted-dim'}`}>
          {isOpen ? <Minus size={13} /> : <Plus size={13} />}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-40 pb-5' : 'max-h-0'}`}>
        <p className="text-[13px] text-muted leading-relaxed pr-12">{item.a}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">FAQ</h2>
            <p className="text-[13px] text-muted mt-2">Common questions about the collection and platform</p>
          </div>
          <div>
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                item={faq}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
