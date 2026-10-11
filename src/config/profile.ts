export interface RepoFallback {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  pushed_at: string;
  topics: string[];
  html_url: string;
  isFeatured?: boolean;
}

export interface MagiColumn {
  code: 'MELCHIOR-1' | 'BALTHASAR-2' | 'CASPAR-3';
  persona: string;
  category: string;
  jpLabel: string;
  items: {
    name: string;
    spec: string;
    syncLevel: string;
  }[];
}

export interface TimelineEntry {
  id: string;
  code: string;
  period: string;
  title: string;
  organization: string;
  classification: 'EDUCATION' | 'EXPERIENCE' | 'MILESTONE';
  summary: string;
  caption: string;
}

export interface ProfileConfig {
  fullName: string;
  shortName: string;
  jpDecorativeTitle: string;
  designationCode: string;
  roleTagline: string;
  location: string;
  bio: string[];
  interests: string[];
  coverCaption: string;
  evaFanDossier: {
    favoriteEpisode: string;
    favoriteCharacter: string;
    favoriteQuote: string;
    syncNote: string;
  };
  githubUsername: string;
  excludeForks: boolean;
  featuredRepos: string[];
  enableGithubHeatmap: boolean;
  fallbackRepos: RepoFallback[];
  discordUserId: string;
  allowColorHoverOnMedia: boolean;
  magiSkills: [MagiColumn, MagiColumn, MagiColumn];
  timeline: TimelineEntry[];
  links: {
    github: string;
    discord: string;
    email: string;
    linkedin?: string;
  };
  audio: {
    ambientUrl?: string;
    pageTurnUrl?: string;
    inkSfxUrl?: string;
  };
}

export const PROFILE: ProfileConfig = {
  fullName: 'JONATHAN ERICK CHRISTOVANDY',
  shortName: 'J. E. CHRISTOVANDY',
  jpDecorativeTitle: 'パイロット記録 // 壱号',
  designationCode: 'PILOT-FILE // 01-CHRISTOVANDY',
  roleTagline: 'TODO: SYSTEMS & CREATIVE DEVELOPER // FULL-STACK ENGINEER',
  location: 'TODO: LOCATION / TIMEZONE (e.g. JAKARTA, ID // UTC+7)',
  bio: [
    'TODO: Replace with Jonathan Erick Christovandy personal bio paragraph 1 — focusing on software engineering, low-level systems, and interactive web architecture.',
    'TODO: Replace with personal bio paragraph 2 — approach to craftsmanship, deterministic performance, and graphic user interfaces.',
  ],
  interests: [
    'TODO: Systems Programming',
    'TODO: Interactive WebGL & Shaders',
    'TODO: Mechanical Keyboards / Tooling',
    'TODO: Neon Genesis Evangelion & Mecha Design',
  ],
  coverCaption: 'THE SIGNAL IS LOCKED. NO RETREAT FROM THE HORIZON LINE.',
  evaFanDossier: {
    favoriteEpisode: 'TODO: EPISODE # (e.g. EPISODE 19: INTROJECTION / 男の戰い)',
    favoriteCharacter: 'TODO: FAVORITE CHARACTER (e.g. KAJI RYOJI / MISATO KATSURAGI)',
    favoriteQuote: 'TODO: "Insert favorite Evangelion quote here in src/config/profile.ts"',
    syncNote: 'PATTERN BLUE CONFIRMED // HARMONICS NORMAL WITHIN ENTRY PLUG',
  },
  // Replace with your live GitHub handle (e.g. 'camellia' or your exact username)
  githubUsername: 'TODO_GITHUB_USERNAME',
  excludeForks: true,
  featuredRepos: [
    'pilot-file-portfolio',
    'TODO-featured-repo-1',
    'TODO-featured-repo-2',
  ],
  enableGithubHeatmap: true,
  fallbackRepos: [
    {
      name: 'pilot-file-portfolio',
      description:
        'Scroll-driven 2.5D manga portfolio built with React Three Fiber, custom GLSL ink/hatching shaders, GSAP ScrollTrigger, and Lenis.',
      language: 'TypeScript',
      stargazers_count: 1,
      pushed_at: new Date().toISOString(),
      topics: ['webgl', 'glsl', 'threejs', 'gsap', 'manga-shader'],
      html_url: 'https://github.com',
      isFeatured: true,
    },
    {
      name: 'TODO-project-alpha',
      description:
        'TODO: Configure githubUsername in src/config/profile.ts to load live repositories automatically from GitHub REST API.',
      language: 'Rust',
      stargazers_count: 0,
      pushed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      topics: ['systems', 'performance', 'todo'],
      html_url: 'https://github.com',
      isFeatured: true,
    },
    {
      name: 'TODO-project-beta',
      description:
        'TODO: Static fallback repository entry shown when offline, rate-limited, or before githubUsername is configured.',
      language: 'C++',
      stargazers_count: 0,
      pushed_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      topics: ['graphics', 'engine', 'todo'],
      html_url: 'https://github.com',
    },
    {
      name: 'TODO-project-gamma',
      description:
        'TODO: Replace fallback entries or set githubUsername in src/config/profile.ts for live PushEvent and repository synchronization.',
      language: 'Go',
      stargazers_count: 0,
      pushed_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      topics: ['network', 'distributed', 'todo'],
      html_url: 'https://github.com',
    },
  ],
  // Replace with your 18-digit Discord Snowflake ID registered with Lanyard (https://github.com/Phineas/lanyard)
  discordUserId: 'TODO_DISCORD_USER_ID',
  allowColorHoverOnMedia: false,
  magiSkills: [
    {
      code: 'MELCHIOR-1',
      persona: 'AS SCIENTIST // 科学者',
      category: 'FRONTEND & CREATIVE DEV',
      jpLabel: '視覚演算システム',
      items: [
        { name: 'TypeScript / React', spec: 'UI Architecture & State', syncLevel: '98.4%' },
        { name: 'Three.js / R3F / GLSL', spec: '2.5D Shaders & Post-FX', syncLevel: '94.2%' },
        { name: 'GSAP / ScrollTrigger', spec: 'Scroll Choreography', syncLevel: '96.0%' },
        { name: 'Tailwind CSS / Design Systems', spec: 'Strict Token UI', syncLevel: '99.1%' },
      ],
    },
    {
      code: 'BALTHASAR-2',
      persona: 'AS GUARDIAN // 守護者',
      category: 'BACKEND & SYSTEMS TOOLS',
      jpLabel: '基幹制御システム',
      items: [
        { name: 'TODO: Primary Backend Lang', spec: 'API & Concurrency', syncLevel: '92.0%' },
        { name: 'Linux / Shell / Git', spec: 'Environment & Tooling', syncLevel: '95.5%' },
        { name: 'PostgreSQL / Redis', spec: 'Data Persistence & Cache', syncLevel: '89.8%' },
        { name: 'Docker / CI Pipelines', spec: 'Deterministic Builds', syncLevel: '91.3%' },
      ],
    },
    {
      code: 'CASPAR-3',
      persona: 'AS SEEKER // 探求者',
      category: 'LEARNING & EXPLORING',
      jpLabel: '次世代研究領域',
      items: [
        { name: 'TODO: Low-Level / Rust / Zig', spec: 'Memory-Safe Systems', syncLevel: 'SYNCING' },
        { name: 'Custom Render Pipelines', spec: 'NPR & Halftone Math', syncLevel: 'SYNCING' },
        { name: 'Distributed Systems', spec: 'Real-Time Telemetry', syncLevel: 'SYNCING' },
        { name: 'TODO: Custom Topic', spec: 'Edit in src/config/profile.ts', syncLevel: 'SYNCING' },
      ],
    },
  ],
  timeline: [
    {
      id: 'tl-01',
      code: 'LOG // 01',
      period: 'TODO: YEAR — YEAR',
      title: 'TODO: DEGREE OR ACADEMIC PROGRAM',
      organization: 'TODO: UNIVERSITY / INSTITUTION',
      classification: 'EDUCATION',
      summary:
        'TODO: Replace with real education details in src/config/profile.ts. Focus on computer science, engineering fundamentals, or research.',
      caption: 'INITIAL CALIBRATION PHASE BEGINS.',
    },
    {
      id: 'tl-02',
      code: 'LOG // 02',
      period: 'TODO: YEAR — YEAR',
      title: 'TODO: SOFTWARE ENGINEER / INTERN ROLE',
      organization: 'TODO: COMPANY OR LAB NAME',
      classification: 'EXPERIENCE',
      summary:
        'TODO: Replace with real work experience in src/config/profile.ts. Do not invent employers or metrics.',
      caption: 'FIELD DEPLOYMENT UNDER LIVE CONDITIONS.',
    },
    {
      id: 'tl-03',
      code: 'LOG // 03',
      period: 'TODO: YEAR',
      title: 'TODO: KEY TECHNICAL MILESTONE OR OPEN SOURCE LAUNCH',
      organization: 'INDEPENDENT // PERSONAL RESEARCH',
      classification: 'MILESTONE',
      summary:
        'TODO: Replace with a major project launch, hackathon, or architectural milestone in src/config/profile.ts.',
      caption: 'THRESHOLD EXCEEDED. NEW TRAJECTORY SET.',
    },
    {
      id: 'tl-04',
      code: 'LOG // 04',
      period: 'PRESENT',
      title: 'TODO: CURRENT FOCUS & NEXT OBJECTIVE',
      organization: 'ACTIVE DUTY // OPEN FOR COLLABORATION',
      classification: 'MILESTONE',
      summary:
        'TODO: Describe what Jonathan Erick Christovandy is currently building or seeking next.',
      caption: 'THE WALK TOWARD THE MONOLITH CONTINUES.',
    },
  ],
  links: {
    github: 'https://github.com/TODO_GITHUB_USERNAME',
    discord: 'https://discord.com/users/TODO_DISCORD_USER_ID',
    email: 'mailto:TODO_EMAIL@example.com',
    linkedin: 'https://linkedin.com/in/TODO_LINKEDIN',
  },
  audio: {
    ambientUrl: undefined,
    pageTurnUrl: undefined,
    inkSfxUrl: undefined,
  },
};
