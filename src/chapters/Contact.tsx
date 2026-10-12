import React from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore } from '../store/useAppStore';
import { CaptionBox } from '../ui/CaptionBox';

export const Contact: React.FC = () => {
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);

  const handleReturnToStart = () => {
    if (scrollToTarget) {
      scrollToTarget(0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const contactItems = [
    {
      label: 'GITHUB',
      code: '01',
      href: PROFILE.links.github,
      value: PROFILE.githubUsername,
    },
    {
      label: 'DISCORD',
      code: '02',
      href: PROFILE.links.discord,
      value: PROFILE.discordUserId,
    },
    {
      label: 'EMAIL',
      code: '03',
      href: PROFILE.links.email,
      value: PROFILE.links.email.replace('mailto:', ''),
    },
    ...(PROFILE.links.linkedin
      ? [
          {
            label: 'LINKEDIN',
            code: '04',
            href: PROFILE.links.linkedin,
            value: 'PROFILE LINK',
          },
        ]
      : []),
  ];

  return (
    <section
      id="chapter-contact"
      aria-labelledby="heading-contact"
      style={{ paddingTop: 'calc(var(--hud-top, 64px) + 24px)' }}
      className="relative min-h-[185vh] w-full px-5 sm:px-10 md:px-14 pb-14 pointer-events-none flex flex-col justify-between"
    >
      {/* Beat 1: Scene Beat Approach — Single Right Side Panel (<= 35vw) positioned OUTSIDE the Left/Center Stage Focal Rect */}
      <div className="w-full min-h-[82vh] flex flex-col justify-center md:items-end">
        <div
          data-content-box="contact-side-panel"
          className="pointer-events-auto w-full md:max-w-[35vw] md:mr-8 bg-paper-pure border-3 border-ink p-5 shadow-[5px_5px_0px_var(--ink)] space-y-4"
        >
          <div className="flex items-center justify-between border-b-2 border-red pb-2">
            <div>
              <span className="font-display text-xs tracking-[0.18em] uppercase text-red block">
                CHAPTER 07 // MONOLITH
              </span>
              <h2
                id="heading-contact"
                className="font-serif font-bold text-2xl text-ink uppercase leading-none mt-0.5"
              >
                OPEN CHANNEL
              </h2>
            </div>
            <span
              className="font-serif text-xs tracking-widest border border-ink px-2 py-0.5"
              aria-hidden="true"
            >
              通信
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {contactItems.map((item) => (
              <a
                key={item.code}
                href={item.href}
                target={item.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={item.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                className="group border-2 border-ink p-3 bg-paper hover:bg-ink hover:text-paper-pure transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold tracking-wider uppercase block">
                    {item.code} // {item.label}
                  </span>
                  <span className="font-serif font-bold text-base truncate block mt-0.5">
                    {item.value}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-red group-hover:text-paper-pure shrink-0">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="pointer-events-auto self-end md:mr-8 mt-4">
          <CaptionBox
            code="CH.07 // MONOLITH"
            text="AT THE FOOT OF THE TWIN MONOLITH. OPEN A DIRECT CHANNEL."
          />
        </div>
      </div>

      {/* Beat 2: Final Closing Card at 100% scroll — Black "THE END?" card with white type, red accent, and smooth return-to-start */}
      <div className="w-full min-h-[75vh] flex flex-col justify-end">
        <div
          data-content-box="contact-final-card"
          data-allow-focal="true"
          className="pointer-events-auto w-full max-w-5xl mx-auto bg-ink text-paper-pure border-4 border-ink p-8 sm:p-10 shadow-[6px_6px_0px_var(--red)] flex flex-col md:flex-row items-start md:items-end justify-between gap-6"
        >
          <div>
            <div className="inline-block bg-red text-paper-pure font-mono text-xs font-bold tracking-[0.22em] uppercase px-2.5 py-1 mb-3">
              EPILOGUE // 終劇
            </div>
            <h3 className="font-serif font-bold text-4xl sm:text-5xl tracking-tight uppercase leading-none">
              THE END?
            </h3>
            <p className="font-mono text-xs sm:text-sm tracking-wider uppercase mt-3">
              TO BE CONTINUED IN NEXT DEPLOYMENT — {PROFILE.fullName}
            </p>
          </div>

          <button
            type="button"
            onClick={handleReturnToStart}
            className="bg-paper-pure text-ink font-display text-xs sm:text-sm tracking-[0.18em] uppercase px-5 py-3 border-2 border-paper-pure hover:bg-red hover:text-paper-pure hover:border-red transition-colors cursor-pointer shrink-0"
          >
            REWIND TO START ↑
          </button>
        </div>
      </div>
    </section>
  );
};

