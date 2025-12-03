import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
	title: "Periodic Planner",
	tagline:
		"Intelligent periodic note generation with hierarchical time allocation and budget tracking.",
	favicon: "img/favicon.ico",

	url: "https://Real1tyy.github.io",
	baseUrl: "/Periodic-Planner/",

	organizationName: "Real1tyy",
	projectName: "Periodic-Planner",

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
						"https://github.com/Real1tyy/Periodic-Planner/edit/main/docs-site/",
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
		image: "img/periodic-planner-social.png",
		colorMode: {
			defaultMode: "dark",
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: "Periodic Planner",
			logo: {
				alt: "Periodic Planner Logo",
				src: "img/logo.png",
				href: "/",
			},
			items: [
				{
					to: "/features/overview",
					label: "Features",
					position: "left",
				},
				{
					href: "https://github.com/Real1tyy/Periodic-Planner",
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
							label: "Periodic Planner",
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
							href: "https://github.com/Real1tyy/Periodic-Planner/issues",
						},
					],
				},
				{
					title: "More",
					items: [
						{
							label: "Repository",
							href: "https://github.com/Real1tyy/Periodic-Planner",
						},
						{
							label: "Releases",
							href: "https://github.com/Real1tyy/Periodic-Planner/releases",
						},
					],
				},
				{
					title: "Support",
					items: [
						{
							label: "Sponsor on GitHub",
							href: "https://github.com/sponsors/Real1tyy",
						},
						{
							label: "Buy Me a Coffee",
							href: "https://www.buymeacoffee.com/real1ty",
						},
					],
				},
			],
			copyright: `© ${new Date().getFullYear()} Periodic Planner`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
			additionalLanguages: ["bash", "json", "typescript", "yaml"],
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
