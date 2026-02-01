"use client";

import { useState } from "react";
import Link from "next/link";

type LearningStyle = "verbal" | "audio" | null;
type TextFormat = "bullet" | "paragraph" | "mixed";
type JargonLevel = "none" | "some" | "technical";
type Background = "student" | "professional" | "hobbyist" | "researcher" | "other";

interface SurveyData {
  learningStyle: LearningStyle;
  // Verbal-specific
  textFormat?: TextFormat;
  jargonLevel?: JargonLevel;
  interests?: string[];
  customInterests?: string;
  // Audio-specific
  podcastLength?: "short" | "medium" | "long";
  podcastStyle?: "conversational" | "educational" | "storytelling";
  // Background
  background?: Background;
  backgroundDetails?: string;
  // Extra notes
  extraNotes?: string;
}

const interestOptions = [
  "Sports", "Music", "Cooking", "Gaming", "Nature",
  "Movies", "Technology", "Art", "Travel", "Fitness",
  "History", "Science", "Business", "Philosophy"
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [surveyComplete, setSurveyComplete] = useState(false);
  const [data, setData] = useState<SurveyData>({
    learningStyle: null,
    interests: [],
  });

  const totalSteps = data.learningStyle === "verbal" ? 6 : data.learningStyle === "audio" ? 5 : 2;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Final step - save to localStorage and show setup instructions
      console.log("=== ONBOARDING SURVEY RESULTS ===");
      console.log(JSON.stringify(data, null, 2));
      localStorage.setItem('learnspace_preferences', JSON.stringify(data));
      setSurveyComplete(true);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.learningStyle !== null;
      case 2: 
        if (data.learningStyle === "verbal") return data.textFormat !== undefined;
        if (data.learningStyle === "audio") return data.podcastLength !== undefined;
        return false;
      case 3:
        if (data.learningStyle === "verbal") return data.jargonLevel !== undefined;
        if (data.learningStyle === "audio") return data.podcastStyle !== undefined;
        return false;
      case 4:
        if (data.learningStyle === "verbal") return (data.interests?.length || 0) > 0;
        if (data.learningStyle === "audio") return data.background !== undefined;
        return false;
      case 5:
        if (data.learningStyle === "verbal") return data.background !== undefined;
        if (data.learningStyle === "audio") return true; // Extra notes is optional
        return false;
      case 6:
        return true; // Extra notes is optional for verbal
      default: return true;
    }
  };

  const toggleInterest = (interest: string) => {
    const current = data.interests || [];
    if (current.includes(interest)) {
      setData({ ...data, interests: current.filter(i => i !== interest) });
    } else {
      setData({ ...data, interests: [...current, interest] });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#d0d0d0]">
      {/* NOISE TEXTURE OVERLAY - Optimized single layer */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.4] mix-blend-overlay">
        <svg className="h-full w-full">
          <filter id="noiseFilterOnboard">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.2"
              numOctaves="3"
              seed="20"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilterOnboard)" />
        </svg>
      </div>

      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Center radial glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vh] h-[150vh] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 30%, transparent 60%)",
            filter: "blur(60px)",
          }}
        />
        {/* Top corner shadows */}
        <div 
          className="absolute top-0 left-0 h-[50vh] w-[40vw]"
          style={{
            background: "radial-gradient(ellipse at top left, rgba(40,40,40,0.5) 0%, rgba(60,60,60,0.3) 30%, transparent 60%)",
            filter: "blur(50px)",
          }}
        />
        <div 
          className="absolute top-0 right-0 h-[50vh] w-[40vw]"
          style={{
            background: "radial-gradient(ellipse at top right, rgba(40,40,40,0.5) 0%, rgba(60,60,60,0.3) 30%, transparent 60%)",
            filter: "blur(50px)",
          }}
        />
        {/* Bottom corner shadows */}
        <div 
          className="absolute bottom-0 left-0 h-[50vh] w-[40vw]"
          style={{
            background: "radial-gradient(ellipse at bottom left, rgba(40,40,40,0.4) 0%, rgba(60,60,60,0.2) 30%, transparent 60%)",
            filter: "blur(50px)",
          }}
        />
        <div 
          className="absolute bottom-0 right-0 h-[50vh] w-[40vw]"
          style={{
            background: "radial-gradient(ellipse at bottom right, rgba(40,40,40,0.4) 0%, rgba(60,60,60,0.2) 30%, transparent 60%)",
            filter: "blur(50px)",
          }}
        />
        {/* Subtle orange accent glow */}
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80vh] h-[80vh] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(224,120,80,0.15) 0%, rgba(224,120,80,0.05) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-30 flex items-center justify-between px-8 md:px-16 py-6">
        <Link 
          href="/"
          className="text-neutral-900/80 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight"
        >
          Learnspace<span style={{ color: "#e07850" }}>.</span>
        </Link>
        <div className="text-neutral-900/60 text-sm font-[family-name:var(--font-body)]">
          {surveyComplete ? "Setup" : `Step ${step} of ${totalSteps}`}
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-30 px-8 md:px-16">
        <div className="h-1 bg-neutral-300 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-500 ease-out"
            style={{ 
              width: surveyComplete ? "100%" : `${(step / totalSteps) * 100}%`,
              backgroundColor: "#e07850" 
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-30 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-8 py-12">
        
        {/* Survey Complete - Setup Instructions */}
        {surveyComplete && (
          <div className="max-w-3xl w-full text-center">
            <div className="mb-8">
              <span className="text-5xl" style={{ color: "#e07850" }}>✓</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
              Thanks for completing the survey<span style={{ color: "#e07850" }}>!</span>
            </h1>
            <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
              Let&apos;s get your Learnspace set up.
            </p>

            {/* Setup Steps */}
            <div className="space-y-6 text-left max-w-xl mx-auto">
              {/* Step 1 */}
              <div className="flex gap-4 items-start p-5 bg-white/40 backdrop-blur-sm rounded-sm">
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold font-[family-name:var(--font-display)]"
                  style={{ backgroundColor: "#e07850" }}
                >
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                    Download the Extension
                  </h3>
                  <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm">
                    Install the &quot;Learnspace&quot; extension from the Chrome Web Store.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start p-5 bg-white/40 backdrop-blur-sm rounded-sm">
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold font-[family-name:var(--font-display)]"
                  style={{ backgroundColor: "#e07850" }}
                >
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                    Create a Bookmark Folder
                  </h3>
                  <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm">
                    In your Bookmarks Bar, create a folder called <span className="font-semibold text-neutral-900/80">&quot;Learnspace&quot;</span> or <span className="font-semibold text-neutral-900/80">&quot;learnspace&quot;</span>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start p-5 bg-white/40 backdrop-blur-sm rounded-sm">
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold font-[family-name:var(--font-display)]"
                  style={{ backgroundColor: "#e07850" }}
                >
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                    Bookmark What Interests You
                  </h3>
                  <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm">
                    Whenever you see something interesting or want to learn more about, bookmark it to your Learnspace folder.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 items-start p-5 bg-white/40 backdrop-blur-sm rounded-sm">
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold font-[family-name:var(--font-display)]"
                  style={{ backgroundColor: "#e07850" }}
                >
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                    Sync Your Bookmarks
                  </h3>
                  <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm">
                    Head to your Learnspace dashboard and click &quot;Refresh bookmarks&quot; to import your saved links.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4 items-start p-5 bg-white/40 backdrop-blur-sm rounded-sm">
                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold font-[family-name:var(--font-display)]"
                  style={{ backgroundColor: "#e07850" }}
                >
                  5
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                    Watch the Magic Happen
                  </h3>
                  <p className="text-neutral-900/60 font-[family-name:var(--font-body)] text-sm">
                    Learnspace will automatically cluster related links, extract key concepts, and generate personalized learning content tailored to your style — whether that&apos;s concise bullet points, in-depth explanations, or even audio summaries.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-12">
              <Link
                href="/me"
                className="inline-block px-10 py-4 text-white text-sm tracking-[0.15em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 hover:brightness-110"
                style={{ backgroundColor: "#e07850" }}
              >
                Go to My Learnspace →
              </Link>
            </div>
          </div>
        )}

        {/* Survey Steps */}
        {!surveyComplete && (
        <div className="max-w-2xl w-full">
          
          {/* Step 1: Learning Style */}
          {step === 1 && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                How do you learn best<span style={{ color: "#e07850" }}>?</span>
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                Choose your preferred learning style so we can personalize your experience.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setData({ ...data, learningStyle: "verbal" })}
                  className={`p-8 rounded-sm transition-all duration-300 text-left group ${
                    data.learningStyle === "verbal" 
                      ? "bg-white/80" 
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  style={{ 
                    boxShadow: data.learningStyle === "verbal" 
                      ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                      : "none" 
                  }}
                >
                  <h3 className="text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                    Verbal / Text
                  </h3>
                  <p className="text-neutral-900/60 text-sm font-[family-name:var(--font-body)]">
                    Written content tailored to your reading preferences, with customizable formatting and terminology.
                  </p>
                </button>

                <button
                  onClick={() => setData({ ...data, learningStyle: "audio" })}
                  className={`p-8 rounded-sm transition-all duration-300 text-left group ${
                    data.learningStyle === "audio" 
                      ? "bg-white/80" 
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  style={{ 
                    boxShadow: data.learningStyle === "audio" 
                      ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                      : "none" 
                  }}
                >
                  <h3 className="text-xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-2">
                    Audio / Podcast
                  </h3>
                  <p className="text-neutral-900/60 text-sm font-[family-name:var(--font-body)]">
                    Generated podcasts that explain concepts through engaging audio content you can listen anywhere.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Format preferences */}
          {step === 2 && data.learningStyle === "verbal" && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                How do you prefer your content<span style={{ color: "#e07850" }}>?</span>
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                Choose your preferred text format for learning materials.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "bullet" as TextFormat, label: "Bullet Points", desc: "Concise, scannable lists" },
                  { id: "paragraph" as TextFormat, label: "Paragraphs", desc: "Detailed, flowing prose" },
                  { id: "mixed" as TextFormat, label: "Mixed", desc: "Best of both worlds" },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setData({ ...data, textFormat: option.id })}
                    className={`p-6 rounded-sm transition-all duration-300 ${
                      data.textFormat === option.id 
                        ? "bg-white/80" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    style={{ 
                      boxShadow: data.textFormat === option.id 
                        ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                        : "none" 
                    }}
                  >
                    <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                      {option.label}
                    </h3>
                    <p className="text-neutral-900/60 text-sm font-[family-name:var(--font-body)]">
                      {option.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && data.learningStyle === "audio" && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                How long should episodes be<span style={{ color: "#e07850" }}>?</span>
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                Choose your ideal podcast episode length.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "short" as const, label: "Short", desc: "1 minute" },
                  { id: "medium" as const, label: "Medium", desc: "3 minutes" },
                  { id: "long" as const, label: "Long", desc: "5 minutes" },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setData({ ...data, podcastLength: option.id })}
                    className={`p-6 rounded-sm transition-all duration-300 ${
                      data.podcastLength === option.id 
                        ? "bg-white/80" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    style={{ 
                      boxShadow: data.podcastLength === option.id 
                        ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                        : "none" 
                    }}
                  >
                    <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                      {option.label}
                    </h3>
                    <p className="text-neutral-900/60 text-sm font-[family-name:var(--font-body)]">
                      {option.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Jargon level (verbal) or Podcast style (audio) */}
          {step === 3 && data.learningStyle === "verbal" && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                Technical terminology<span style={{ color: "#e07850" }}>?</span>
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                How much jargon and technical language should we use?
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "none" as JargonLevel, label: "Keep it Simple", desc: "Plain language, everyday terms" },
                  { id: "some" as JargonLevel, label: "Some Jargon", desc: "Key terms with explanations" },
                  { id: "technical" as JargonLevel, label: "Technical", desc: "Industry-standard terminology" },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setData({ ...data, jargonLevel: option.id })}
                    className={`p-6 rounded-sm transition-all duration-300 ${
                      data.jargonLevel === option.id 
                        ? "bg-white/80" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    style={{ 
                      boxShadow: data.jargonLevel === option.id 
                        ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                        : "none" 
                    }}
                  >
                    <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                      {option.label}
                    </h3>
                    <p className="text-neutral-900/60 text-sm font-[family-name:var(--font-body)]">
                      {option.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && data.learningStyle === "audio" && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                What podcast style<span style={{ color: "#e07850" }}>?</span>
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                Choose the tone and style of your generated podcasts.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "conversational" as const, label: "Conversational", desc: "Casual, like chatting with a friend" },
                  { id: "educational" as const, label: "Educational", desc: "Structured, informative delivery" },
                  { id: "storytelling" as const, label: "Storytelling", desc: "Narrative-driven, engaging tales" },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setData({ ...data, podcastStyle: option.id })}
                    className={`p-6 rounded-sm transition-all duration-300 ${
                      data.podcastStyle === option.id 
                        ? "bg-white/80" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    style={{ 
                      boxShadow: data.podcastStyle === option.id 
                        ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                        : "none" 
                    }}
                  >
                    <h3 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-1">
                      {option.label}
                    </h3>
                    <p className="text-neutral-900/60 text-sm font-[family-name:var(--font-body)]">
                      {option.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Interests (verbal) or Background (audio) */}
          {step === 4 && data.learningStyle === "verbal" && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                What are your interests<span style={{ color: "#e07850" }}>?</span>
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                We&apos;ll use these for analogies and examples. Select all that apply.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {interestOptions.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-sm text-sm font-[family-name:var(--font-body)] transition-all duration-300 ${
                      data.interests?.includes(interest)
                        ? "text-white"
                        : "bg-white/40 text-neutral-900/70 hover:bg-white/60"
                    }`}
                    style={{ 
                      backgroundColor: data.interests?.includes(interest) ? "#e07850" : undefined 
                    }}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Other interests (comma separated)"
                value={data.customInterests || ""}
                onChange={(e) => setData({ ...data, customInterests: e.target.value })}
                className="w-full max-w-md px-4 py-3 bg-white/60 border-2 border-transparent focus:border-[#e07850] outline-none rounded-sm text-neutral-900 font-[family-name:var(--font-body)] placeholder:text-neutral-500"
              />
            </div>
          )}

          {step === 4 && data.learningStyle === "audio" && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                Tell us about yourself
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                This helps us tailor content to your level and context.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { id: "student" as Background, label: "Student" },
                  { id: "professional" as Background, label: "Professional" },
                  { id: "hobbyist" as Background, label: "Hobbyist" },
                  { id: "researcher" as Background, label: "Researcher" },
                  { id: "other" as Background, label: "Other" },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setData({ ...data, background: option.id })}
                    className={`p-4 rounded-sm transition-all duration-300 ${
                      data.background === option.id 
                        ? "bg-white/80" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    style={{ 
                      boxShadow: data.background === option.id 
                        ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                        : "none" 
                    }}
                  >
                    <span className="text-neutral-900/85 font-[family-name:var(--font-display)]">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Tell us more (e.g., CS major, marketing manager)"
                value={data.backgroundDetails || ""}
                onChange={(e) => setData({ ...data, backgroundDetails: e.target.value })}
                className="w-full max-w-md px-4 py-3 bg-white/60 border-2 border-transparent focus:border-[#e07850] outline-none rounded-sm text-neutral-900 font-[family-name:var(--font-body)] placeholder:text-neutral-500"
              />
            </div>
          )}

          {/* Step 5: Background (verbal only) */}
          {step === 5 && data.learningStyle === "verbal" && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                Tell us about yourself
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                This helps us tailor content to your level and context.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { id: "student" as Background, label: "Student" },
                  { id: "professional" as Background, label: "Professional" },
                  { id: "hobbyist" as Background, label: "Hobbyist" },
                  { id: "researcher" as Background, label: "Researcher" },
                  { id: "other" as Background, label: "Other" },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setData({ ...data, background: option.id })}
                    className={`p-4 rounded-sm transition-all duration-300 ${
                      data.background === option.id 
                        ? "bg-white/80" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    style={{ 
                      boxShadow: data.background === option.id 
                        ? "0 0 0 2px rgba(224,120,80,0.3), 0 0 20px rgba(224,120,80,0.2), 0 0 40px rgba(224,120,80,0.1)" 
                        : "none" 
                    }}
                  >
                    <span className="text-neutral-900/85 font-[family-name:var(--font-display)]">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Tell us more (e.g., CS major, marketing manager)"
                value={data.backgroundDetails || ""}
                onChange={(e) => setData({ ...data, backgroundDetails: e.target.value })}
                className="w-full max-w-md px-4 py-3 bg-white/60 border-2 border-transparent focus:border-[#e07850] outline-none rounded-sm text-neutral-900 font-[family-name:var(--font-body)] placeholder:text-neutral-500"
              />
            </div>
          )}

          {/* Step 5: Extra notes (audio) / Step 6: Extra notes (verbal) */}
          {((step === 5 && data.learningStyle === "audio") || (step === 6 && data.learningStyle === "verbal")) && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)] mb-4">
                Anything else<span style={{ color: "#e07850" }}>?</span>
              </h1>
              <p className="text-neutral-900/60 text-lg font-[family-name:var(--font-body)] mb-12">
                Any extra notes or preferences about your learning style that we should know?
              </p>
              
              <textarea
                placeholder="e.g., I learn best with real-world examples, I prefer shorter explanations, I'm a visual thinker..."
                value={data.extraNotes || ""}
                onChange={(e) => setData({ ...data, extraNotes: e.target.value })}
                rows={5}
                className="w-full max-w-lg px-4 py-3 bg-white/60 border-2 border-transparent focus:border-[#e07850] outline-none rounded-sm text-neutral-900 font-[family-name:var(--font-body)] placeholder:text-neutral-500 resize-none"
              />
              
              <p className="text-neutral-900/40 text-sm font-[family-name:var(--font-body)] mt-4">
                This is optional — feel free to skip if you&apos;re ready to go!
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-12">
            <button
              onClick={handleBack}
              className={`px-6 py-3 text-neutral-700 text-sm tracking-[0.1em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 ${
                step === 1 ? "opacity-0 pointer-events-none" : "hover:text-neutral-900"
              }`}
            >
              ← Back
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`px-8 py-3 text-white text-sm tracking-[0.15em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 ${
                canProceed() 
                  ? "hover:brightness-110" 
                  : "opacity-50 cursor-not-allowed"
              }`}
              style={{ backgroundColor: "#e07850" }}
            >
              {step === totalSteps ? "Complete" : "Continue →"}
            </button>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
