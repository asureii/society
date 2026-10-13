import React from 'react';
import { PROFILE } from '../../config/profile';

interface SocialLinkItem {
  id: string;
  name: string;
  code: string;
  href: string;
  handle: string;
}

export const SocialLinksWidget: React.FC = () => {
  const links: SocialLinkItem[] = [
    {
      id: 'spotify',
      name: 'SPOTIFY',
      code: 'SP-01',
      href: PROFILE.links.spotify || 'https://open.spotify.com',
      handle: 'sa7ity',
    },
    {
      id: 'discord',
      name: 'DISCORD',
      code: 'DC-02',
      href: PROFILE.links.discord || 'https://discord.com/users/832522840682790913',
      handle: '@sa7ity',
    },
    {
      id: 'tiktok',
      name: 'TIKTOK',
      code: 'TT-03',
      href: PROFILE.links.tiktok || 'https://www.tiktok.com/@sa7ity',
      handle: '@sa7ity',
    },
    {
      id: 'instagram',
      name: 'INSTAGRAM',
      code: 'IG-04',
      href: PROFILE.links.instagram || 'https://www.instagram.com/sa7ity',
      handle: '@sa7ity',
    },
  ];

  return (
    <div
      data-testid="widget-social-links"
      className="flex flex-col gap-1.5 font-mono text-[var(--ink)]"
    >
      <div className="grid grid-cols-2 gap-1.5">
        {links.map((item) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`social-link-${item.id}`}
            aria-label={`${item.name} link`}
            className="group flex flex-col justify-between p-1.5 border border-[var(--ink)] bg-[var(--paper)] transition-all duration-150 hover:bg-[var(--ink)] hover:text-[var(--paper-pure)] hover:border-[var(--red)] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold tracking-[0.14em] text-[var(--ink)] group-hover:text-[var(--paper-pure)]">
                {item.code}
              </span>
              <span className="text-[9px] text-[var(--ink)]/60 group-hover:text-[var(--red)] font-bold">
                ↗
              </span>
            </div>

            <div className="mt-1">
              <div className="text-[10px] font-bold tracking-[0.08em] uppercase group-hover:text-[var(--paper-pure)]">
                {item.name}
              </div>
              <div className="text-[8px] tracking-[0.06em] text-[var(--ink)]/70 group-hover:text-[var(--paper-pure)]/80 truncate">
                {item.handle}
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="flex items-center justify-between px-1 py-0.5 border-t border-[var(--ink)] text-[8px] tracking-[0.12em] text-[var(--ink)]/70">
        <span>UPLINK // EXTERNAL</span>
        <span className="text-[var(--red)] font-bold">ACTIVE</span>
      </div>
    </div>
  );
};

export default SocialLinksWidget;
