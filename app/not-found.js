"use client";

import { useRouter } from "next/navigation";
import { FantasyCapsuleButton } from "@/components/loader/FantasyCapsuleButton";

export default function NotFound() {
  const router = useRouter();

  const handleReturn = () => {
    // Wait for a brief moment so the magical click burst can be seen
    // before the page route transitions!
    setTimeout(() => {
      router.push("/");
    }, 600);
  };

  return (
    <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-black text-moon-white">
      {/* Immersive Fairytale Background Image */}
      <img
        src="/assets/errorImage.png"
        alt="Missing Chapter Background"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />

      {/* Dark overlay for text contrast and cinematic feel */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Central Content Container matching StoryText styling */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10 animate-fade-in">
        <h2 className="text-balance font-display bg-gradient-to-b from-[#fffae6] via-[#ffd066] to-[#b8860b] bg-clip-text text-transparent text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] leading-[1.1] tracking-wide font-normal drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] py-2">
          Looks Like This Chapter Is Missing
        </h2>
        
        <p className="mt-6 mb-12 max-w-3xl text-balance font-serif italic text-xl md:text-2xl lg:text-3xl font-normal leading-[1.8] tracking-widest text-[#fffdf0] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] opacity-90">
          The story path you are searching for has faded into the mist.
        </p>

        <FantasyCapsuleButton onClick={handleReturn}>
          Return to Kingdom
        </FantasyCapsuleButton>
      </div>
    </main>
  );
}
