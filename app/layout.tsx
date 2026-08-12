import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "漫游策 · 对话式出行规划",
  description: "只做查询与规划：边聊边改、可追溯、可分享的智能行程规划体验。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
