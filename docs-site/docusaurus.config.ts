import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
	title: "Periodix-Planner",
	tagline:
		"Intelligent periodic note generation with hierarchical time allocation and budget tracking.",
	favicon: "img/logo2.jpeg",

	url: "https://Real1tyy.github.io",
	baseUrl: "/Periodix-Planner/",

	organizationName: "Real1tyy",
	projectName: "Periodix-Planner",

	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",
	trailingSlash: false,

	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					path: "docs",
					routeBasePath: "/",
					sidebarPath: "./sidebars.ts",
					editUrl:
						"https://github.com/Real1tyy/Periodix-Planner/edit/main/docs-site/",
					showLastUpdateAuthor: true,
					showLastUpdateTime: true,
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themes: [
		[
			"@easyops-cn/docusaurus-search-local",
			{
				hashed: true,
				docsRouteBasePath: "/",
				indexDocs: true,
				indexBlog: false,
				indexPages: true,
				highlightSearchTermsOnTargetPage: true,
				searchBarShortcutHint: false,
			},
		],
	],

	themeConfig: {
		image: "img/logo2.jpeg",
		colorMode: {
			defaultMode: "dark",
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: "Periodix-Planner",
			logo: {
				alt: "Periodix-Planner Logo",
				src: "img/logo2.jpeg",
				href: "/",
			},
			items: [
				{
					to: "/features/overview",
					label: "Features",
					position: "left",
				},
				{
					to: "/video",
					label: "📺 Video",
					position: "left",
				},
				{
					href: "https://www.youtube.com/watch?v=bIVNj6fkTc8",
					label: "YouTube",
					position: "right",
				},
				{
					href: "https://github.com/Real1tyy/Periodix-Planner",
					label: "GitHub",
					position: "right",
				},
			],
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Docs",
					items: [
						{
							label: "Periodix-Planner",
							to: "/",
						},
						{
							label: "Installation",
							to: "/installation",
						},
						{
							label: "Quick Start",
							to: "/quickstart",
						},
						{
							label: "Video Walkthrough",
							to: "/video",
						},
						{
							label: "Changelog",
							to: "/changelog",
						},
					],
				},
				{
					title: "Community",
					items: [
						{
							label: "Contributing & Support",
							to: "/contributing",
						},
						{
							label: "GitHub Issues",
							href: "https://github.com/Real1tyy/Periodix-Planner/issues",
						},
					],
				},
				{
					title: "More",
					items: [
						{
							label: "YouTube Video",
							href: "https://www.youtube.com/watch?v=bIVNj6fkTc8",
						},
						{
							label: "Repository",
							href: "https://github.com/Real1tyy/Periodix-Planner",
						},
						{
							label: "Releases",
							href: "https://github.com/Real1tyy/Periodix-Planner/releases",
						},
					],
				},
				{
					title: "Support",
					items: [
						{
							label: "Support My Work",
							href: "https://github.com/Real1tyy#-support-my-work",
						},
					],
				},
			],
			copyright: `© ${new Date().getFullYear()} Periodix-Planner`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
			additionalLanguages: ["bash", "json", "typescript", "yaml"],
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
