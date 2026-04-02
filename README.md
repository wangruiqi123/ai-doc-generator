# AI Document Generator

AI 驱动的技术方案文档生成工具。通过多轮对话收集项目需求，自动生成完整的技术方案文档。

## 功能

- 多轮对话式需求收集（智能问诊）
- 基于 LLM 的技术方案生成
- SSE 流式输出，实时显示生成内容
- Markdown 文档一键导出

## 技术栈

- **后端**: Python / Flask
- **AI**: DeepSeek API（兼容 OpenAI SDK）
- **前端**: 原生 HTML + CSS + JavaScript
- **通信**: Server-Sent Events (SSE)

## 架构

```
用户输入 → Flask API → DocAgent → DeepSeek API
                                       ↓
用户看到 ← SSE 流式返回 ← Flask ← AI 响应
```

## 快速开始

### 1. 创建并激活虚拟环境

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置 API Key

```bash
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key
```

API Key 获取：https://platform.deepseek.com/api-keys

### 3. 启动

```bash
python app.py
```

访问 http://localhost:5000

## API 选择与配置

### DeepSeek API (付费但有免费额度)
本项目默认使用 DeepSeek API，提供高质量响应。新用户通常可以获得一定量的免费积分用于测试。

### 免费 API 替代方案
如果你希望使用完全免费的 API，可以修改 [agent.py](file:///c/Users/MACHENIKE/Projects/ai-doc-generator/ai-doc-generator/agent.py) 中的配置：

1. **OpenRouter** 提供多种免费/低成本模型
2. **某些开源模型的自托管方案** 如 Ollama
3. **Hugging Face 上的推理端点**

如需切换 API，只需修改 [agent.py](file:///c/Users/MACHENIKE/Projects/ai-doc-generator/ai-doc-generator/agent.py) 中的客户端初始化部分。

## 项目结构

```
ai-doc-generator/
├── app.py              # Flask 主程序，路由和 SSE 接口
├── agent.py            # AI Agent，管理对话和模型调用
├── prompts.py          # 提示词管理
├── templates/
│   └── index.html      # 聊天界面
├── static/
│   └── style.css       # 样式
├── requirements.txt
├── .env.example
└── README.md
```

## 使用流程

1. 打开页面，描述你想做的项目
2. AI 会依次询问：项目描述、目标用户、技术偏好、认证需求、性能要求
3. 信息收集完毕后，自动生成技术方案文档
4. 点击「导出文档」下载 Markdown 文件

## License

MIT
