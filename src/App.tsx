import React from 'react';
import { About } from './chapters/About';
import { Contact } from './chapters/Contact';
import { Cover } from './chapters/Cover';
import { Intro } from './chapters/Intro/Intro';
import { Skills } from './chapters/Skills';
import { Status } from './chapters/Status';
import { Timeline } from './chapters/Timeline';
import { Work } from './chapters/Work';
import { TOTAL_SCROLL_HEIGHT_VH } from './config/scroll.config';
import { useDiscordPresence } from './hooks/useDiscordPresence';
import { useHudCollisionCheck } from './hooks/useHudCollisionCheck';
import { useLenis } from './hooks/useLenis';
import { useMouseParallax } from './hooks/useMouseParallax';
import { useReducedMotion } from './hooks/useReducedMotion';
import { Scene } from './scene/Scene';
import { EndScreen } from './ui/EndScreen';
import { Frame } from './ui/Frame';
import { Nav } from './ui/Nav';
import { ScrollPill } from './ui/ScrollPill';
import { SoundToggle } from './ui/SoundToggle';
import { TransitionScrubber } from './ui/TransitionScrubber';

export const App: React.FC = () => {
  useReducedMotion();
  useLenis();
  useMouseParallax();
  useDiscordPresence();
  useHudCollisionCheck();

  return (
    <div className="relative min-h-screen w-full text-ink selection:bg-red selection:text-paper-pure">
      {/* Chapter 0: Cinematic Intro Sequence ("Machinery is a projection of the mind") */}
      <Intro />

      {/* Fixed 2.5D Multi-Scene WebGL Manga Stage (aria-hidden) */}
      <Scene />

      {/* Full-Bleed "THE END?" Finale Overlay (active at endP >= 0.92, inert otherwise) */}
      <EndScreen />

      {/* Fixed Manga HUD Overlay: Frame, Nav, Scroll Progress Pill, Sound Toggle, Dev Scrubber */}
      <Frame />
      <Nav />
      <ScrollPill />
      <SoundToggle />
      <TransitionScrubber />

      {/* 1. Single Scroll Spacer Element: Drives the native single scrollbar via Lenis */}
      <div
        id="scroll-spacer"
        style={{ height: `${TOTAL_SCROLL_HEIGHT_VH}vh` }}
        className="w-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Single Fixed Pinned Panel Layer: position: fixed; inset: 0; pointer-events: none */}
      <main
        id="pinned-panel-layer"
        className="fixed inset-0 pointer-events-none z-10 overflow-hidden"
        aria-label="Pilot Chapters"
      >
        {/* S1 · Cover · "The Causeway" */}
        <Cover />

        {/* S2 · Dossier · "The Observation Room" */}
        <About />

        {/* S3 · The Work · "The Archive City" */}
        <Work />

        {/* S4 · Pilot Status · "The Plug" */}
        <Status />

        {/* S5 · Skills · "The Three Pillars" */}
        <Skills />

        {/* S6 · Timeline · "The Long Scroll" */}
        <Timeline />

        {/* S7 · Contact · "The Threshold" */}
        <Contact />
      </main>
    </div>
  );
};

export default App;
