import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { isEmpty } from "lodash";
import logger from "@/lib/logger";
import { douyinTypeMap, DY_INFO } from "@/constants/tiktok";
import * as xBogus from "@/app/api/douyin/x-bogus.cjs";
import path from "path";
import { downloadVideo } from "@/lib/file";
import { ApiResponse } from "@/types/common";

const dyCookie = process.env.DY_COOKIE || "";

const dataFolderPath = path.join(process.cwd(), "public", "data", "douyin");

export async function GET(req: NextRequest, resp: NextResponse) {
	let url = req.nextUrl.searchParams.get("url");
	if (url == null) {
		return NextResponse.json({ data: "url is null" });
	}
	const urlRex = /(http:|https:)\/\/v.douyin.com\/[A-Za-z\d._?%&+\-=\/#]*/g;
	const douUrl = urlRex.exec(url)?.[0];

	const data = await douyinRequest(douUrl!).then(async (res: any) => {
		// 当前版本需要填入cookie
		if (isEmpty(dyCookie)) {
			logger.error("检测到没有Cookie，无法解析抖音");
			return;
		}
		const douId =
			/note\/(\d+)/g.exec(res)?.[1] || /video\/(\d+)/g.exec(res)?.[1];
		// 以下是更新了很多次的抖音API历史，且用且珍惜
		// const url = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${ douId }`;
		// const url = `https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id=${ douId }&aid=1128&version_name=23.5.0&device_platform=android&os_version=2333`;
		// 感谢 Evil0ctal（https://github.com/Evil0ctal）提供的header 和 B1gM8c（https://github.com/B1gM8c）的逆向算法X-Bogus
		const headers = {
			"Accept-Language":
				"zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
			Referer: "https://www.douyin.com/",
			cookie: dyCookie,
		};
		const dyApi = DY_INFO.replace("{}", douId!);
		// xg参数
		const xbParam = xBogus.sign(
			new URLSearchParams(new URL(dyApi).search).toString(),
			headers["User-Agent"],
		);
		// const param = resp.data.result[0].paramsencode;
		const resDyApi = `${dyApi}&X-Bogus=${xbParam}`;
		headers["Referer"] = `https://www.douyin.com/video/${douId}`;
		return await axios
			.get(resDyApi, {
				headers,
			})
			.then(async (resp) => {
				// console.log(resp)
				if (isEmpty(await resp?.data)) {
					logger.error("解析失败，请重试！");
					return;
				}
				// console.log(await resp.data);
				const item = await resp.data.aweme_detail;
				logger.info(`识别：抖音, ${item.desc}`);
				const urlTypeCode = item.aweme_type;
				const urlType = douyinTypeMap[urlTypeCode];
				if (urlType === "video") {
					const resUrl = item.video.play_addr.url_list[0].replace(
						"http",
						"https",
					);
					const fileName = `${item.aweme_id}.mp4`;
					return {
						desc: item.desc,
						url: await downloadVideo(
							resUrl,
							dataFolderPath,
							fileName,
						),
						debug: resp.data.aweme_detail,
					};
				} else if (urlType === "image") {
					// 无水印图片列表
					let no_watermark_image_list = [];
					// 有水印图片列表
					let watermark_image_list = [];
					for (let i of item.images) {
						// 无水印图片列表
						no_watermark_image_list.push(i.url_list[0]);
						// 有水印图片列表
						watermark_image_list.push(i.download_url_list[0]);
					}
					return {
						desc: item.desc,
						no_watermark_image_list,
						watermark_image_list,
					};
					// console.log(no_watermark_image_list)
				}
			});
	});
	return NextResponse.json({
		data,
	} as ApiResponse);
}

/**
 * douyin 请求参数
 * @param url
 * @returns {Promise<string>}
 */
async function douyinRequest(url: string) {
	const params = {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.25 Mobile Safari/537.36",
		},
		timeout: 10000,
	};
	try {
		const resp = await axios.head(url, params);
		const location = resp.request.res.responseUrl;
		return location;
	} catch (error) {
		console.error(error);
		throw error;
	}
}
