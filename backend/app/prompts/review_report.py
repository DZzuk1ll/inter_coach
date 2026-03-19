REVIEW_REPORT_PROMPT = """你是一位资深技术面试评估专家。根据以下面试完整记录和项目分析结果，生成一份结构化的面试复盘评分报告。

## 项目分析结果
{analysis_summary}

## 面试对话记录
{conversation_history}

## 评分维度说明
1. **技术深度** (technical_depth)：对项目技术栈、实现细节、底层原理的理解程度
2. **沟通能力** (communication)：表达清晰度、逻辑性、条理性、能否简明扼要地说明问题
3. **架构思维** (architecture)：对系统设计、技术选型、扩展性、tradeoff 的思考能力
4. **自我认知** (self_awareness)：对自身项目贡献的准确定位、对不足的坦诚、改进意识

## 输出要求
请返回 JSON 格式：
{{
  "dimensions": [
    {{
      "key": "technical_depth",
      "label": "技术深度",
      "score": <1-10 整数>,
      "comment": "<一句话点评>"
    }},
    {{
      "key": "communication",
      "label": "沟通能力",
      "score": <1-10 整数>,
      "comment": "<一句话点评>"
    }},
    {{
      "key": "architecture",
      "label": "架构思维",
      "score": <1-10 整数>,
      "comment": "<一句话点评>"
    }},
    {{
      "key": "self_awareness",
      "label": "自我认知",
      "score": <1-10 整数>,
      "comment": "<一句话点评>"
    }}
  ],
  "overall_score": <1-10 整数，综合得分>,
  "summary": "<2-3 句话的整体评价>",
  "strengths": ["<优势1>", "<优势2>", ...],
  "improvements": ["<改进建议1>", "<改进建议2>", ...]
}}

请基于对话内容客观评估，不要给出无根据的高分或低分。"""
