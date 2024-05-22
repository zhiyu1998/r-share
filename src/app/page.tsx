import Image from "next/image";

export default function Home() {
	return (
		<div className="hero min-h-screen bg-base-200">
			<div className="hero-content flex-col lg:flex-row">
				<img src="https://github.com/zhiyu1998/r-share/raw/main/public/logo.webp" className="max-w-sm rounded-lg shadow-2xl" />
				<div>
					<h1 className="text-5xl font-bold">R-Share | R-plugin API</h1>
					<p className="py-6">使用 Next.js 搭建的 R-plugin 解析纯享功能，包含：哔哩哔哩、抖音、小红书、AcFun等</p>
					<button className="btn btn-primary w-1/2">开始使用</button>
				</div>
			</div>
		</div>
	);
}
