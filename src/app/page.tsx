import Image from "next/image";

export default function Home() {
  return (
    <div className="relative w-full bg-[#d0d0d0] overflow-x-hidden">
      {/* NOISE TEXTURE OVERLAY - SLOW SUBTLE ANIMATION */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.5] mix-blend-overlay">
        <svg className="h-full w-full">
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.5"
              numOctaves="5"
              stitchTiles="stitch"
            >
              <animate
                attributeName="seed"
                from="0"
                to="100"
                dur="30s"
                repeatCount="indefinite"
              />
            </feTurbulence>
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* SECONDARY GRAIN LAYER - even slower */}
      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.25] mix-blend-multiply">
        <svg className="h-full w-full">
          <filter id="noiseFilter2">
            <feTurbulence
              type="turbulence"
              baseFrequency="2.5"
              numOctaves="3"
              stitchTiles="stitch"
            >
              <animate
                attributeName="seed"
                from="0"
                to="50"
                dur="45s"
                repeatCount="indefinite"
              />
            </feTurbulence>
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter2)" />
        </svg>
      </div>

      {/* FULL PAGE CONTAINER - allows circle to flow across sections */}
      <div className="relative">
        
        {/* SECTION 1: HERO */}
        <section className="relative flex h-[100vh] w-full items-end justify-center overflow-visible">
          
          {/* Top fade gradient - blends dome into background */}
          <div 
            className="absolute top-0 left-0 w-full h-[50vh] z-10"
            style={{
              background: "linear-gradient(to bottom, #d0d0d0 0%, #d0d0d0 20%, transparent 100%)",
            }}
          />
          
          {/* Corner shadow gradients */}
          <div 
            className="absolute top-0 left-0 h-[60vh] w-[45vw] z-20"
            style={{
              background: "radial-gradient(ellipse at top left, rgba(60,60,60,0.6) 0%, rgba(90,90,90,0.4) 25%, rgba(120,120,120,0.2) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />
          <div 
            className="absolute top-0 right-0 h-[60vh] w-[45vw] z-20"
            style={{
              background: "radial-gradient(ellipse at top right, rgba(60,60,60,0.6) 0%, rgba(90,90,90,0.4) 25%, rgba(120,120,120,0.2) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />

          {/* ===== CURVED NAVBAR - positioned along the outer white gradient ring ===== */}
          {/* Main glow ring is 120vh diameter = 60vh radius on mobile, 150vh = 75vh radius on desktop */}
          <nav className="absolute bottom-0 left-1/2 z-30 font-[family-name:var(--font-body)]">
            {/* 10 o'clock - Home */}
            <a 
              href="/dashboard"
              className="absolute text-neutral-900/80 text-base md:text-lg font-light tracking-wide hover:text-neutral-900 transition-colors whitespace-nowrap"
              style={{
                transform: "translateX(-50%) rotate(-55deg) translateY(-60vh) rotate(55deg)",
              }}
            >
              Home
            </a>
            
            {/* 11 o'clock - About */}
            <a 
              href="#about"
              className="absolute text-neutral-900/80 text-base md:text-lg font-light tracking-wide hover:text-neutral-900 transition-colors whitespace-nowrap"
              style={{
                transform: "translateX(-50%) rotate(-25deg) translateY(-60vh) rotate(25deg)",
              }}
            >
              About
            </a>
            
            {/* 1 o'clock - Sign Up */}
            <a 
              href="#"
              className="absolute text-neutral-900/80 text-base md:text-lg font-light tracking-wide hover:text-neutral-900 transition-colors whitespace-nowrap"
              style={{
                transform: "translateX(-50%) rotate(25deg) translateY(-60vh) rotate(-25deg)",
              }}
            >
              Sign Up
            </a>
            
            {/* 2 o'clock - Log In */}
            <a 
              href="#"
              className="absolute text-neutral-900/80 text-base md:text-lg font-light tracking-wide hover:text-neutral-900 transition-colors whitespace-nowrap"
              style={{
                transform: "translateX(-50%) rotate(55deg) translateY(-60vh) rotate(-55deg)",
              }}
            >
              Log In
            </a>
          </nav>
          
          {/* Logo and Title Container */}
          <div className="absolute bottom-[8vh] left-0 right-0 z-30 flex flex-col items-center gap-4">
            {/* Logo */}
            <div className="w-[24vw] md:w-[15vw]">
              <Image
                src="/learnspacelogo.svg"
                alt="Learnspace Logo"
                width={100}
                height={100}
                className="w-full h-auto opacity-80"
                style={{ filter: "brightness(0)" }}
              />
            </div>
            
            {/* Hero Title */}
            <h1 
              className="text-[12vw] md:text-[10vw] text-neutral-900/80 tracking-tight text-center font-semibold font-[family-name:var(--font-display)]"
            >
              Learnspace.
            </h1>
          </div>
        </section>

        {/* ===== THE SINGLE CIRCLE - positioned between sections ===== */}
        <div className="absolute top-[100vh] left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          
          {/* Outermost dark ring - gets darker at edges */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[210vh] w-[210vh] rounded-full md:h-[240vh] md:w-[240vh]"
            style={{
              background: "radial-gradient(circle, transparent 0%, transparent 35%, rgba(120,120,120,0.3) 50%, rgba(80,80,80,0.5) 65%, rgba(50,50,50,0.6) 80%, rgba(30,30,30,0.4) 100%)",
              filter: "blur(60px)",
            }}
          />

          {/* Dark gradient ring layer */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[180vh] w-[180vh] rounded-full md:h-[210vh] md:w-[210vh]"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(220,220,220,0.4) 25%, rgba(160,160,160,0.4) 45%, rgba(100,100,100,0.5) 60%, rgba(60,60,60,0.4) 80%, transparent 100%)",
              filter: "blur(50px)",
            }}
          />

          {/* Mid gaussian layer with gradient */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[150vh] w-[150vh] rounded-full md:h-[180vh] md:w-[180vh]"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(240,240,240,0.5) 30%, rgba(180,180,180,0.4) 55%, rgba(120,120,120,0.3) 75%, transparent 90%)",
              filter: "blur(40px)",
            }}
          />

          {/* The Main Glow Ring Shape */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120vh] w-[120vh] rounded-full border-[4px] border-white/60 bg-transparent md:h-[150vh] md:w-[150vh]"
            style={{
              boxShadow:
                "0 0 120px 50px rgba(255, 255, 255, 0.7), 0 0 250px 100px rgba(255, 255, 255, 0.4), 0 0 400px 150px rgba(200, 200, 200, 0.2), inset 0 0 100px 40px rgba(255, 255, 255, 0.6), inset 0 0 200px 80px rgba(255, 255, 255, 0.3)",
            }}
          />

          {/* Secondary ring for depth */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[135vh] w-[135vh] rounded-full border-[2px] border-white/30 md:h-[165vh] md:w-[165vh]"
            style={{
              boxShadow: "0 0 80px 35px rgba(255, 255, 255, 0.35), 0 0 150px 60px rgba(200, 200, 200, 0.2), inset 0 0 60px 25px rgba(255, 255, 255, 0.25)",
              filter: "blur(6px)",
            }}
          />
          
          {/* Inner bright core glow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[75vh] w-[75vh] rounded-full bg-white opacity-40"
            style={{ filter: "blur(100px)" }}
          />
        </div>

        {/* SECTION 2: ABOUT */}
        <section id="about" className="relative flex h-[100vh] w-full items-start justify-center">
          
          {/* Bottom fade gradient - blends dome into background */}
          <div 
            className="absolute bottom-0 left-0 w-full h-[50vh] z-10"
            style={{
              background: "linear-gradient(to top, #d0d0d0 0%, #d0d0d0 20%, transparent 100%)",
            }}
          />
          
          {/* Corner shadow gradients */}
          <div 
            className="absolute bottom-0 left-0 h-[60vh] w-[45vw] z-20"
            style={{
              background: "radial-gradient(ellipse at bottom left, rgba(60,60,60,0.6) 0%, rgba(90,90,90,0.4) 25%, rgba(120,120,120,0.2) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />
          <div 
            className="absolute bottom-0 right-0 h-[60vh] w-[45vw] z-20"
            style={{
              background: "radial-gradient(ellipse at bottom right, rgba(60,60,60,0.6) 0%, rgba(90,90,90,0.4) 25%, rgba(120,120,120,0.2) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />
        </section>
      </div>
    </div>
  );
}
