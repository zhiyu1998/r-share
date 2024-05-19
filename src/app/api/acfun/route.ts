import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdirIfNotExists } from "@/lib/file";
import {
	downloadM3u8Videos,
	mergeAcFileToMp4,
	parseM3u8,
	parseUrl,
} from "@/app/api/acfun/acfun";
import logger from "@/lib/logger";
import { ApiResponse } from "@/types/common";

// Next.js下bili请求的data文件夹
const dataFolderPath = path.join(process.cwd(), "public", "data", "acfun");

export async function GET(req: NextRequest, resp: NextResponse) {
	let url = req.nextUrl.searchParams.get("url");
	if (url == null) {
		return NextResponse.json({ data: "url is null" });
	}
	await mkdirIfNotExists(dataFolderPath);

	let inputMsg = url.trim();
	// 适配手机分享：https://m.acfun.cn/v/?ac=32838812&sid=d2b0991bd6ad9c09
	if (inputMsg.includes("m.acfun.cn")) {
		inputMsg = `https://www.acfun.cn/v/ac${/ac=([^&?]*)/.exec(inputMsg)?.[1]}`;
	}
	// 初始化
	let videoInfo: { urlM3u8s: string[]; videoName: string } = {
		urlM3u8s: [],
		videoName: "",
	};
	// 下载
	await parseUrl(inputMsg).then((res) => {
		videoInfo = res;
		logger.info(`识别：猴山，${res.videoName}`);
		parseM3u8(res.urlM3u8s[res.urlM3u8s.length - 1]).then((res2) => {
			downloadM3u8Videos(res2.m3u8FullUrls, dataFolderPath).then((_) => {
				mergeAcFileToMp4(
					res2.tsNames,
					dataFolderPath,
					`${dataFolderPath}/out.mp4`,
				).then((_) => {
					logger.info(`猴山下载完成，${dataFolderPath}/out.mp4`);
				});
			});
		});
	});

	return NextResponse.json({
		data: {
			url: `${dataFolderPath}/out.mp4`,
			title: videoInfo?.videoName,
		},
	} as ApiResponse);
}
