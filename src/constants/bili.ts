/**
 * AI总结API
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md
 * @type {string}
 */
export const BILI_SUMMARY =
	"https://api.bilibili.com/x/web-interface/view/conclusion/get";

/**
 * 视频流URL
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/video/videostream_url.md
 * @type {string}
 */
export const BILI_PLAY_STREAM =
	"https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=64&fnval=16";

/**
 * 动态信息
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/dynamic/get_dynamic_detail.md
 * @type {string}
 */
export const BILI_DYNAMIC =
	"https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?dynamic_id={}";

/**
 * BVID -> CID
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/33bde6f6afcac2ff8c6f7069f08ce84065a6cff6/docs/video/info.md?plain=1#L4352
 * @type {string}
 */
export const BILI_BVID_TO_CID =
	"https://api.bilibili.com/x/player/pagelist?bvid={bvid}&jsonp=jsonp";

/**
 * 视频基本信息API
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/video/info.md
 * @type {string}
 */
export const BILI_VIDEO_INFO = "http://api.bilibili.com/x/web-interface/view";

/**
 * 登录基本信息
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/login/login_info.md#%E5%AF%BC%E8%88%AA%E6%A0%8F%E7%94%A8%E6%88%B7%E4%BF%A1%E6%81%AF
 * @type {string}
 */
export const BILI_NAV = "https://api.bilibili.com/x/web-interface/nav";

/**
 * 扫码登录的二维码生成
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/login/login_action/QR.md
 * @type {string}
 */
export const BILI_SCAN_CODE_GENERATE =
	"https://passport.bilibili.com/x/passport-login/web/qrcode/generate";

/**
 * 扫码登录检测然后发送令牌数据
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/login/login_action/QR.md
 * @type {string}
 */
export const BILI_SCAN_CODE_DETECT =
	"https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={}";
