/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 800);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    // Set initial values
    handleScroll();
    handleResize();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Phase calculations based on scroll position
  // Phase 1: Hero (0 to 100vh) - circle at starting position, slight collapse
  // Phase 2: Moving to About center (100vh to 150vh) - circle moves down and blooms orange
  // Phase 3: About center to Features (150vh to 200vh) - circle stays, then collapses
  
  const heroEnd = windowHeight; // 100vh
  const aboutCenter = windowHeight * 1.5; // 150vh  
  const featuresStart = windowHeight * 2; // 200vh
  
  // Phase 1: Initial collapse during hero scroll (0 to 100vh)
  const phase1Progress = windowHeight > 0 ? Math.min(scrollY / heroEnd, 1) : 0;
  
  // Phase 2: Bloom during about scroll (100vh to 150vh)
  const phase2Progress = windowHeight > 0 ? Math.max(0, Math.min((scrollY - heroEnd) / (aboutCenter - heroEnd), 1)) : 0;
  
  // Phase 3: Final collapse before features (150vh to 200vh)
  const phase3Progress = windowHeight > 0 ? Math.max(0, Math.min((scrollY - aboutCenter) / (featuresStart - aboutCenter), 1)) : 0;
  
  // Circle Y position - moves down until about center, then stops
  const maxCircleY = windowHeight * 0.5; // Stop at center of about (150vh screen position = 50vh movement)
  const circleY = Math.min(scrollY * 0.5, maxCircleY);
  
  // Circle scale calculation
  let circleScale = 1;
  if (phase1Progress < 1) {
    // Phase 1: Slight collapse from 1 to 0.8
    circleScale = 1 - (phase1Progress * 0.2);
  } else if (phase2Progress < 1) {
    // Phase 2: Bloom from 0.8 to 1.2
    circleScale = 0.8 + (phase2Progress * 0.4);
  } else {
    // Phase 3: Collapse from 1.2 to 0.3
    circleScale = 1.2 - (phase3Progress * 0.9);
  }
  
  // Orange bloom effect (starts fading in during phase 1, peaks in phase 2)
  const orangeOpacity = phase1Progress > 0.3 
    ? Math.min((phase1Progress - 0.3) * 1.4 + phase2Progress * 0.5, 1) * (1 - phase3Progress * 0.5) 
    : 0;
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

      {/* Fixed bouncing scroll chevron - navigates between sections */}
      <a 
        href="#"
        className="fixed bottom-8 left-1/2 z-[60] cursor-pointer bounce-slow"
        aria-label={scrollY > windowHeight * 1.8 ? "Scroll to top" : "Scroll to next section"}
        onClick={(e) => {
          e.preventDefault();
          if (scrollY > windowHeight * 1.8) {
            // At bottom (Features section) - go to top
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else if (scrollY > windowHeight * 0.8) {
            // In About section - go to Features
            document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
          } else {
            // In Hero - go to About
            document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        <svg 
          width="36" 
          height="36" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#e07850" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transform: scrollY > windowHeight * 1.8 ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease-out",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </a>

      {/* FULL PAGE CONTAINER - allows circle to flow across sections */}
      <div className="relative min-h-[300vh]">
        
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
              background: "radial-gradient(ellipse at top left, rgba(30,30,30,0.7) 0%, rgba(50,50,50,0.5) 25%, rgba(80,80,80,0.3) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />
          <div 
            className="absolute top-0 right-0 h-[60vh] w-[45vw] z-20"
            style={{
              background: "radial-gradient(ellipse at top right, rgba(30,30,30,0.7) 0%, rgba(50,50,50,0.5) 25%, rgba(80,80,80,0.3) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />



          {/* ===== TRADITIONAL TOP NAVBAR ===== */}
          <nav className="absolute top-[41px] left-0 right-0 z-30 flex items-center justify-center px-8 md:px-12 font-[family-name:var(--font-body)] fade-in delay-300">
            {/* Centered nav links */}
            <div className="flex justify-center gap-12 md:gap-16">
              <a 
                href="#"
                className="relative text-neutral-900/70 text-sm md:text-base font-normal tracking-[0.2em] uppercase hover:text-neutral-900 transition-all duration-300 group"
              >
                home
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{ backgroundColor: "#e07850" }} />
              </a>
              <a 
                href="#about"
                className="relative text-neutral-900/70 text-sm md:text-base font-normal tracking-[0.2em] uppercase hover:text-neutral-900 transition-all duration-300 group"
              >
                about
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{ backgroundColor: "#e07850" }} />
              </a>
              <a 
                href="#features"
                className="relative text-neutral-900/70 text-sm md:text-base font-normal tracking-[0.2em] uppercase hover:text-neutral-900 transition-all duration-300 group"
              >
                features
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-300" style={{ backgroundColor: "#e07850" }} />
              </a>
            </div>
          </nav>


          {/* Large asymmetrical translucent logo - fade out on scroll */}
          <div 
            className="absolute top-[60%] -translate-y-1/2 left-[1vw] z-10 pointer-events-none"
            style={{
              opacity: 0.1 * (1 - phase1Progress),
            }}
          >
            <img
              src="/learnspacelogo.svg"
              alt=""
              className="w-[70vw] h-[70vw] md:w-[55vw] md:h-[55vw]"
              style={{
                transform: "rotate(12deg)",
                filter: "sepia(100%) saturate(300%) hue-rotate(-10deg) brightness(0.9)",
              }}
            />
          </div>

          {/* Hero Content Container */}
          <div className="absolute bottom-[12vh] left-0 right-0 z-30 flex flex-col items-center justify-center gap-6">
            {/* Hero Title */}
            <h1 
              className="text-[14vw] md:text-[12vw] text-neutral-900/85 tracking-tighter text-center font-semibold font-[family-name:var(--font-display)] leading-[0.85] -translate-y-[50px] fade-in-up delay-100"
            >
              Learnspace<span style={{ color: "#e07850" }}>.</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-center text-neutral-900/70 text-base md:text-lg font-[family-name:var(--font-body)] tracking-[0.25em] uppercase whitespace-nowrap -translate-y-[25px] fade-in-up delay-300">
              Turn casual browsing into structured personal enrichment
            </p>
            
            {/* CTA Button */}
            <div className="mt-4 -translate-y-[15px] fade-in-up delay-500">
              <a 
                href="/onboarding"
                className="px-10 py-4 text-white text-base md:text-lg tracking-[0.15em] uppercase hover:brightness-110 transition-all duration-300"
                style={{ backgroundColor: "#e07850" }}
              >
                Get Started
              </a>
            </div>
          </div>

        </section>

        {/* ===== THE SINGLE CIRCLE - positioned between sections with scroll animation ===== */}
        <div 
          className="fixed left-1/2 z-0 fade-in-scale delay-100 pointer-events-none"
          style={{
            top: `calc(100vh - ${circleY}px)`,
            transform: `translate(-50%, -50%) scale(${circleScale})`,
            transition: "top 0.05s linear, transform 0.05s linear",
          }}
        >
          
          {/* Outermost dark ring - gets darker at edges */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[210vh] w-[210vh] rounded-full md:h-[240vh] md:w-[240vh] breathe"
            style={{
              background: "radial-gradient(circle, transparent 0%, transparent 30%, rgba(90,90,90,0.4) 45%, rgba(50,50,50,0.6) 60%, rgba(30,30,30,0.7) 75%, rgba(20,20,20,0.5) 100%)",
            }}
          />

          {/* Dark gradient ring layer */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[180vh] w-[180vh] rounded-full md:h-[210vh] md:w-[210vh] breathe-slow"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(250,250,250,0.5) 20%, rgba(200,200,200,0.4) 40%, rgba(80,80,80,0.5) 60%, rgba(40,40,40,0.5) 80%, transparent 100%)",
            }}
          />

          {/* Mid gaussian layer with gradient */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[150vh] w-[150vh] rounded-full md:h-[180vh] md:w-[180vh] breathe-mid"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 25%, rgba(220,220,220,0.5) 45%, rgba(100,100,100,0.4) 70%, transparent 90%)",
            }}
          />

          {/* The Main Glow Ring Shape */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120vh] w-[120vh] rounded-full border-[4px] border-white/80 bg-transparent md:h-[150vh] md:w-[150vh] breathe-ring"
            style={{
              boxShadow:
                "0 0 120px 50px rgba(255, 255, 255, 0.9), 0 0 250px 100px rgba(255, 255, 255, 0.5), 0 0 400px 150px rgba(220, 220, 220, 0.3), inset 0 0 100px 40px rgba(255, 255, 255, 0.8), inset 0 0 200px 80px rgba(255, 255, 255, 0.4)",
            }}
          />

          {/* Secondary ring for depth */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[135vh] w-[135vh] rounded-full border-[2px] border-white/50 md:h-[165vh] md:w-[165vh] breathe-ring"
            style={{
              boxShadow: "0 0 80px 35px rgba(255, 255, 255, 0.5), 0 0 150px 60px rgba(240, 240, 240, 0.3), inset 0 0 60px 25px rgba(255, 255, 255, 0.4)",
              filter: "blur(6px)",
            }}
          />
          
          {/* Inner bright core glow - subtle warm tint */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[75vh] w-[75vh] rounded-full breathe-glow"
            style={{
              background: "radial-gradient(circle, rgba(255,248,245,0.95) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.8) 100%)"
            }}
          />

          {/* Orange bloom layer - appears on scroll */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[100vh] w-[100vh] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(224,120,80,0.6) 0%, rgba(224,120,80,0.3) 30%, rgba(224,120,80,0.1) 50%, transparent 70%)",
              opacity: orangeOpacity,
              filter: "blur(40px)",
              transition: "opacity 0.2s ease-out",
            }}
          />
        </div>

        {/* SECTION 2: ABOUT */}
        <section id="about" className="relative h-[100vh] w-full flex items-center justify-center">
          {/* Invisible spacer to ensure section has content in document flow */}
          <div className="h-full w-full absolute" aria-hidden="true" />
          
          {/* About Content */}
          <div className="relative z-30 max-w-4xl mx-auto px-8 text-center">
            <div className="flex flex-col items-center mb-8">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-neutral-900/80 font-[family-name:var(--font-display)] text-center whitespace-nowrap">
                Built for the future of <span className="relative inline-block pb-2">learning<span className="absolute bottom-0 left-0 w-full h-[3px]" style={{ backgroundColor: "#e07850" }} /></span>
              </h2>
            </div>
            <p className="text-lg md:text-xl text-neutral-900/60 font-[family-name:var(--font-body)] leading-relaxed mb-12">
              Learnspace combines cutting-edge technology with thoughtful design to create 
              immersive educational experiences. Join thousands of learners and educators 
              who are reimagining what&apos;s possible.
            </p>
            
            {/* Feature grid */}
            <div className="grid grid-cols-3 gap-8 mt-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-900/10 flex items-center justify-center">
                  <span className="text-2xl">✦</span>
                </div>
                <span className="text-sm tracking-[0.2em] uppercase text-neutral-900/60">Interactive</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-900/10 flex items-center justify-center">
                  <span className="text-2xl">◈</span>
                </div>
                <span className="text-sm tracking-[0.2em] uppercase text-neutral-900/60">Collaborative</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-900/10 flex items-center justify-center">
                  <span className="text-2xl">❋</span>
                </div>
                <span className="text-sm tracking-[0.2em] uppercase text-neutral-900/60">Innovative</span>
              </div>
            </div>
          </div>
          
          {/* Transition gradient to features */}
          <div 
            className="absolute bottom-0 left-0 w-full h-[30vh] z-10"
            style={{
              background: "linear-gradient(to top, #d0d0d0 0%, transparent 100%)",
            }}
          />
        </section>

        {/* SECTION 3: FEATURES */}
        <section id="features" className="relative h-[100vh] w-full flex items-center justify-center py-12">
          {/* Background continuity */}
          <div className="absolute inset-0 bg-[#d0d0d0]" />
          
          {/* Subtle top gradient for seamless blend */}
          <div 
            className="absolute top-0 left-0 w-full h-[20vh] z-10"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, #d0d0d0 100%)",
            }}
          />

          {/* Features Content */}
          <div className="relative z-30 max-w-5xl mx-auto px-8">
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-4xl md:text-6xl font-semibold text-neutral-900/80 font-[family-name:var(--font-display)] text-center">
                Features
              </h2>
              <span className="mt-3 w-12 h-[3px]" style={{ backgroundColor: "#e07850" }} />
            </div>
            <p className="text-lg md:text-xl text-neutral-900/60 font-[family-name:var(--font-body)] leading-relaxed mb-8 text-center max-w-2xl mx-auto">
              Everything you need to transform your learning journey
            </p>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Feature 1 */}
              <div className="group p-4 md:p-6 bg-white/40 backdrop-blur-sm hover:bg-white/60 border-l-0 hover:border-l-4 transition-all duration-300" style={{ borderColor: "#e07850" }}>
                <div className="w-10 h-10 mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl" style={{ color: "#e07850" }}>
                  ◎
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                  Smart Organization
                </h3>
                <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm leading-relaxed">
                  Automatically categorize and connect your notes, ideas, and resources with intelligent tagging.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group p-4 md:p-6 bg-white/40 backdrop-blur-sm hover:bg-white/60 border-l-0 hover:border-l-4 transition-all duration-300" style={{ borderColor: "#e07850" }}>
                <div className="w-10 h-10 mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl" style={{ color: "#e07850" }}>
                  ⬡
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                  Visual Mapping
                </h3>
                <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm leading-relaxed">
                  See connections between concepts with beautiful, interactive knowledge graphs.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group p-4 md:p-6 bg-white/40 backdrop-blur-sm hover:bg-white/60 border-l-0 hover:border-l-4 transition-all duration-300" style={{ borderColor: "#e07850" }}>
                <div className="w-10 h-10 mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl" style={{ color: "#e07850" }}>
                  ◈
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                  Collaborative Spaces
                </h3>
                <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm leading-relaxed">
                  Share knowledge and build understanding together with real-time collaboration tools.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group p-4 md:p-6 bg-white/40 backdrop-blur-sm hover:bg-white/60 border-l-0 hover:border-l-4 transition-all duration-300" style={{ borderColor: "#e07850" }}>
                <div className="w-10 h-10 mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl" style={{ color: "#e07850" }}>
                  ✧
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                  AI-Powered Insights
                </h3>
                <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm leading-relaxed">
                  Get personalized suggestions and discover hidden patterns in your learning data.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group p-4 md:p-6 bg-white/40 backdrop-blur-sm hover:bg-white/60 border-l-0 hover:border-l-4 transition-all duration-300" style={{ borderColor: "#e07850" }}>
                <div className="w-10 h-10 mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl" style={{ color: "#e07850" }}>
                  ⊕
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                  Universal Import
                </h3>
                <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm leading-relaxed">
                  Bring in content from anywhere—PDFs, web clips, notes, and more—seamlessly.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group p-4 md:p-6 bg-white/40 backdrop-blur-sm hover:bg-white/60 border-l-0 hover:border-l-4 transition-all duration-300" style={{ borderColor: "#e07850" }}>
                <div className="w-10 h-10 mb-3 md:mb-4 flex items-center justify-center text-2xl md:text-3xl" style={{ color: "#e07850" }}>
                  ◇
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                  Focused Learning
                </h3>
                <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm leading-relaxed">
                  Distraction-free modes and spaced repetition help you retain what matters most.
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom fade gradient */}
          <div 
            className="absolute bottom-0 left-0 w-full h-[30vh] z-10"
            style={{
              background: "linear-gradient(to top, #d0d0d0 0%, #d0d0d0 30%, transparent 100%)",
            }}
          />
          
          {/* Corner shadow gradients */}
          <div 
            className="absolute bottom-0 left-0 h-[60vh] w-[45vw] z-20"
            style={{
              background: "radial-gradient(ellipse at bottom left, rgba(30,30,30,0.7) 0%, rgba(50,50,50,0.5) 25%, rgba(80,80,80,0.3) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />
          <div 
            className="absolute bottom-0 right-0 h-[60vh] w-[45vw] z-20"
            style={{
              background: "radial-gradient(ellipse at bottom right, rgba(30,30,30,0.7) 0%, rgba(50,50,50,0.5) 25%, rgba(80,80,80,0.3) 50%, transparent 75%)",
              filter: "blur(60px)",
            }}
          />
        </section>
      </div>
    </div>
  );
}
