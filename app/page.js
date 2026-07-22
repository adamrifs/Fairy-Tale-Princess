"use client";

import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StoryLayout } from "@/components/story/StoryLayout";
import { AppLoader } from "@/components/loader/AppLoader";

// Section 1 is entirely canvas/GSAP-driven with zero SEO value in its
// pixel content and no reason to be part of the initial server-rendered
// payload — same reasoning as StoryProgress's dynamic import inside
// StoryLayout. ssr:false requires this module to be a Client Component,
// hence "use client" above (this page has no server-only work — metadata
// lives in app/layout.js).
const Section1 = dynamic(
  () => import("@/components/story/section1/Section1").then((mod) => mod.Section1),
  { ssr: false }
);

const Section2 = dynamic(
  () => import("@/components/story/section2/Section2").then((mod) => mod.Section2),
  { ssr: false }
);

const Section3 = dynamic(
  () => import("@/components/story/section3/Section3").then((mod) => mod.Section3),
  { ssr: false }
);

const Section4 = dynamic(
  () => import("@/components/story/section4/Section4").then((mod) => mod.Section4),
  { ssr: false }
);

export default function Home() {
  return (
    <PageWrapper>
      <AppLoader />
      <StoryLayout>
        <Section1 />
        <Section2 />
        <Section3 />
        <Section4 />
      </StoryLayout>
    </PageWrapper>
  );
}
