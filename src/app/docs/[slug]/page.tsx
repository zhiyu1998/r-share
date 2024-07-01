import React from "react";

import MDXContent from "@/components/md-content";

import { notFound } from "next/navigation";

import {
	getAllPostTitles,
	getPostBySlug,
	getPosts,
} from "@/lib/markdown-utils";

import type { Metadata } from "next";
import Link from "next/link";
interface PageProps {
	params: {
		slug: string;
	};
}

export default async function Page({ params }: PageProps) {
	const post = getPostBySlug(params.slug);
	if (!post) return notFound();

	return (
		<div className="drawer lg:drawer-open ">
			<input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
			<div className="drawer-content">
				{/* Page content here */}
				<div className="px-8 py-6 mx-auto font-custom">
					<h1 className="text-4xl font-semibold">{post.title}</h1>
					<p className="text-sm text-zinc-400 mt-2">
						Written by {post.author}
					</p>
					<article className="max-w-none prose mt-10 mx-auto mb-10">
						<MDXContent source={post.content} />
					</article>
				</div>
			</div>
			<div className="drawer-side">
				<label
					htmlFor="my-drawer-2"
					aria-label="close sidebar"
					className="drawer-overlay"
				></label>
				<ul className="menu p-4 w-80 min-h-full bg-base-200 text-base-content">
					{/* Sidebar content here */}
					{getAllPostTitles().map((post) => (
						<li key={post.slug}>
							<Link href={post.slug}>{post.title}</Link>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export function generateMetadata({ params }: PageProps): Metadata {
	const post = getPostBySlug(params.slug);
	if (!post) return notFound();

	return {
		title: `${post.title} | r-share`,
	};
}

export async function generateStaticParams() {
	const posts = getPosts();
	return posts.map((post: any) => ({
		slug: post.slug,
	}));
}
