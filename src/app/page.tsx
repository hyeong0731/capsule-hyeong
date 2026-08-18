import type { Metadata } from "next";
import HomeAuth from "@/components/HomeAuth";
import { SITE, openGraphBase } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — ${SITE.tagline}` },
  description: SITE.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    ...openGraphBase,
    url: "/",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export default function Home() {
  return <HomeAuth />;
}
