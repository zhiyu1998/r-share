import { TEN_THOUSAND } from "@/lib/constants";
import path from "path";

/**
 * 千位数的数据处理
 * @param data
 * @return {string|*}
 */
export const dataProcessing = (data: string | number | any) => {
	return Number(data) >= TEN_THOUSAND
		? (data / TEN_THOUSAND).toFixed(1) + "万"
		: data;
};

/**
 * 超过某个长度的字符串换为...
 * @param inputString
 * @param maxLength
 * @returns {*|string}
 */
export function truncateString(inputString: string, maxLength: number = 50) {
	if (maxLength === 0 || maxLength === -1) {
		return inputString;
	} else if (inputString.length <= maxLength) {
		return inputString;
	} else {
		// 截取字符串，保留前面 maxLength 个字符
		let truncatedString = inputString.substring(0, maxLength);
		// 添加省略号
		truncatedString += "...";
		return truncatedString;
	}
}

/**
 * 数字转换成具体时间
 * @param seconds
 * @return {string}
 */
export function secondsToTime(seconds: number) {
	const pad = (num: number, size: number) =>
		num.toString().padStart(size, "0");

	let hours = Math.floor(seconds / 3600);
	let minutes = Math.floor((seconds % 3600) / 60);
	let secs = seconds % 60;

	// 如果你只需要分钟和秒钟，你可以返回下面这行：
	// return `${pad(minutes, 2)}:${pad(secs, 2)}`;

	// 完整的 HH:MM:SS 格式
	return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}`;
}

/**
 * 构造返回video/img的链接
 * @param downloadPath 下载文件所在绝对路径
 * @param fileType		 文件类型，默认.mp4
 */
export function constructURL(downloadPath: string, fileType: string = ".mp4") {
	const relativeFilePath = path.relative(
		path.join(process.cwd(), "public"),
		downloadPath,
	);
	// 获取Base URL
	const baseUrl = process.env.BASE_URL;
	// 拼接完整URL
	return new URL(relativeFilePath + fileType, baseUrl).href;
}
