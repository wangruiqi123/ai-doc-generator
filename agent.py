"""AI Agent - 调用 DeepSeek API 进行多轮对话"""

import os
import json
from openai import OpenAI
from prompts import SYSTEM_PROMPT


class DocAgent:
    """文档生成 Agent，管理多轮对话和文档生成"""

    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com"
        )
        self.model = "deepseek-chat"

    def chat_stream(self, messages):
        """流式调用 DeepSeek API

        Args:
            messages: 完整的对话历史（含 system prompt）

        Yields:
            文本片段
        """
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        response = self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            stream=True,
            temperature=0.7,
            max_tokens=4096
        )

        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
