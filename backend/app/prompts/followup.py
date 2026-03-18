START_INTERVIEW_PROMPT = """你即将开始一场项目深挖面试。

## 项目信息
{project_overview}

## 面试题目
当前阶段（项目概述）的第一个问题：
{first_question}

请以面试官的身份，先简短地做自我介绍（一句话），然后自然地引出第一个问题。
保持友善和专业的语气。用中文。"""


INTERVIEW_CONTEXT_TEMPLATE = """## 项目概览
{overview}

## 当前面试题目
问题：{current_question}
考察意图：{question_intent}
预期要点：{expected_points}

## 相关代码上下文
{code_context}

## 追问角度
{followup_angles}
"""
