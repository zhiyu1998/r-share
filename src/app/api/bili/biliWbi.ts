import md5 from "md5";
import {StringOrNumber} from "@/types/common";
import {BILI_NAV} from "@/constants/bili";

const mixinKeyEncTab = [
	46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
	33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
	61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
	36, 20, 34, 44, 52,
];

// 对 imgKey 和 subKey 进行字符顺序打乱编码
const getMixinKey = (orig: any) =>
	mixinKeyEncTab
		.map((n) => orig[n])
		.join("")
		.slice(0, 32);

// 为请求参数进行 wbi 签名
function encWbi(params: wbiVideoData, img_key: any, sub_key: any) {
	const mixin_key = getMixinKey(img_key + sub_key),
		curr_time = Math.round(Date.now() / 1000),
		chr_filter = /[!'()*]/g;

	Object.assign(params, { wts: curr_time }); // 添加 wts 字段
	// 按照 key 重排参数
	const query = Object.keys(params)
		.sort()
		.map((key) => {
			// 过滤 value 中的 "!'()*" 字符
			// @ts-ignore
			const value = params[key].toString().replace(chr_filter, "");
			return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
		})
		.join("&");

	const wbi_sign = md5(query + mixin_key); // 计算 w_rid

	return query + "&w_rid=" + wbi_sign;
}

// 获取最新的 img_key 和 sub_key
async function getWbiKeys(SESSDATA: string) {
	const res = await fetch(BILI_NAV, {
		headers: {
			// SESSDATA 字段
			Cookie: `SESSDATA=${SESSDATA}`,
		},
	});
	const {
		data: {
			wbi_img: { img_url, sub_url },
		},
	} = await res.json();

	return {
		img_key: img_url.slice(
			img_url.lastIndexOf("/") + 1,
			img_url.lastIndexOf("."),
		),
		sub_key: sub_url.slice(
			sub_url.lastIndexOf("/") + 1,
			sub_url.lastIndexOf("."),
		),
	};
}

type wbiVideoData = {
	bvid: StringOrNumber;
	cid: StringOrNumber;
	up_mid: StringOrNumber;
};

/**
 * 算法来自：https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md
 * 参考了算法来源：https://github.com/SocialSisterYi/bilibili-API-collect/issues/631
 * @return {Promise<string>}
 */
export async function getWbi(videoData: wbiVideoData, SESSDATA: string) {
	const web_keys = await getWbiKeys(SESSDATA);
	const params = { ...videoData },
		img_key_res = web_keys.img_key,
		sub_key_res = web_keys.sub_key;
	// eg. bar=514&baz=1919810&foo=114&wts=1684805578&w_rid=bb97e15f28edf445a0e4420d36f0157e
	return encWbi(params, img_key_res, sub_key_res);
}
