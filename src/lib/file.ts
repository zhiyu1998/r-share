import * as fs from "fs";
import logger from "@/lib/logger";
import axios, {AxiosRequestConfig} from "axios";
import tunnel from "tunnel";
import { Proxy } from "@/types/common";
import * as url from "url";

/**
 * 创建文件夹，如果不存在
 * @param dir
 * @returns {Promise<void>}
 */
export async function mkdirIfNotExists(dir: string) {
	try {
		await fs.promises.access(dir);
	} catch (err: any) {
		if (err.code === "ENOENT") {
			await fs.promises.mkdir(dir, { recursive: true });
		} else {
			throw err;
		}
	}
}

/**
 * 检查文件是否存在并且删除
 * @param filePath
 * @returns {Promise<void>}
 */
export async function checkAndRemoveFile(filePath: string) {
	try {
		await fs.promises.access(filePath);
		await fs.promises.unlink(filePath);
		logger.debug("视频已存在");
	} catch (err: any) {
		if (err.code !== "ENOENT") {
			throw err;
		}
	}
}

type DownloadVideoParams = {
	url: string;
	headers: any;
	userAgent: string;
	proxyOption: any;
	downloadPath: string;
	fileName?: string;
};

/**
 * 工具：根据URL多线程下载视频
 * @param url
 * @param downloadPath
 * @param fileName
 * @param isProxy
 * @param headers
 * @param numThreads
 * @param proxy
 */
export async function downloadVideo(
	url: string,
	downloadPath: string,
	fileName: string = "temp.mp4",
	isProxy = false,
	headers = null,
	numThreads = 1,
	proxy: Proxy = {
		proxyAddr: "127.0.0.1",
		proxyPort: 7890,
	},
): Promise<string> {
	// 构造下载文件夹
	await mkdirIfNotExists(downloadPath);
	// 构造header部分内容
	const userAgent =
		"Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.25 Mobile Safari/537.36";
	// numThreads用户设置优先策略，逻辑解释：如果使用了这个函数优先查看用户是否设置了大于1的线程，如果设置了优先使用，没设置就开发者设定的函数设置

	// 构造代理参数
	const proxyOption = {
		...(isProxy && {
			httpAgent: tunnel.httpOverHttp({
				proxy: { host: proxy.proxyAddr, port: proxy.proxyPort },
			}),
			httpsAgent: tunnel.httpsOverHttp({
				proxy: { host: proxy.proxyAddr, port: proxy.proxyPort },
			}),
		}),
	};

	/**
	 * 构造下载视频参数
	 * 构造信息：链接、头信息、userAgent、代理信息、下载位置、返回的路径
	 */
	const downloadVideoParams: DownloadVideoParams = {
		url,
		headers,
		userAgent,
		proxyOption,
		downloadPath,
		fileName,
	};

	// 如果是用户设置了单线程，则不分片下载，如果下载失败就返回空
	return await downloadVideoWithSingleThread(downloadVideoParams) || '';
	// if (numThreads == 1) {
	// 	return await downloadVideoWithSingleThread(downloadVideoParams);
	// } else {
	// 	return await downloadVideoWithMultiThread(
	// 		downloadVideoParams,
	// 		numThreads,
	// 	);
	// }
}

/**
 * 多线程下载视频
 * @param downloadVideoParams
 * @param numThreads
 */
/*async function downloadVideoWithMultiThread(
	downloadVideoParams: DownloadVideoParams,
	numThreads: number,
) {
	const { url, headers, userAgent, proxyOption, downloadPath, fileName } =
		downloadVideoParams;
	try {
		// Step 1: 请求视频资源获取 Content-Length
		const headRes = await axios.head(url, {
			headers: headers || { "User-Agent": userAgent },
			...proxyOption,
		});
		const contentLength = headRes.headers["content-length"];
		if (!contentLength) {
			throw new Error("无法获取视频大小");
		}

		// Step 2: 计算每个线程应该下载的文件部分
		const partSize = Math.ceil(contentLength / numThreads);
		let promises: Promise<any>[] = [];

		for (let i = 0; i < numThreads; i++) {
			const start = i * partSize;
			let end = start + partSize - 1;
			if (i === numThreads - 1) {
				end = contentLength - 1; // 确保最后一部分可以下载完整
			}

			// Step 3: 并发下载文件的不同部分
			const partAxiosConfig = {
				headers: {
					"User-Agent": userAgent,
					Range: `bytes=${start}-${end}`,
				},
				responseType: "stream",
				...proxyOption,
			};

			promises.push(
				axios.get(url, partAxiosConfig).then((res) => {
					return new Promise((resolve, reject) => {
						const partPath = `${downloadPath}.part${i}`;
						logger.info(`正在下载 part${i}`);
						const writer = fs.createWriteStream(partPath);
						res.data.pipe(writer);
						writer.on("finish", () => {
							logger.info(`part${i + 1} 下载完成`); // 记录线程下载完成
							resolve(partPath);
						});
						writer.on("error", reject);
					});
				}),
			);
		}

		// 等待所有部分都下载完毕
		const parts = await Promise.all(promises);

		const target = `${downloadPath}/${fileName}`;
		// Step 4: 合并下载的文件部分
		await checkAndRemoveFile(target); // 确保目标文件不存在
		const writer = fs.createWriteStream(target, { flags: "a" });
		for (const partPath of parts) {
			await new Promise((resolve, reject) => {
				const reader = fs.createReadStream(partPath);
				reader.pipe(writer, { end: false });
				reader.on("end", () => {
					fs.unlinkSync(partPath); // 删除部分文件
					// @ts-ignore
					resolve();
				});
				reader.on("error", reject);
			});
		}

		writer.close();

		return downloadPath;
	} catch (err) {
		logger.error(`下载视频发生错误！\ninfo:${err}`);
	}
}*/

/**
 * 单线程下载视频
 * @param downloadVideoParams
 */
async function downloadVideoWithSingleThread(
	downloadVideoParams: DownloadVideoParams,
): Promise<string | undefined> {
	const { url, headers, userAgent, proxyOption, downloadPath, fileName } =
		downloadVideoParams;
	const axiosConfig = {
		headers: headers || { "User-Agent": userAgent },
		responseType: "stream",
		...proxyOption,
	};

	try {
		const target = `${downloadPath}/${fileName}`;
		await checkAndRemoveFile(target);

		const res = await axios.get(url, axiosConfig);
		logger.info(`开始下载: ${url}`);
		const writer = fs.createWriteStream(target);
		res.data.pipe(writer);

		return new Promise((resolve, reject) => {
			writer.on("finish", () => resolve(downloadPath));
			writer.on("error", reject);
		});
	} catch (err) {
		logger.error(`下载视频发生错误！\ninfo:${err}`);
	}
}

/**
 * 下载一张网络图片(自动以url的最后一个为名字)
 * @param img
 * @param dir
 * @param fileName
 * @param isProxy
 * @param proxy
 * @returns {Promise<unknown>}
 */
export async function downloadImg(
	img: string,
	dir: string,
	fileName = "",
	isProxy = false,
	proxy: Proxy = {
		proxyAddr: "127.0.0.1",
		proxyPort: 7890,
	},
) {
	if (fileName === "") {
		// @ts-ignore
		fileName = img.split("/").pop();
		// 如果不行再换算法解决
		if (fileName === undefined) {
			const parsedUrl = url.parse(img);
			const pathArray = parsedUrl.pathname!.split("/");
			fileName = pathArray[pathArray.length - 1];
		}
	}
	const filepath = `${dir}/${fileName}`;
	await mkdirIfNotExists(dir);
	const writer = fs.createWriteStream(filepath);
	const axiosConfig: AxiosRequestConfig = {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.25 Mobile Safari/537.36",
		},
		responseType: "stream",
	};

	if (isProxy) {
		// @ts-ignore
		axiosConfig.httpAgent = tunnel.httpOverHttp({
			proxy: { host: proxy.proxyAddr, port: proxy.proxyPort },
		});
		// @ts-ignore
		axiosConfig.httpsAgent = tunnel.httpOverHttp({
			proxy: { host: proxy.proxyAddr, port: proxy.proxyPort },
		});
	}
	try {
		const res = await axios.get(img, axiosConfig);
		res.data.pipe(writer);

		return new Promise((resolve, reject) => {
			writer.on("finish", () => {
				writer.close(() => {
					resolve(filepath);
				});
			});
			writer.on("error", (err) => {
				fs.unlink(filepath, () => {
					reject(err);
				});
			});
		});
	} catch (err) {
		logger.error("图片下载失败");
	}
}
