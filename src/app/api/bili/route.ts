import { NextRequest, NextResponse } from "next/server";
import { av2BV } from "@/app/api/bili/bilibili-bv-av-convert";
import { isEmpty } from "lodash";
import * as querystring from "querystring";
import {
	downBili,
	formatBiliInfo,
	getBiliAudio,
	getBiliVideoWithSession,
	getDownloadUrl,
	getDynamic,
	getVideoInfo,
	m4sToMp3,
} from "@/app/api/bili/bilibili";
import { secondsToTime, truncateString } from "@/lib/utils";
import { ApiResponse, StringOrNumber } from "@/types/common";
import axios from "axios";
import { BILI_SUMMARY } from "@/constants/bili";
import { getWbi } from "@/app/api/bili/biliWbi";
import logger from "@/lib/logger";
import path from "path";
import { mkdirIfNotExists } from "@/lib/file";

// bili cookie
const BILI_SESSDATA = process.env.BILI_SESSDATA || "";

// Next.js下bili请求的data文件夹
const dataFolderPath = path.join(process.cwd(), "public", "data", "bili");

export async function GET(req: NextRequest, resp: NextResponse) {
	let url = req.nextUrl.searchParams.get("url");
	if (url == null) {
		return NextResponse.json({ data: "url is null" });
	}
	const urlRex =
		/(?:https?:\/\/)?www\.bilibili\.com\/[A-Za-z\d._?%&+\-=\/#]*/g;
	const bShortRex = /(http:|https:)\/\/b23.tv\/[A-Za-z\d._?%&+\-=\/#]*/g;
	if (url.includes("b23.tv")) {
		const bShortUrl = bShortRex.exec(url)?.[0];
		await fetch(bShortUrl!, {
			method: "HEAD",
		}).then((resp) => {
			url = resp.url;
		});
	} else if (url.includes("www.bilibili.com")) {
		url = urlRex.exec(url)?.[0]!;
	}
	// 补充https
	url = url.startsWith("https://") ? url : "https://" + url;
	// av处理
	const matched = url.match(/\/(AV|av)(\w+)/);
	if (matched) {
		url = url.replace(
			matched[0].replace("/", ""),
			av2BV(Number(matched[2])),
		);
	}
	// 处理下载逻辑
	const action = req.nextUrl.searchParams.get("action");
	if (url !== undefined && action === "download") {
		// 检测是否扫码了，如果没有扫码数据终止下载
		if (isEmpty(BILI_SESSDATA)) {
			return NextResponse.json({
				err: "检测到没有填写biliSessData，下载终止！",
			});
		}
		const downloadUrl = await downloadBiliVideo(url, BILI_SESSDATA);
		return NextResponse.json({
			data: {
				type: "哔哩哔哩下载",
				url: downloadUrl,
			},
		});
	}
	// 只提取音乐处理
	if (url !== undefined && action === "music") {
		const musicUrl = await biliMusic(url, dataFolderPath);
		return NextResponse.json({
			data: {
				type: "哔哩哔哩音乐",
				url: musicUrl.replace(".m4s", ".mp3"),
			},
		});
	}
	// 动态处理
	if (url.includes("t.bilibili.com") || url.includes("bilibili.com/opus")) {
		if (isEmpty(BILI_SESSDATA)) {
			return NextResponse.json({
				err: "检测到没有填写biliSessData，无法解析动态",
			});
		}
		return {
			type: "哔哩哔哩动态",
			data: await biliDynamic(url, BILI_SESSDATA),
		};
	}
	// 视频信息获取例子：http://api.bilibili.com/x/web-interface/view?bvid=BV1hY411m7cB
	// 请求视频信息
	const videoInfo = await getVideoInfo(url);
	const {
		title,
		pic,
		desc,
		duration,
		dynamic,
		stat,
		bvid,
		aid,
		cid,
		owner,
		pages,
	} = videoInfo;
	// 视频信息
	let { view, danmaku, reply, favorite, coin, share, like } = stat;
	// 限制时长 & 考虑分页视频情况
	const query = querystring.parse(url);
	const curPage = query?.p || 0;
	// @ts-ignore
	const curDuration = pages?.[curPage]?.duration || duration;
	const isLimitDuration = curDuration > process.env.BILI_DURATION!;
	// 构造一个可扩展的Map
	const dataProcessMap: { [key: string]: any } = {
		点赞: like,
		硬币: coin,
		收藏: favorite,
		分享: share,
		总播放量: view,
		弹幕数量: danmaku,
		评论: reply,
	};
	// 格式化数据
	const combineContent = `\n${formatBiliInfo(dataProcessMap)}\n简介：${truncateString(desc, Number(process.env.BILI_DEFAULT_INTRO_LEN_LIMIT!))}`;
	// 总结
	let summary: string = "";
	if (!isEmpty(BILI_SESSDATA)) {
		summary = await getBiliSummary(bvid, cid, owner.mid);
	}
	// 限制视频解析
	const durationInMinutes = (curDuration / 60).toFixed(0);
	// 如果不存在就创建一个文件
	await mkdirIfNotExists(dataFolderPath);
	// 下载文件
	let downloadPath = `${dataFolderPath}/${bvid}`;
	await getDownloadUrl(url)
		.then((data) => {
			downBili(downloadPath, data.videoUrl, data.audioUrl)
				.then((_) => {
					return downloadPath;
				})
				.catch((err) => {
					logger.error(err);
				});
		})
		.catch((err) => {
			logger.error(err);
		});
	// 返回数据
	return NextResponse.json({
		data: {
			title,
			desc,
			cover: pic,
			url: downloadPath,
			summary,
			durationInMinutes,
			videoInfo,
		},
	} as ApiResponse);
}

/**
 * 哔哩哔哩总结
 * @author zhiyu1998
 * @param bvid 稿件
 * @param cid 视频 cid
 * @param up_mid UP主 mid
 * @return {Promise<string>}
 */
async function getBiliSummary(
	bvid: StringOrNumber,
	cid: StringOrNumber,
	up_mid: StringOrNumber,
) {
	// 这个有点用，但不多
	let wbi = "wts=1701546363&w_rid=1073871926b3ccd99bd790f0162af634";
	if (!isEmpty(BILI_SESSDATA)) {
		wbi = await getWbi({ bvid, cid, up_mid }, BILI_SESSDATA);
	}
	// 构造API
	const summaryUrl = `${BILI_SUMMARY}?${wbi}`;
	// 构造结果：https://api.bilibili.com/x/web-interface/view/conclusion/get?bvid=BV1L94y1H7CV&cid=1335073288&up_mid=297242063&wts=1701546363&w_rid=1073871926b3ccd99bd790f0162af634
	return axios.get(summaryUrl).then((resp) => {
		const data = resp.data.data?.model_result;
		// logger.info(data)
		const summary = data?.summary;
		const outline = data?.outline;
		let resReply = "";
		// 总体总结
		if (summary) {
			resReply = `\n摘要：${summary}\n`;
		}
		// 分段总结
		if (outline) {
			const specificTimeSummary = outline.map((item: any) => {
				const smallTitle = item.title;
				const keyPoint = item?.part_outline;
				// 时间点的总结
				const specificContent = keyPoint
					.map((point: any) => {
						const { timestamp, content } = point;
						const specificTime = secondsToTime(timestamp);
						return `${specificTime}  ${content}\n`;
					})
					.join("");
				return `- ${smallTitle}\n${specificContent}\n`;
			});
			resReply += specificTimeSummary.join("");
		}
		return resReply;
	});
}

/**
 * 下载哔哩哔哩音乐
 * @param url  链接
 * @param path 保存路径
 */
async function biliMusic(url: string, path: string) {
	const videoId = /video\/[^\?\/ ]+/.exec(url)?.[0].split("/")[1];
	return getBiliAudio(videoId!, "").then(
		async (audioUrl: string | any): Promise<string> =>
			await m4sToMp3(audioUrl, path, videoId),
	);
}

/**
 * 下载哔哩哔哩最高画质视频
 * @param url
 * @param SESSDATA
 */
async function downloadBiliVideo(url: string, SESSDATA: string) {
	const videoId = /video\/[^\?\/ ]+/.exec(url)?.[0].split("/")[1];
	const dash: any = await getBiliVideoWithSession(videoId!, "", SESSDATA);
	// 获取关键信息
	const { video, audio } = dash;
	const videoData = video?.[0];
	const audioData = audio?.[0];
	// 提取信息
	const { height, frameRate, baseUrl: videoBaseUrl } = videoData;
	const { baseUrl: audioBaseUrl } = audioData;
	logger.info(
		`正在下载${height}p ${Math.trunc(frameRate)}帧数 视频，请稍候...`,
	);
	// 添加下载任务到并发队列 future
	const downloadPath = `${dataFolderPath}/${videoId}.mp4`;
	return downBili(downloadPath, videoBaseUrl, audioBaseUrl)
		.then((_: any) => {
			return downloadPath;
		})
		.catch((err: Error) => {
			logger.error(`${err}`);
		});
}

/**
 * 发送哔哩哔哩动态的算法
 * @param url
 * @param session
 */
async function biliDynamic(url: string, session: string) {
	// 去除多余参数
	if (url.includes("?")) {
		url = url.substring(0, url.indexOf("?"));
	}
	const dynamicId = /[^/]+(?!.*\/)/.exec(url)?.[0];
	await getDynamic(dynamicId!, session).then(async (resp) => {
		if (resp.dynamicSrc.length > 0) {
			logger.info(`识别：哔哩哔哩动态, ${resp.dynamicDesc}`);
			let dynamicSrcMsg: Array<string> = [];
			resp.dynamicSrc.forEach((item: string) => {
				dynamicSrcMsg.push(item);
			});
			return {
				dynamicSrc: dynamicSrcMsg,
				dynamicDesc: resp.dynamicDesc,
			};
		} else {
			logger.error(`哔哩哔哩动态, 但是失败！`);
		}
	});
	return {};
}
