import type { Metadata } from "next";
import { openGraphBase } from "@/lib/site";

export const metadata: Metadata = {
  title: "캡슐 묻기",
  description:
    "받는 사람과 편지, 열람일을 담아 캡슐을 묻어요. 묻는 순간의 날씨로 그날의 한마디와 형태가 만들어집니다.",
  alternates: {
    canonical: "/new",
  },
  openGraph: {
    ...openGraphBase,
    url: "/new",
    title: "캡슐 묻기",
    description:
      "받는 사람과 편지, 열람일을 담아 캡슐을 묻어요. 묻는 순간의 날씨로 그날의 한마디와 형태가 만들어집니다.",
  },
};

export default function NewLayout({ children }: LayoutProps<"/new">) {
  return children;
}
