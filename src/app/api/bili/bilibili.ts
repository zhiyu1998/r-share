import {
	BILI_BVID_TO_CID,
	BILI_DYNAMIC,
	BILI_PLAY_STREAM,
	BILI_VIDEO_INFO,
} from "@/constants/bili";
import { dataProcessing } from "@/lib/utils";
import * as child_process from "child_process";
import * as fs from "fs";
import axios from "axios";
import { mkdirIfNotExists } from "@/lib/file";
import logger from "@/lib/logger";
import util from "util";

const biliHeaders = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36",
	referer: "https://www.bilibili.com",
};

/**
 * 下载单个bili文件
 * @param url
 * @param fullFileName
 * @param progressCallback
 * @returns {Promise<any>}
 */
export async function downloadBFile(
	url: string,
	fullFileName: string,
	progressCallback: Function,
) {
	return axios
		.get(url, {
			responseType: "stream",
			headers: {
				...biliHeaders,
			},
		})
		.then(({ data, headers }) => {
			let currentLen = 0;
			const totalLen = headers["content-length"];

			return new Promise((resolve, reject) => {
				data.on("data", ({ length }: any) => {
					currentLen += length;
					progressCallback?.(currentLen / totalLen);
				});

				data.pipe(
					fs.createWriteStream(fullFileName).on("finish", () => {
						resolve({
							fullFileName,
							totalLen,
						});
					}),
				);
			});
		});
}

/**
 * 获取下载链接
 * @param url
 * @returns {Promise<any>}
 */
export async function getDownloadUrl(url: string) {
	return axios
		.get(url, {
			headers: {
				...biliHeaders,
			},
		})
		.then(({ data }) => {
			const info = JSON.parse(
				data.match(
					/<script>window\.__playinfo__=({.*})<\/script><script>/,
				)?.[1],
			);
			// 如果是大视频直接最低分辨率
			const videoUrl =
				info?.data?.dash?.video?.[0]?.baseUrl ??
				info?.data?.dash?.video?.[0]?.backupUrl?.[0];

			const audioUrl =
				info?.data?.dash?.audio?.[0]?.baseUrl ??
				info?.data?.dash?.audio?.[0]?.backupUrl?.[0];
			const title = data
				.match(/title="(.*?)"/)?.[1]
				?.replaceAll?.(/\\|\/|:|\*|\?|"|<|>|\|/g, "");

			if (videoUrl && audioUrl) {
				return { videoUrl, audioUrl, title };
			}

			return Promise.reject("获取下载地址失败");
		});
}

// 自定义节流函数
const throttle = (fn: Function, delay: number) => {
	let lastCallTime = 0;

	return (...args: any[]) => {
		const now = Date.now();
		if (now - lastCallTime >= delay) {
			lastCallTime = now;
			fn(...args);
		}
	};
};

/**
 * 哔哩哔哩下载
 * @param title
 * @param videoUrl
 * @param audioUrl
 * @returns {Promise<unknown>}
 */
export async function downBili(
	title: string,
	videoUrl: string,
	audioUrl: string,
) {
	return Promise.all([
		downloadBFile(
			videoUrl,
			title + "-video.m4s",
			throttle(
				(value: any) =>
					logger.debug("视频下载进度", {
						data: value,
					}),
				1000,
			),
		),
		downloadBFile(
			audioUrl,
			title + "-audio.m4s",
			throttle(
				(value: any) =>
					logger.debug("音频下载进度", {
						data: value,
					}),
				1000,
			),
		),
	]).then((data: any) => {
		return mergeFileToMp4(
			data?.[0]?.fullFileName,
			data?.[1]?.fullFileName,
			`${title}.mp4`,
		);
	});
}

/**
 * 哔哩哔哩解析的数据处理
 * @param data
 * @return {string}
 */
export function formatBiliInfo(data: { [key: string]: any }) {
	return Object.keys(data)
		.map((key) => `${key}：${dataProcessing(data[key])}`)
		.join(" | ");
}

/**
 * 获取视频信息
 * @param url
 * @returns {Promise<{duration: *, owner: *, bvid: *, stat: *, pages: *, dynamic: *, pic: *, title: *, aid: *, desc: *, cid: *}>}
 */
export async function getVideoInfo(url: string) {
	// const baseVideoInfo = "http://api.bilibili.com/x/web-interface/view";
	// @ts-ignore
	const videoId = /video\/[^\?\/ ]+/.exec(url)[0].split("/")[1];
	// 获取视频信息，然后发送
	return fetch(`${BILI_VIDEO_INFO}?bvid=${videoId}`).then(async (resp) => {
		const respJson = await resp.json();
		const respData = respJson.data;
		return {
			title: respData.title,
			pic: respData.pic,
			desc: respData.desc,
			duration: respData.duration,
			dynamic: respJson.data.dynamic,
			stat: respData.stat,
			bvid: respData.bvid,
			aid: respData.aid,
			cid: respData.pages?.[0].cid,
			owner: respData.owner,
			pages: respData?.pages,
		};
	});
}

/**
 * bvid转换成cid
 * @param bvid
 * @returns {Promise<*>}
 */
export const fetchCID = async (bvid: string) => {
	//console.log('Data.js Calling fetchCID:' + URL_BVID_TO_CID.replace("{bvid}", bvid))
	const res = await fetch(BILI_BVID_TO_CID.replace("{bvid}", bvid));
	const json = await res.json();
	const cid = json.data[0].cid;
	return cid;
};

/**
 * 哔哩哔哩音乐下载
 * @param bvid BVID
 * @param cid  （选项）CID
 * @returns {Promise<any>}
 */
export async function getBiliAudio(bvid: string, cid: string) {
	// 转换cid
	if (!cid)
		cid = await fetchCID(bvid).catch((err: Error) => console.log(err));

	// 返回一个fetch的promise
	return new Promise((resolve, reject) => {
		fetch(BILI_PLAY_STREAM.replace("{bvid}", bvid).replace("{cid}", cid))
			.then((res) => res.json())
			.then((json) => resolve(json.data.dash.audio[0].baseUrl));
	});
}

/**
 * 合并视频和音频
 * @param vFullFileName
 * @param aFullFileName
 * @param outputFileName
 * @param shouldDelete
 * @returns {Promise<{outputFileName}>}
 */
export async function mergeFileToMp4(
	vFullFileName: string,
	aFullFileName: string,
	outputFileName: string,
	shouldDelete = true,
) {
	// 判断当前环境
	let env;
	if (process.platform === "win32") {
		env = process.env;
	} else if (process.platform === "linux" || process.platform == "darwin") {
		env = {
			...process.env,
			PATH:
				"/usr/local/bin:" +
				child_process.execSync("echo $PATH").toString(),
		};
	} else {
		logger.error("暂时不支持当前操作系统！");
	}
	const execFile = util.promisify(child_process.execFile);
	try {
		const cmd = "ffmpeg";
		const args = [
			"-y",
			"-i",
			vFullFileName,
			"-i",
			aFullFileName,
			"-c",
			"copy",
			outputFileName,
		];
		await execFile(cmd, args, { env });

		if (shouldDelete) {
			await fs.promises.unlink(vFullFileName);
			await fs.promises.unlink(aFullFileName);
		}

		return { outputFileName };
	} catch (err) {
		logger.error(err);
	}
}

/**
 * 下载m4s文件，通过ffmpeg转换成mp3
 * @param m4sUrl
 * @param path
 * @param fileName
 * @returns {Promise<string>}
 */
export async function m4sToMp3(
	m4sUrl: string,
	path: string,
	fileName: string = "temp",
): Promise<string> {
	return axios
		.get(m4sUrl, {
			responseType: "stream",
			headers: {
				...biliHeaders,
			},
		})
		.then(async (res) => {
			// 如果没有目录就创建一个
			await mkdirIfNotExists(path);
			// 补充保存文件名
			path += `/${fileName}.m4s`;
			if (fs.existsSync(path)) {
				fs.unlinkSync(path);
			}
			// 开始下载
			const fileStream = fs.createWriteStream(path);
			res.data.pipe(fileStream);
			// 下载完成
			return new Promise((resolve, reject) => {
				fileStream.on("finish", () => {
					fileStream.close(() => {
						const transformCmd = `ffmpeg -i ${path} ${path.replace(".m4s", ".mp3")} -y -loglevel quiet`;
						child_process.execSync(transformCmd);
						logger.info("bili: mp3下载完成");
						resolve(path);
					});
				});
				fileStream.on("error", (err) => {
					fs.unlink(path, () => {
						reject(err);
					});
				});
			});
		});
}

export async function getBiliVideoWithSession(
	bvid: string,
	cid: string,
	SESSDATA: string,
) {
	if (!cid) {
		cid = await fetchCID(bvid).catch((err) => console.log(err));
	}
	// 返回一个fetch的promise
	return new Promise((resolve, reject) => {
		fetch(BILI_PLAY_STREAM.replace("{bvid}", bvid).replace("{cid}", cid), {
			headers: {
				// SESSDATA 字段
				Cookie: `SESSDATA=${SESSDATA}`,
			},
		})
			.then((res) => res.json())
			.then((json) => resolve(json.data.dash));
	});
}

/**
 * 获取动态
 * @param dynamicId
 * @returns {Promise<any>}
 */
export async function getDynamic(dynamicId: string, SESSDATA: string) {
	const dynamicApi = BILI_DYNAMIC.replace("{}", dynamicId);
	return axios
		.get(dynamicApi, {
			headers: {
				...biliHeaders,
				Cookie: `SESSDATA=${SESSDATA}`,
			},
		})
		.then((resp) => {
			const dynamicData = resp.data.data.card;
			const card = JSON.parse(dynamicData.card);
			const dynamicOrigin = card.item;
			const dynamicDesc = dynamicOrigin.description;

			const pictures = dynamicOrigin.pictures;
			let dynamicSrc = [];
			for (let pic of pictures) {
				const img_src = pic.img_src;
				dynamicSrc.push(img_src);
			}
			// console.log(dynamic_src)
			return {
				dynamicSrc,
				dynamicDesc,
			};
		});
}
