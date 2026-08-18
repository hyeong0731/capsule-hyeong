import type { Metadata } from "next";
import CapsuleDetail from "@/components/CapsuleDetail";
import { SITE, openGraphBase } from "@/lib/site";

type CapsulePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CapsulePageProps): Promise<Metadata> {
  const { id } = await params;
  const title = "캡슐 열기";
  const description =
    "열람일에 편지와 사진을 다시 만나요. 개인 캡슐은 검색 결과에 노출되지 않습니다.";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    alternates: {
      canonical: `/capsule/${id}`,
    },
    openGraph: {
      ...openGraphBase,
      url: `/capsule/${id}`,
      title: `${title} | ${SITE.name}`,
      description,
    },
    twitter: {
      title: `${title} | ${SITE.name}`,
      description,
    },
  };
}

export default async function CapsulePage({ params }: CapsulePageProps) {
  const { id } = await params;
  return <CapsuleDetail id={id} />;
}
