import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function VesperLandingView() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const appears = document.querySelectorAll('.appear');
    appears.forEach((el) => {
      el.addEventListener('animationend', () => el.classList.add('is-in'), { once: true });
    });

    const timer = setTimeout(() => {
      appears.forEach((el) => el.classList.add('is-in'));
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-white selection:text-black">
      {/* Immediate force black */}
      <style>{`
        html, body { background: #000000 !important; color: #ffffff; }
        .font-serif-italic {
          font-family: "Instrument Serif", "Times New Roman", Times, serif;
          font-style: italic;
        }
      `}</style>

      {/* Layer 4: Grain */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-[100] opacity-[0.035] bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[size:3px_3px]"></div>

      {/* Layer 2: Hero Video Background */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Layer 3: Main Page Layout */}
      <div className="relative z-10 grid grid-rows-[auto_1fr_auto] min-h-screen min-h-[100dvh]">
        {/* Mobile Menu Backdrop */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xl transition-all"
          />
        )}

        {/* Header Grid */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-6 lg:px-16 py-6 z-50 relative">
          {/* Left: Logo */}
          <Link to="/" className="inline-flex items-center gap-2.5 justify-self-start text-[15.5px] font-semibold tracking-tight text-white">
            <svg className="w-[22px] h-[22px] text-white" viewBox="0 0 24 24" fill="currentColor">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
            <span>Vesper<span className="font-normal opacity-90">.ai</span></span>
          </Link>

          {/* Center: Navigation - Liquid Metal Pills */}
          <nav className="hidden md:flex items-center gap-2 justify-self-center">
            <a href="#benefits" className="liquid-pill">Benefits</a>
            <a href="#how-it-works" className="liquid-pill">How It Works</a>
            <a href="#faqs" className="liquid-pill">FAQs</a>
            <a href="#pricing" className="liquid-pill">Pricing</a>
          </nav>

          {/* Right: Header CTA */}
          <div className="justify-self-end flex items-center gap-3">
            <Link to="/app" className="px-4 py-2 rounded-md bg-white text-black font-medium text-xs sm:text-sm hover:bg-slate-200 transition-all shadow-md">
              Start for Free
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-10 h-10 rounded-md border border-white/20 bg-black/60 flex flex-col items-center justify-center gap-1 z-50"
            >
              <span className={`w-4 h-[1.5px] bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-[5.5px]' : ''}`} />
              <span className={`w-4 h-[1.5px] bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-4 h-[1.5px] bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-[5.5px]' : ''}`} />
            </button>
          </div>
        </header>

        {/* Main Hero */}
        <main className="flex items-end justify-center px-6 pb-20 sm:pb-24">
          <div className="relative z-10 flex flex-col items-center text-center max-w-[860px] w-full">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-2 rounded-md bg-gradient-to-r from-neutral-600 via-neutral-800 to-black text-neutral-200 text-xs tracking-tight border border-white/10">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white drop-shadow-[0_0_3px_rgba(255,255,255,0.45)]">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Operational AI Infrastructure
            </div>

            {/* H1 Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight leading-[1.12] text-white flex flex-col items-center">
              <span>Train <em className="font-serif-italic text-neutral-300 not-italic">AI agents</em> on your</span>
              <span>workflows in minutes.</span>
            </h1>

            {/* Lede */}
            <p className="max-w-[470px] mt-5 text-neutral-400 text-sm sm:text-base font-normal leading-relaxed">
              Deploy adaptive AI agents that learn, execute, and scale operational tasks across your business.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <Link to="/app" className="px-5 py-2.5 rounded-md bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-all shadow-lg">
                Start for Free
              </Link>
              <Link to="/app" className="px-5 py-2.5 rounded-md bg-white/10 text-white font-medium text-sm border border-white/20 backdrop-blur-xl hover:border-white/40 transition-all">
                See it in action
              </Link>
            </div>
          </div>
        </main>

        {/* Stats Footer */}
        <footer className="flex flex-col md:flex-row items-center justify-between gap-6 px-8 lg:px-20 pb-8 text-neutral-300">
          <div className="inline-flex items-center gap-3 text.xs sm:text-sm tracking-tight whitespace-nowrap">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="grad-left-react" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#3a3a3a" stopOpacity="0.62" />
                </linearGradient>
                <linearGradient id="grad-right-react" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3a3a3a" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.62" />
                </linearGradient>
              </defs>
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#grad-left-react)" />
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#grad-right-react)" />
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
            </svg>
            <span>4.2M+ workflows automated</span>
          </div>

          <div className="inline-flex items-center gap-3 text-xs sm:text-sm tracking-tight whitespace-nowrap">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
              <path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" stroke="#111111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span>92% reduction in manual operations</span>
          </div>

          <div className="inline-flex items-center gap-3 text-xs sm:text-sm tracking-tight whitespace-nowrap">
            <svg className="w-9 h-5" viewBox="0 0 40 22">
              <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
              <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
              <circle cx="9" cy="11.5" r="0.7" fill="#1a1a1a" />
              <circle cx="11.4" cy="11.5" r="0.7" fill="#1a1a1a" />
              <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
              <circle cx="18" cy="9.5" r="1.7" fill="#111111" />
              <circle cx="22.4" cy="9.5" r="1.7" fill="#111111" />
              <path d="M17.5 14c1 1.5 4.4 1.5 5.4 0" stroke="#111111" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
              <text x="30.2" y="15.1" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="12.5" fill="#ffffff" textAnchor="middle">e</text>
            </svg>
            <span>180+ operational teams onboarded</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
