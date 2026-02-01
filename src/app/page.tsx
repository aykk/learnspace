/* eslint-disable @next/next/no-img-element */

export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-[#d0d0d0]">
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
      <div className="relative min-h-[200vh]">
        
        {/* SECTION 1: HERO */}
        <section className="relative flex h-[100vh] w-full items-end justify-center">
          
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

          {/* ===== TRADITIONAL TOP NAVBAR ===== */}
          <nav className="absolute top-[82px] left-0 right-0 z-30 flex items-center justify-between px-8 md:px-12 font-[family-name:var(--font-body)]">
            {/* Logo in top left */}
            <img
              src="/learnspacelogo.svg"
              alt="Learnspace Logo"
              className="w-10 h-10 md:w-12 md:h-12"
              style={{ 
                opacity: 0.8
              }}
            />
            
            {/* Centered nav links */}
            <div className="absolute left-1/2 -translate-x-1/2 flex justify-center gap-20 md:gap-32">
              <a 
                href="#"
                className="text-neutral-900/80 text-lg md:text-xl font-normal tracking-wide lowercase hover:text-neutral-900 transition-all duration-300"
              >
                home
              </a>
              <a 
                href="#about"
                className="text-neutral-900/80 text-lg md:text-xl font-normal tracking-wide lowercase hover:text-neutral-900 transition-all duration-300"
              >
                about
              </a>
              <a 
                href="#"
                className="text-neutral-900/80 text-lg md:text-xl font-normal tracking-wide lowercase hover:text-neutral-900 transition-all duration-300"
              >
                sign up
              </a>
              <a 
                href="#"
                className="text-neutral-900/80 text-lg md:text-xl font-normal tracking-wide lowercase hover:text-neutral-900 transition-all duration-300"
              >
                log in
              </a>
            </div>
            
            {/* Spacer for symmetry */}
            <div className="w-10 h-10 md:w-12 md:h-12" />
          </nav>
          
          {/* Hero Title */}
          <div className="absolute bottom-[2vh] left-0 right-0 z-30 flex items-center justify-center">
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[210vh] w-[210vh] rounded-full md:h-[240vh] md:w-[240vh] breathe"
            style={{
              background: "radial-gradient(circle, transparent 0%, transparent 35%, rgba(120,120,120,0.3) 50%, rgba(80,80,80,0.5) 65%, rgba(50,50,50,0.6) 80%, rgba(30,30,30,0.4) 100%)",
            }}
          />

          {/* Dark gradient ring layer */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[180vh] w-[180vh] rounded-full md:h-[210vh] md:w-[210vh] breathe-slow"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(220,220,220,0.4) 25%, rgba(160,160,160,0.4) 45%, rgba(100,100,100,0.5) 60%, rgba(60,60,60,0.4) 80%, transparent 100%)",
            }}
          />

          {/* Mid gaussian layer with gradient */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[150vh] w-[150vh] rounded-full md:h-[180vh] md:w-[180vh] breathe-mid"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(240,240,240,0.5) 30%, rgba(180,180,180,0.4) 55%, rgba(120,120,120,0.3) 75%, transparent 90%)",
            }}
          />

          {/* The Main Glow Ring Shape */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120vh] w-[120vh] rounded-full border-[4px] border-white/60 bg-transparent md:h-[150vh] md:w-[150vh] breathe-ring"
            style={{
              boxShadow:
                "0 0 120px 50px rgba(255, 255, 255, 0.7), 0 0 250px 100px rgba(255, 255, 255, 0.4), 0 0 400px 150px rgba(200, 200, 200, 0.2), inset 0 0 100px 40px rgba(255, 255, 255, 0.6), inset 0 0 200px 80px rgba(255, 255, 255, 0.3)",
            }}
          />

          {/* Secondary ring for depth */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[135vh] w-[135vh] rounded-full border-[2px] border-white/30 md:h-[165vh] md:w-[165vh] breathe-ring"
            style={{
              boxShadow: "0 0 80px 35px rgba(255, 255, 255, 0.35), 0 0 150px 60px rgba(200, 200, 200, 0.2), inset 0 0 60px 25px rgba(255, 255, 255, 0.25)",
              filter: "blur(6px)",
            }}
          />
          
          {/* Inner bright core glow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[75vh] w-[75vh] rounded-full bg-white breathe-glow"
          />
        </div>

        {/* SECTION 2: ABOUT */}
        <section id="about" className="relative h-[100vh] w-full">
          {/* Invisible spacer to ensure section has content in document flow */}
          <div className="h-full w-full" aria-hidden="true" />
          
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
