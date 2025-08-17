import 'dotenv/config';
import { OpenAI } from 'openai';
import axios from 'axios';
import { exec } from 'child_process';
import readline from 'readline';
import puppeteer from 'puppeteer-extra';
import fs from 'fs/promises';
import path from 'path';
import { URL } from 'url';
import isWsl from 'is-wsl';

// ---------- TOOLS ----------
async function getWeatherDetailsByCity(cityname = '') {
	const url = `https://wttr.in/${cityname.toLowerCase()}?format=%C+%t`;
	const { data } = await axios.get(url, { responseType: 'text' });
	return `The current weather of ${cityname} is ${data}`;
}

async function executeCommand(cmd = '') {
	return new Promise((resolve) => {
		const isWindows = process.platform === 'win32';

		// Smart command routing based on environment
		let finalCommand = cmd;
		let useWSL = false;

		// Define Linux commands that need special handling
		const linuxCommands = [
			'ls',
			'cat',
			'grep',
			'find',
			'pwd',
			'which',
			'curl',
			'wget',
			'touch',
			'chmod',
		];
		const isLinuxCommand = linuxCommands.some((linuxCmd) =>
			cmd.startsWith(linuxCmd),
		);

		if (isWindows && !isWsl) {
			// Running on Windows (not inside WSL)
			if (isLinuxCommand) {
				// Try WSL first, fallback to Windows equivalents
				exec('wsl --version', (wslError) => {
					if (!wslError) {
						// WSL is available, use it
						executeWithWSL(cmd, resolve);
					} else {
						// No WSL, use Windows equivalents
						executeWithWindowsEquivalents(cmd, resolve);
					}
				});
				return;
			}
		} else if (isWsl) {
			// Running inside WSL - Linux commands work natively
			finalCommand = cmd;
		} else {
			// Running on Linux/Mac - commands work natively
			finalCommand = cmd;
		}

		// Execute the command
		exec(finalCommand, (error, data) => {
			if (error) {
				resolve(`Command failed: ${error.message}`);
			} else {
				resolve(data || 'Command executed successfully');
			}
		});
	});
}

function executeWithWSL(cmd, resolve) {
	const wslCommand = `wsl ${cmd}`;
	exec(wslCommand, (error, data) => {
		if (error) {
			// WSL failed, try Windows equivalents
			executeWithWindowsEquivalents(cmd, resolve);
		} else {
			resolve(data);
		}
	});
}

function executeWithWindowsEquivalents(cmd, resolve) {
	const windowsEquivalents = {
		ls: 'dir /b',
		'ls -la': 'dir',
		'ls -l': 'dir',
		'ls -a': 'dir /a',
		cat: 'type',
		pwd: 'cd',
		which: 'where',
		find: 'findstr',
		grep: 'findstr',
		touch: 'echo. > ', // Will be handled specially
		curl: 'curl', // Modern Windows has curl
		wget: 'curl -O', // Use curl as wget alternative
	};

	let windowsCmd = cmd;

	// Handle special cases
	if (cmd.startsWith('touch ')) {
		const filename = cmd.replace('touch ', '').trim();
		windowsCmd = `echo. > "${filename}"`;
	} else {
		// Replace Linux command with Windows equivalent
		for (const [linuxCmd, winCmd] of Object.entries(windowsEquivalents)) {
			if (cmd.startsWith(linuxCmd)) {
				windowsCmd = cmd.replace(linuxCmd, winCmd);
				break;
			}
		}
	}

	exec(windowsCmd, (error, data) => {
		if (error) {
			resolve(
				`Command not available: ${error.message}. Consider installing WSL with: wsl --install`,
			);
		} else {
			resolve(data);
		}
	});
}

async function getGithubUserInfoByUsername(username = '') {
	const url = `https://api.github.com/users/${username.toLowerCase()}`;
	const { data } = await axios.get(url);
	return JSON.stringify({
		login: data.login,
		id: data.id,
		name: data.name,
		location: data.location,
		twitter_username: data.twitter_username,
		public_repos: data.public_repos,
		public_gists: data.public_gists,
		user_view_type: data.user_view_type,
		followers: data.followers,
		following: data.following,
	});
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeFileSafe(filename, content) {
	try {
		await fs.writeFile(filename, content, 'utf8');
		return `✅ File '${filename}' created successfully.`;
	} catch (err) {
		return `❌ Failed to create file '${filename}': ${err.message}`;
	}
}

async function readFileSafe(filename) {
	try {
		const data = await fs.readFile(filename, 'utf8');
		return data;
	} catch (err) {
		return `❌ Failed to read file '${filename}': ${err.message}`;
	}
}

async function cloneWebsiteUltraAccurate(url = '') {
	const urlObj = new URL(url);
	const siteName = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_');
	const outputDir = `cloned_${siteName}_${Date.now()}`;

	try {
		const browser = await puppeteer.launch({
			headless: 'new',
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-web-security',
				'--disable-features=VizDisplayCompositor',
				'--window-size=1920,1080',
			],
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080 });
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		);

		// Enable request interception to capture ALL resources
		await page.setRequestInterception(true);

		const resources = new Map();
		const failedResources = new Set();

		page.on('request', (request) => {
			request.continue();
		});

		page.on('response', async (response) => {
			const resourceUrl = response.url();
			const resourceType = response.request().resourceType();

			// Capture ALL types of resources including CSS, JS, images, fonts
			if (
				['stylesheet', 'script', 'image', 'font', 'media'].includes(
					resourceType,
				) ||
				response.headers()['content-type']?.includes('css') ||
				response.headers()['content-type']?.includes('javascript')
			) {
				try {
					const buffer = await response.buffer();
					const contentType = response.headers()['content-type'] || '';

					resources.set(resourceUrl, {
						type: resourceType,
						content: buffer,
						contentType: contentType,
						extension: getExtensionFromUrl(
							resourceUrl,
							contentType,
							resourceType,
						),
					});
				} catch (error) {
					failedResources.add(resourceUrl);
					console.log(`Failed to capture: ${resourceUrl}`);
				}
			}
		});

		// Navigate and wait for everything to load
		await page.goto(url, {
			waitUntil: ['domcontentloaded', 'networkidle2'],
			timeout: 45000,
		});

		// Wait for dynamic content and CSS to fully load
		await sleep(5000);

		// Scroll to trigger lazy loading
		await page.evaluate(async () => {
			await new Promise((resolve) => {
				let totalHeight = 0;
				const distance = 100;
				const timer = setInterval(() => {
					const scrollHeight = document.body.scrollHeight;
					window.scrollBy(0, distance);
					totalHeight += distance;

					if (totalHeight >= scrollHeight) {
						clearInterval(timer);
						resolve();
					}
				}, 100);
			});
		});

		await page.evaluate(() => window.scrollTo(0, 0));
		await sleep(3000);

		// Get the final HTML after all resources have loaded
		const html = await page.content();
		await browser.close();

		// Create organized directory structure
		await fs.mkdir(outputDir, { recursive: true });
		const assetDirs = {
			css: path.join(outputDir, 'css'),
			js: path.join(outputDir, 'js'),
			images: path.join(outputDir, 'images'),
			fonts: path.join(outputDir, 'fonts'),
			media: path.join(outputDir, 'media'),
		};

		for (const dir of Object.values(assetDirs)) {
			await fs.mkdir(dir, { recursive: true });
		}

		// Process and save all resources with proper organization
		let processedHtml = html;
		let resourceCount = 0;

		for (const [originalUrl, resource] of resources) {
			try {
				const fileName = `asset_${resourceCount}${resource.extension}`;
				let targetDir = outputDir;
				let relativePath = `./${fileName}`;

				// Organize by resource type
				if (resource.type === 'stylesheet' || resource.extension === '.css') {
					targetDir = assetDirs.css;
					relativePath = `./css/${fileName}`;
				} else if (resource.type === 'script' || resource.extension === '.js') {
					targetDir = assetDirs.js;
					relativePath = `./js/${fileName}`;
				} else if (
					resource.type === 'image' ||
					['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'].includes(
						resource.extension,
					)
				) {
					targetDir = assetDirs.images;
					relativePath = `./images/${fileName}`;
				} else if (
					['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(
						resource.extension,
					)
				) {
					targetDir = assetDirs.fonts;
					relativePath = `./fonts/${fileName}`;
				} else if (
					['.mp4', '.webm', '.mp3', '.wav', '.ogg'].includes(resource.extension)
				) {
					targetDir = assetDirs.media;
					relativePath = `./media/${fileName}`;
				}

				// Save the resource file
				await fs.writeFile(path.join(targetDir, fileName), resource.content);

				// Replace URLs in HTML (handle both absolute and relative URLs)
				const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				processedHtml = processedHtml.replace(
					new RegExp(escapedUrl, 'g'),
					relativePath,
				);

				// Also try to replace just the pathname for relative URLs
				try {
					const urlPath = new URL(originalUrl).pathname;
					if (urlPath && urlPath !== '/') {
						const escapedPath = urlPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
						processedHtml = processedHtml.replace(
							new RegExp(escapedPath, 'g'),
							relativePath,
						);
					}
				} catch (e) {
					// Ignore URL parsing errors
				}

				resourceCount++;
			} catch (error) {
				console.log(`Failed to process ${originalUrl}: ${error.message}`);
			}
		}

		// Add meta tags to preserve viewport and charset
		const metaTags = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="${url}">
`;

		if (processedHtml.includes('<head>')) {
			processedHtml = processedHtml.replace('<head>', `<head>${metaTags}`);
		}

		// Save the final HTML
		await fs.writeFile(path.join(outputDir, 'index.html'), processedHtml);

		// Create a detailed manifest
		const manifest = {
			originalUrl: url,
			clonedAt: new Date().toISOString(),
			totalResources: resources.size,
			failedResources: failedResources.size,
			resourceBreakdown: {
				css: [...resources.values()].filter(
					(r) => r.type === 'stylesheet' || r.extension === '.css',
				).length,
				js: [...resources.values()].filter(
					(r) => r.type === 'script' || r.extension === '.js',
				).length,
				images: [...resources.values()].filter((r) => r.type === 'image')
					.length,
				fonts: [...resources.values()].filter((r) =>
					['.woff', '.woff2', '.ttf', '.eot'].includes(r.extension),
				).length,
			},
			clonedDirectory: outputDir,
		};

		await fs.writeFile(
			path.join(outputDir, 'clone-manifest.json'),
			JSON.stringify(manifest, null, 2),
		);

		return `✅ Enhanced clone completed! Website '${url}' cloned with ${resources.size} resources (${manifest.resourceBreakdown.css} CSS, ${manifest.resourceBreakdown.js} JS, ${manifest.resourceBreakdown.images} images, ${manifest.resourceBreakdown.fonts} fonts) in directory '${outputDir}'. All styling should be preserved!`;
	} catch (error) {
		return `❌ Enhanced cloning failed: ${error.message}`;
	}
}

const TOOL_MAP = {
	getWeatherDetailsByCity,
	getGithubUserInfoByUsername,
	executeCommand,
	cloneWebsiteUltraAccurate,
	writeFileSafe,
	readFileSafe,
};

const client = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

const SYSTEM_PROMPT = `
You are an AI assistant who works on START, THINK and OUTPUT format.
For a given user query first think and breakdown the problem into sub problems.
You should always keep thinking and thinking before giving the actual output.

Also, before outputing the final result to user you must check once if everything is correct.
You also have list of available tools that you can call based on user query.

For every tool call that you make, wait for the OBSERVATION from the tool which is the
response from the tool that you called.

Available Tools:
- getWeatherDetailsByCity(cityname: string): Returns weather info for a city
- getGithubUserInfoByUsername(username: string): Returns GitHub user info  
- executeCommand(command: string): Executes system commands
- cloneWebsiteUltraAccurate(url: string): Creates ultra-accurate clone of any website with all assets, styles, and dynamic content preserved
- writeFileSafe({ filename, content }): Writes content into a file
- readFileSafe(filename: string): Reads file content


Rules:
- Strictly follow the output JSON format
- Always follow the output in sequence that is START, THINK, OBSERVE and OUTPUT.
- Always perform only one step at a time and wait for other step.
- Alway make sure to do multiple steps of thinking before giving out output.
- For every tool call always wait for the OBSERVE which contains the output from tool
- parse a content after writing to file always remember to parse it
- for cloning a site always remember to clone all assets
- after cloning a site, ALWAYS validate paths using validateAndFixPaths tool
- after cloning a site, always remember to update the HTML file paths
- ensure that all asset URLs are relative to the new directory structure
- when cloning is complete, automatically run path validation to ensure everything works

Output JSON Format:
{ "step": "START | THINK | OUTPUT | OBSERVE | TOOL" , "content": "string", "tool_name": "string", "input": "STRING or OBJECT" }
`;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

async function askUser(query) {
	return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
	const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

	while (true) {
		// 🔹 Get user input
		const userInput = await askUser('\n🧑 You: ');
		messages.push({ role: 'user', content: userInput });

		// 🔹 Reasoning loop
		let stepCounter = 0;
		while (true) {
			stepCounter++;
			if (stepCounter > 12) {
				// safety cutoff
				console.log('⚠️ Breaking loop: assistant did not reach OUTPUT.');
				const fallback = `Hello ${userInput}, how can I help you today?`;
				console.log('🤖', fallback);
				messages.push({ role: 'assistant', content: fallback });
				break;
			}

			const response = await client.chat.completions.create({
				model: 'gpt-4.1-mini',
				messages: messages,
			});

			const rawContent = response.choices[0].message.content;
			let parsedContent;
			try {
				parsedContent = JSON.parse(rawContent);
			} catch (e) {
				console.log('⚠️ Assistant returned invalid JSON:', rawContent);
				break;
			}

			if (parsedContent.step === 'START') {
				console.log(`🔥`, parsedContent.content);
				messages.push({ role: 'assistant', content: rawContent });
				continue;
			}

			if (parsedContent.step === 'THINK') {
				console.log(`\t🧠`, parsedContent.content);
				messages.push({ role: 'assistant', content: rawContent });
				continue;
			}

			if (parsedContent.step === 'TOOL') {
				const toolToCall = parsedContent.tool_name;
				const input = parsedContent.input;

				if (!TOOL_MAP[toolToCall]) {
					messages.push({
						role: 'developer',
						content: `There is no such tool as ${toolToCall}`,
					});
					continue;
				}

				let responseFromTool;
				if (toolToCall === 'writeFileSafe') {
					responseFromTool = await TOOL_MAP[toolToCall](
						input.filename,
						input.content,
					);
				} else {
					responseFromTool = await TOOL_MAP[toolToCall](input);
				}

				console.log(`🛠️: ${toolToCall} = ${responseFromTool}`);

				messages.push({
					role: 'developer',
					content: JSON.stringify({
						step: 'OBSERVE',
						content: responseFromTool,
					}),
				});
				continue;
			}

			if (parsedContent.step === 'OUTPUT') {
				console.log(`🤖`, parsedContent.content);
				messages.push({ role: 'assistant', content: parsedContent.content });
				break;
			}
		}
	}
}

main();
