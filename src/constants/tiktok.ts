/**
 * dy API
 * @type {string}
 */
export const DY_INFO =
	"https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id={}&pc_client_type=1&version_code=190500&version_name=19.5.0&cookie_enabled=true&screen_width=1344&screen_height=756&browser_language=zh-CN&browser_platform=Win32&browser_name=Firefox&browser_version=118.0&browser_online=true&engine_name=Gecko&engine_version=109.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=&platform=PC";

/**
 * 以下为抖音/TikTok类型代码
 *
 * @type {{"0": string, "55": string, "2": string, "68": string, "58": string, "4": string, "61": string, "51": string, "150": string}}
 */
export const douyinTypeMap: { [key: number | string]: string } = {
	2: "image",
	4: "video",
	68: "image",
	0: "video",
	51: "video",
	55: "video",
	58: "video",
	61: "video",
	150: "image",
};
