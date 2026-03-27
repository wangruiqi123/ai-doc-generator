"""Flask 主程序 - AI 文档生成助手"""

import json
from flask import Flask, render_template, request, Response, session
from dotenv import load_dotenv
from agent import DocAgent

load_dotenv()

app = Flask(__name__)
app.secret_key = "ai-doc-generator-secret"

agent = DocAgent()


@app.route("/")
def index():
    """首页"""
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """聊天接口 - SSE 流式返回"""
    data = request.json
    messages = data.get("messages", [])

    def generate():
        try:
            for chunk in agent.chat_stream(messages):
                yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return Response(generate(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
