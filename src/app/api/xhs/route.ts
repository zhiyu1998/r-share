import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { XHS_NO_WATERMARK_HEADER, XHS_REQ_LINK } from "@/constants/xhs";
import logger from "@/lib/logger";
import { downloadVideo } from "@/lib/file";
import { ApiResponse } from "@/types/common";

const dataFolderPath = path.join(process.cwd(), "public", "data", "xhs");

export async function GET(req: NextRequest, resp: NextResponse) {
	// 正则说明：匹配手机链接、匹配小程序、匹配PC链接
	let url = req.nextUrl.searchParams.get("url");
	if (url == null) {
		return NextResponse.json({ data: "url is null" });
	}
	let msgUrl =
		/(http:|https:)\/\/(xhslink|xiaohongshu).com\/[A-Za-z\d._?%&+\-=\/#@]*/.exec(
			url,
		)?.[0] ||
		/(http:|https:)\/\/www\.xiaohongshu\.com\/discovery\/item\/(\w+)/.exec(
			url,
		)?.[0] ||
		/(http:|https:)\/\/www\.xiaohongshu\.com\/explore\/(\w+)/.exec(
			url,
		)?.[0];
	// 解析短号
	let id: string | number | undefined;
	if (msgUrl!.includes("xhslink")) {
		await fetch(msgUrl!, {
			redirect: "follow",
		}).then((resp) => {
			const uri = decodeURIComponent(resp.url);
			// 如果出现了网页验证uri:https://www.xiaohongshu.com/website-login/captcha?redirectPath=https://www.xiaohongshu.com/discovery/item/63c93ac3000000002203b28a?app_platform=android&app_version=8.23.1&author_share=1&ignoreEngage=true&share_from_user_hidden=true&type=normal&xhsshare=CopyLink&appuid=62c58b90000000000303dc54&apptime=1706149572&exSource=&verifyUuid=a5f32b62-453e-426b-98fe-2cfe0c16776d&verifyType=102&verifyBiz=461
			const verify = uri.match(/\/item\/([0-9a-fA-F]+)/);
			// 一般情况下不会出现问题就使用这个正则
			id = /explore\/(\w+)/.exec(uri)?.[1] ?? verify?.[1];
		});
	} else {
		id =
			/explore\/(\w+)/.exec(msgUrl!)?.[1] ||
			/discovery\/item\/(\w+)/.exec(msgUrl!)?.[1];
	}
	const downloadPath = dataFolderPath;
	// 获取信息
	const data = await fetch(`${XHS_REQ_LINK}${id}`, {
		headers: XHS_NO_WATERMARK_HEADER,
	}).then(async (resp) => {
		const xhsHtml = await resp.text();
		const reg = /window\.__INITIAL_STATE__=(.*?)<\/script>/;
		const res = xhsHtml.match(reg)?.[1].replace(/undefined/g, "null");
		const resJson = JSON.parse(res!);
		const noteData = resJson.note.noteDetailMap[id!].note;
		const { title, desc, type } = noteData;
		let imgPromise: Promise<any>[] = [];
		// 封面
		const cover = noteData.imageList?.[0].urlDefault;
		if (type === "video") {
			logger.info([cover, `识别：小红书, ${title}\n${desc}`]);
			// 构造xhs视频链接
			const xhsVideoUrl =
				noteData.video.media.stream.h264?.[0]?.masterUrl;
			// 下载视频
			const videoPath = await downloadVideo(
				xhsVideoUrl,
				downloadPath,
			).then((path) => {
				// if (path === undefined) {
				// 	// 创建文件，如果不存在
				// 	path = `${this.getCurDownloadPath(e)}/`;
				// }
				// this.sendVideoToUpload(e, `${path}/temp.mp4`);
			});
			return {
				title,
				desc,
				cover,
				url: videoPath,
			};
		} else if (type === "normal") {
			logger.info(`识别：小红书, ${title}\n${desc}`);
			const images = noteData.imageList.map(
				(item: any) => item.urlDefault,
			);

			return {
				title,
				desc,
				cover,
				images,
			};
		}
	});
	return NextResponse.json({
		data,
	} as ApiResponse);
}
