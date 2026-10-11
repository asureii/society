import React from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore } from '../store/useAppStore';
import { ChapterCard } from '../ui/ChapterCard';

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
      label: 'GITHUB // REPOSITORIES',
      code: 'CH-07.A',
      href: PROFILE.links.github,
      value: PROFILE.githubUsername,
    },
    {
      label: 'DISCORD // DIRECT COMM',
      code: 'CH-07.B',
      href: PROFILE.links.discord,
      value: PROFILE.discordUserId,
    },
    {
      label: 'ELECTRONIC MAIL // TRANSMISSION',
      code: 'CH-07.C',
      href: PROFILE.links.email,
      value: PROFILE.links.email.replace('mailto:', ''),
    },
    ...(PROFILE.links.linkedin
      ? [
          {
            label: 'LINKEDIN // PERSONNEL RECORD',
            code: 'CH-07.D',
            href: PROFILE.links.linkedin,
            value: 'LINKEDIN PROFILE',
          },
        ]
      : []),
  ];

  return (
    <section
      id="chapter-contact"
      aria-labelledby="heading-contact"
      className="relative min-h-[115vh] w-full px-6 sm:px-12 md:px-20 py-28 pointer-events-none flex flex-col justify-between"
    >
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div id="heading-contact" className="pointer-events-auto">
          <ChapterCard
            number="07"
            title="FINAL PANEL // MONOLITH"
            jpSubtitle="漆 // 終局・通信"
            alertText="DESTINATION REACHED"
          />
        </div>

        {/* Full-bleed manga communication panel */}
        <div className="pointer-events-auto bg-paper-pure border-4 border-ink p-6 sm:p-10 shadow-[8px_8px_0px_var(--ink)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-ink pb-4 mb-6">
            <div>
              <span className="font-mono text-xs font-bold tracking-widest uppercase text-red block">
                MONOLITH INTERFACE // OPEN CHANNEL
              </span>
              <h3 className="font-serif font-bold text-2xl sm:text-4xl text-ink uppercase mt-1">
                INITIATE DIRECT TRANSMISSION
              </h3>
            </div>
            <span className="font-mono text-xs font-bold bg-ink text-paper-pure px-3 py-1 self-start md:self-auto">
              SIGNAL STRENGTH // 100%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contactItems.map((item) => (
              <a
                key={item.code}
                href={item.href}
                target={item.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={item.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                className="group border-2 border-ink p-4 bg-paper hover:bg-ink hover:text-paper-pure transition-colors flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold tracking-widest uppercase opacity-75">
                    {item.code} // {item.label}
                  </span>
                  <span className="font-mono text-xs font-bold text-red group-hover:text-paper-pure">
                    ↗
                  </span>
                </div>
                <div className="font-serif font-bold text-lg truncate">{item.value}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Black "THE END?" closing card with white type and red accent, plus smooth return-to-start rewind */}
        <div className="pointer-events-auto bg-ink text-paper-pure border-4 border-ink p-8 sm:p-12 shadow-[8px_8px_0px_var(--red)] flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <div className="inline-block bg-red text-paper-pure font-mono text-xs font-bold tracking-[0.25em] uppercase px-2.5 py-1 mb-3">
              EPILOGUE // 終劇
            </div>
            <h2 className="font-serif font-bold text-4xl sm:text-6xl tracking-tight uppercase leading-none">
              THE END?
            </h2>
            <p className="font-mono text-xs sm:text-sm tracking-wider uppercase mt-3 opacity-90">
               TO BE CONTINUED IN NEXT DEPLOYMENT — {PROFILE.fullName}
            </p>
          </div>

          <button
            type="button"
            onClick={handleReturnToStart}
            className="bg-paper-pure text-ink font-display text-sm tracking-[0.2em] uppercase px-6 py-3 border-2 border-paper-pure hover:bg-red hover:text-paper-pure hover:border-red transition-colors cursor-pointer shrink-0"
          >
            REWIND TO ENTRY PLUG // 壱へ戻る ↑
          </button>
        </div>
      </div>
    </section>
  );
};
