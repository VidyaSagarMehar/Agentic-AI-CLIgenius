# 🤖 AI CLI Assistant with Website Cloner

An AI-powered **command-line assistant** that thinks in steps (START →
THINK → OBSERVE → OUTPUT) and comes with powerful tools like fetching
weather, GitHub user info, file management, command execution, and the
highlight --- an **Ultra-Accurate Website Cloner**.

## 🚀 Features

### 🌐 Website Cloner (Highlight)

The **Website Cloner** uses Puppeteer to make a **pixel-perfect offline
copy** of any website.\
- Captures **HTML, CSS, JS, images, fonts, media** - Scrolls through the
page to load **lazy-loaded content** - Saves everything into an
**organized folder structure** (`css/`, `js/`, `images/`, `fonts/`,
`media/`) - Rewrites all asset paths to make the clone **fully
functional offline** - Generates a **clone manifest** with resource
breakdown

### 🔧 Available Tools

-   **getWeatherDetailsByCity(city)** → Fetches live weather details 🌦️\
-   **getGithubUserInfoByUsername(username)** → Gets GitHub user profile
    data 🐙\
-   **executeCommand(command)** → Runs system commands (with
    Windows/Linux/WSL compatibility) 💻\
-   **writeFileSafe(filename, content)** → Safely creates files ✍️\
-   **readFileSafe(filename)** → Reads file content 📖\
-   **cloneWebsiteUltraAccurate(url)** → Creates an ultra-accurate
    offline copy of any site 🌍

### 🧠 AI Workflow

The assistant follows a strict reasoning cycle:\
`START → THINK → TOOL → OBSERVE → OUTPUT`

This ensures **step-by-step problem solving** where every tool call is
validated before producing the final answer.

## 📂 Project Structure

    ai-cli-assistant/
    ├── server.js              # Main AI assistant code (entry point)
    ├── package.json           # Dependencies and scripts
    ├── cloned_*               # Auto-generated cloned sites with assets & manifest
    └── README.md              # Project documentation

## 🛠️ Tech Stack

-   **Node.js** -- Runtime environment\
-   **OpenAI API** -- LLM reasoning engine\
-   **Puppeteer Extra** -- Headless browser for website cloning\
-   **Axios** -- API calls & resource fetching\
-   **fs / path** -- File system utilities\
-   **is-wsl** -- Environment detection (Windows/WSL/Linux support)

## 📅 Average Time to Build

\~10--12 hours (including Puppeteer integration, tool mapping, and
assistant reasoning loop).

## 📚 Lessons Learned

-   Building **agentic AI loops** that reason step by step\
-   Handling **cross-platform command execution** (Windows, WSL, Linux,
    Mac)\
-   Using Puppeteer to **capture all website assets** including dynamic
    content\
-   Rewriting **asset paths** for offline functionality\
-   Designing tool abstractions for **extensible AI assistants**

## 🎯 Key Features

-   ✅ **Ultra-Accurate Website Cloning** with assets preserved\
-   ✅ **Agentic AI Reasoning** (START → THINK → OBSERVE → OUTPUT)\
-   ✅ **Cross-platform command execution** (Windows/Linux/WSL)\
-   ✅ **Utility Tools** (Weather, GitHub info, File operations)\
-   ✅ **Safe file read/write** with error handling

## 🔮 Future Enhancements

-   🛠️ Auto path validation for cloned websites\
-   🖥️ Local preview server for instant browsing of clones\
-   📦 Plugin system for adding new tools easily\
-   🌍 Multi-language support for broader accessibility

## 📬 Feedback

If you have suggestions or ideas to improve the project, feel free to
connect and share your thoughts! 🚀
