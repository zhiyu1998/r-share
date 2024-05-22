import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "R-Share",
	description:
		"使用 Next.js 搭建的 R-plugin 解析纯享功能，包含：哔哩哔哩、抖音、小红书、AcFun等",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<Header />
				<main>{children}</main>
			</body>
		</html>
	);
}
