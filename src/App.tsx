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
import { useLenis } from './hooks/useLenis';
import { useMouseParallax } from './hooks/useMouseParallax';
import { useReducedMotion } from './hooks/useReducedMotion';
import { Scene } from './scene/Scene';
import { Frame } from './ui/Frame';
import { Nav } from './ui/Nav';
import { ScrollPill } from './ui/ScrollPill';
import { SoundToggle } from './ui/SoundToggle';

export const App: React.FC = () => {
  useReducedMotion();
  useLenis();
  useMouseParallax();
  useDiscordPresence();

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
        <Cover />
        <About />
        <Work />
        <Status />
        <Skills />
        <Timeline />
        <Contact />
      </main>
    </div>
  );
};

export default App;
