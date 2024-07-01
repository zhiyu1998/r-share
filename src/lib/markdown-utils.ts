import fs from "fs";
import path from "path";

import matter from "gray-matter";

type Post = {
	title: string;
	excerpt: string;
	slug: string;
	author: string;
	content: string;
};

const root = path.join(process.cwd(), "docs");

export function extractSlug(filename: string) {
	return filename.replace(/\.md$/, "");
}

export function getPosts(): Post[] {
	const files = fs.readdirSync(root, "utf-8");

	const posts = files
		.filter((fn) => fn.endsWith(".md"))
		.map((fn) => {
			const slug = extractSlug(fn);
			const path = `${root}/${fn}`;
			const raw = fs.readFileSync(path, "utf-8");
			const { data, content } = matter(raw);
			return {
				...data,
				slug: slug,
				content: content,
			} as Post;
		});

	return posts;
}

export function getPostBySlug(slug: string): Post | null {
	const path = `${root}/${slug}.md`;
	if (!fs.existsSync(path)) return null;
	const raw = fs.readFileSync(path, "utf-8");
	const { data, content } = matter(raw);
	return {
		...data,
		slug: slug,
		content: content,
	} as Post;
}

/**
 * 按照一定顺序映射所有title用作侧边栏
 */
export function getAllPostTitles() {
	const fileNames = fs.readdirSync(root);
	const allPosts = fileNames.map((fileName) => {
		const fullPath = path.join(root, fileName);
		const fileContents = fs.readFileSync(fullPath, "utf8");
		const matterResult = matter(fileContents);

		return {
			title: matterResult.data.title,
			slug: fileName.replace(/\.md$/, ""),
			order: matterResult.data.order || 0, // 默认 order 为 0
		};
	});

	// 按照 order 字段排序
	return allPosts.sort((a, b) => a.order - b.order);
}
