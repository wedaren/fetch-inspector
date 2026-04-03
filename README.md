# fetch-inspector

工具说明：从剪贴板读取浏览器 "Copy as fetch (nodejs)" 的代码片段，解析出 URL/headers/body/method，执行请求并打印可读报告。

快速开始：

1. 进入目录并安装依赖：

```bash
cd /Users/wedaren/repositoryDestinationOfGithub/fetch-inspector
npm install
```

2. 直接运行（开发模式，需全局或项目安装 `ts-node`）：

```bash
npm run dev
```

或构建后运行：

```bash
npm run build
npm start
```

用法：把浏览器 "copy as fetch (nodejs)" 输出复制到剪贴板，然后运行程序。程序会解析并执行请求，输出可读的请求/响应报告。

安全说明：该工具会执行网络请求并会使用剪贴板中包含的 Authorization/Cookie 等敏感头部；请在可信环境下使用。

脱敏（隐藏 header）
-----------------

你可以通过 `--redact` 选项或环境变量 `REDACT_HEADERS` 指定要掩码的 header 名称（逗号分隔）。被掩码的 header 值会在输出中显示为 `<REDACTED>`。

示例：在命令行中指定要隐藏 `authorization` 和 `cookie`：

```bash
node dist/index.js --redact=authorization,cookie
```

或使用环境变量方式：

```bash
REDACT_HEADERS=authorization,cookie node dist/index.js
```

通配符 `*` 可用于掩码所有 header：

```bash
node dist/index.js --redact=*
```

默认行为（不指定）会把所有 header 原样打印。