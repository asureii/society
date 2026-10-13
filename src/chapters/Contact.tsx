import React from 'react';
import { PROFILE } from '../config/profile';
import { MangaPinnedChapter } from '../ui/MangaPageLayout';

export const Contact: React.FC = () => {
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
    <MangaPinnedChapter
      id="contact"
      sceneId="s7-threshold"
      chapterNumber="07"
      title="THE THRESHOLD"
      jpSubtitle="漆 // 境界門"
      classification="DIRECT TRANSMISSION"
      summary="BEFORE THE MONUMENTAL STONE DOORWAY. STEP ACROSS THE THRESHOLD."
      alignment="center"
    >
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-end items-center gap-3 pb-4 pointer-events-none max-h-[45vh] lg:max-h-none overflow-hidden">
        {/* Clean Contact Caption Panel below the Threshold sill (exits completely by endP = 0.05) */}
        <div
          data-content-box="contact-threshold-panel"
          data-avoid-hud
          className="w-full bg-paper-pure border-3 border-ink p-3 sm:p-4 shadow-[5px_5px_0px_var(--ink)] pointer-events-auto"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-red pb-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="bg-ink text-paper-pure font-mono text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
                CH.07 // THE THRESHOLD
              </span>
              <h2
                id="heading-contact"
                className="font-serif font-bold text-sm sm:text-base text-ink uppercase leading-none"
              >
                OPEN DIRECT CHANNEL
              </h2>
            </div>
            <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-red">
              DIRECT LINK // 接線
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {contactItems.map((item) => (
              <a
                key={item.code}
                href={item.href}
                target={item.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={item.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                className="group border border-ink px-2.5 py-1 bg-paper hover:bg-ink hover:text-paper-pure transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[9px] font-bold tracking-wider uppercase block">
                    {item.code} // {item.label}
                  </span>
                  <span className="font-serif font-bold text-xs truncate block">
                    {item.value}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-red group-hover:text-paper-pure shrink-0">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </MangaPinnedChapter>
  );
};
