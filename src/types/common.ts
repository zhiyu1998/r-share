export type StringOrNumber = string | number;

export type Proxy = {
	proxyAddr: string;
	proxyPort: number;
};

/**
 * API 返回格式限制
 */
export interface ApiResponse {
	data: {
		url?: string;
		title?: string;
		cover?: string;
		images?: string[];
		desc?: string;
		summary?: string;
	};
}
