import React from 'react';
import { Loader } from './chapters/Loader';
import { Cover } from './chapters/Cover';
import { About } from './chapters/About';
import { Work } from './chapters/Work';
import { Status } from './chapters/Status';
import { Skills } from './chapters/Skills';
import { Timeline } from './chapters/Timeline';
import { Contact } from './chapters/Contact';
import { useDiscordPresence } from './hooks/useDiscordPresence';
import { useHudCollisionCheck } from './hooks/useHudCollisionCheck';
import { useLenis } from './hooks/useLenis';
import { useMouseParallax } from './hooks/useMouseParallax';
import { useReducedMotion } from './hooks/useReducedMotion';
import { Scene } from './scene/Scene';
import { CaptionBox } from './ui/CaptionBox';
import { Frame } from './ui/Frame';
import { Nav } from './ui/Nav';
import { ScrollPill } from './ui/ScrollPill';
import { SoundToggle } from './ui/SoundToggle';

export const App: React.FC = () => {
  useReducedMotion();
  useLenis();
  useMouseParallax();
  useDiscordPresence();
  useHudCollisionCheck();

  return (
    <div className="relative min-h-screen w-full text-ink selection:bg-red selection:text-paper-pure">
      {/* Chapter 0: Ink-draw Loader */}
      <Loader />

      {/* Fixed 2.5D WebGL Manga Canvas (aria-hidden) */}
      <Scene />

      {/* Fixed Manga HUD Overlay: Frame, Nav, Scroll Progress Pill, Sound Toggle */}
      <Frame />
      <Nav />
      <ScrollPill />
      <SoundToggle />

      {/* Continuous Scroll Journey Overlay (Chapters 01 - 07) */}
      <main className="relative z-10 w-full">
        {/* Scene Beat: Cover (01) */}
        <Cover />

        {/* Page Beat: About (02) */}
        <About />

        {/* Scene Beat Dolly: Stepping Stone Approach */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative flex h-[55vh] w-full items-end justify-end pb-10 pr-8 md:pr-14"
        >
          <CaptionBox
            code="DOLLY // 02-03"
            text="FOOTSTEPS ECHO ACROSS THE BASALT CAUSEWAY. THE TWIN MONOLITH LOOMS AHEAD."
          />
        </div>

        {/* Page Beat: Work (03) */}
        <Work />

        {/* Scene Beat: Status (04) — Side-panel telemetry */}
        <Status />

        {/* Page Beat: Skills (05) */}
        <Skills />

        {/* Scene Beat Dolly: Monolith Threshold */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative flex h-[55vh] w-full items-end justify-end pb-10 pr-8 md:pr-14"
        >
          <CaptionBox
            code="DOLLY // 05-06"
            text="PASSING BENEATH THE FRACTURED LINTEL. THE RED CORE PULSES AT THE THRESHOLD."
          />
        </div>

        {/* Page Beat: Timeline (06) */}
        <Timeline />

        {/* Scene Beat: Contact (07) + Final "THE END?" Card */}
        <Contact />
      </main>
    </div>
  );
};

export default App;

