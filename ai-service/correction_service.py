"""
DeepSeek AI 批改服务
使用 DeepSeek API 实现四六级作文智能批改
"""

import httpx
import json
import re
from typing import Dict, List, Optional
from pydantic import BaseModel


class CorrectionResult(BaseModel):
    score: int
    score_breakdown: Dict[str, int]
    overall_comment: str
    error_list: List[Dict]
    format_errors: List[str]
    content_comments: List[str]
    suggestions: List[str]
    revised_version: str
    review_report: Optional[Dict[str, List[str]]] = None


SYSTEM_PROMPT_CET4 = """你是一位专业的大学英语四级作文阅卷老师，严格按照四级评分标准进行批改。

评分标准（满分15分）：
- 档位(11-13分)：切题，表达思想清楚，文字通顺，连贯性较好
- 档位(8-10分)：切题，表达思想清楚，文字连贯
- 档位(5-7分)：基本切题，表达不够清楚，连贯性差
- 档位(2-4分)：基本切题，但表达不清楚
- 档位(1-2分)：条理不清，思路紊乱

批改要点：
1. 格式规范（书信、通知等应用文格式）
2. 语法正确性（时态、主谓一致、搭配）
3. 内容完整性
4. 逻辑连贯性
5. 词汇使用

请严格按照以下JSON格式输出批改结果，不要输出其他内容：
{
    "score": 分数(1-15),
    "score_breakdown": {
        "content": 内容完整度分数(1-5),
        "structure": 结构逻辑分数(1-5),
        "language": 语言表达分数(1-5),
        "format": 格式规范分数(1-5)
    },
    "overall_comment": "详细的总体评价，至少150字，每个要点单独一段，不要用编号列表、不要用加粗标记、不要用特殊符号，包括：审题情况、内容完整性、论证力度、语言表达、改进方向",
    "error_list": [
        {
            "type": "错误类型(grammar/spelling/punctuation/vocabulary/collocation/tense)",
            "position": {"start": 起始位置, "end": 结束位置},
            "original": "原文错误",
            "corrected": "修正后",
            "reason": "详细的错误原因解析，包括：语法规则说明、为什么错误、如何避免",
            "explanation": "详细解析，至少100字"
        }
    ],
    "format_errors": ["格式错误列表，每个错误带详细说明"],
    "content_comments": ["内容点评列表，每个点评详细说明"],
    "suggestions": ["优化建议列表，每条建议具体可操作"],
    "revised_version": "详细的高分改写版本，每段有注释说明优化点。注意：所有你修改或优化过的词汇、短语、句子都要用 **改写内容** 这样的格式标记起来，比如把 'is very important' 改为 '**plays a pivotal role**'",
    "review_report": {
        "strengths": ["优势列表，每项详细说明"],
        "weaknesses": ["薄弱点列表，每项详细说明"],
        "improvement_plan": ["提升计划列表，具体可执行"]
    }
}
注意：
1. error_list 要精准识别所有真正的语言错误，好的文章可能只有1-2个错误，差的文章可能有10个以上
2. 每个错误都要精准，确保是真正的语法、词汇、搭配或表达问题，不要凑数
3. 每个 error 的 explanation 至少100字，详细说明语法规则、历史来源、如何避免
4. overall_comment 至少150字，每个要点单独成段，不要用编号或加粗
5. suggestions 5-10条即可，每条都要具体可操作
6. 质量重于数量，宁可少写错误，也要确保每个都精准"""

SYSTEM_PROMPT_CET6 = """你是一位专业的大学英语六级作文阅卷老师，严格按照六级评分标准进行批改。

评分标准（满分15分）：
- 档位(11-13分)：切题，表达思想清楚，文字通顺，连贯性良好
- 档位(8-10分)：切题，表达思想清楚，文字连贯
- 档位(5-7分)：基本切题，但表达不够清楚
- 档位(2-4分)：表达不清楚，连贯性差
- 档位(1-2分)：条理不清，思路紊乱

批改要点：
1. 逻辑深度与论证力度
2. 句式复杂度与多样性
3. 词汇高级程度
4. 论证饱满度
5. 语言精准度

请严格按照以下JSON格式输出批改结果，不要输出其他内容：
{
    "score": 分数(1-15),
    "score_breakdown": {
        "content": 内容完整度分数(1-5),
        "structure": 结构逻辑分数(1-5),
        "language": 语言表达分数(1-5),
        "format": 格式规范分数(1-5)
    },
    "overall_comment": "详细的总体评价，至少150字，每个要点单独一段，不要用编号列表、不要用加粗标记、不要用特殊符号，包括：审题情况、内容完整性、论证力度、语言表达、改进方向",
    "error_list": [
        {
            "type": "错误类型(grammar/spelling/punctuation/vocabulary/collocation/tense)",
            "position": {"start": 起始位置, "end": 结束位置},
            "original": "原文错误",
            "corrected": "修正后",
            "reason": "详细的错误原因解析，包括：语法规则说明、为什么错误、如何避免",
            "explanation": "详细解析，至少100字"
        }
    ],
    "format_errors": ["格式错误列表，每个错误带详细说明"],
    "content_comments": ["内容点评列表，每个点评详细说明"],
    "suggestions": ["优化建议列表，每条建议具体可操作"],
    "revised_version": "详细的高分改写版本，每段有注释说明优化点。注意：所有你修改或优化过的词汇、短语、句子都要用 **改写内容** 这样的格式标记起来，比如把 'is very important' 改为 '**plays a pivotal role**'",
    "review_report": {
        "strengths": ["优势列表，每项详细说明"],
        "weaknesses": ["薄弱点列表，每项详细说明"],
        "improvement_plan": ["提升计划列表，具体可执行"]
    }
}
注意：
1. error_list 要精准识别所有真正的语言错误，好的文章可能只有1-2个错误，差的文章可能有10个以上
2. 每个错误都要精准，确保是真正的语法、词汇、搭配或表达问题，不要凑数
3. 每个 error 的 explanation 至少100字，详细说明语法规则、历史来源、如何避免
4. overall_comment 至少150字，每个要点单独成段，不要用编号或加粗
5. suggestions 5-10条即可，每条都要具体可操作
6. 质量重于数量，宁可少写错误，也要确保每个都精准"""

class DeepSeekCorrectionService:
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = "deepseek-chat"
        self.timeout = 120.0
        self.max_tokens = 8000
        self.temperature = 0.3

    async def correct_essay(
        self,
        essay_content: str,
        question_content: str,
        level: str = "cet4",
        essay_type: str = "argumentative"
    ) -> CorrectionResult:
        """
        批改作文
        
        Args:
            essay_content: 作文内容
            question_content: 题目要求
            level: 级别 (cet4 或 cet6)
            essay_type: 作文类型
            
        Returns:
            CorrectionResult: 批改结果
        """
        print("\n=== 开始批改作文 ===")
        print(f"[调试] base_url: {self.base_url}")
        print(f"[调试] model: {self.model}")
        print(f"[调试] level: {level}, type: {essay_type}")
        print(f"[调试] 作文字数: {len(essay_content)} 字符")

        if not self.api_key:
            raise Exception("AI服务未配置API Key，无法进行批改")

        print("[OK] 使用真实 DeepSeek API")
        
        system_prompt = SYSTEM_PROMPT_CET4 if level == "cet4" else SYSTEM_PROMPT_CET6
        
        user_prompt = f"""请批改以下{'四级' if level == 'cet4' else '六级'}作文：

题目要求：
{question_content}

作文类型：{essay_type}

学生作文：
{essay_content}

请按照评分标准进行批改，并输出JSON格式的结果。"""

        try:
            print(f"[调试] 正在调用 DeepSeek API...")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens
                    }
                )
                
                print(f"[调试] API 响应状态码: {response.status_code}")

                if response.status_code != 200:
                    error_msg = f"DeepSeek API 错误: {response.status_code}, 响应: {response.text[:500]}"
                    print(f"[ERROR] {error_msg}")
                    raise Exception(error_msg)

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                print(f"[OK] API 调用成功")
                print(f"[调试] 响应内容长度: {len(content)} 字符")
                print(f"[调试] AI返回的原始内容:\n{content}\n--- 原始内容结束 ---")

                # 解析JSON结果
                result_json = self._parse_json_response(content)
                print(f"[OK] JSON 解析成功")
                return CorrectionResult(**result_json)

        except Exception as e:
            print(f"[ERROR] AI 批改服务错误: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise

    def _parse_json_response(self, content: str) -> Dict:
        """解析AI返回的JSON内容"""
        # 1. 尝试直接解析
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # 2. 尝试提取JSON部分
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            json_str = content[start:end]
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        # 3. 使用正则直接提取 score 和 feedback（最鲁棒的方式）
        import re
        
        # 提取 score 字段
        score_match = re.search(r'"score"\s*:\s*(\d+(?:\.\d+)?)', content)
        
        # 提取 feedback 字段 — 从 "feedback" 后面找字符串值
        # 匹配 "feedback": 后面跟的字符串（处理各种转义情况）
        fb_match = re.search(r'"feedback"\s*:\s*"', content)
        feedback = ""
        if fb_match:
            fb_start = fb_match.end()
            # 从 feedback 值开始处，逐字符扫描找到匹配的结束引号
            i = fb_start
            while i < len(content):
                ch = content[i]
                if ch == '\\' and i + 1 < len(content):
                    i += 2  # 跳过转义字符
                    continue
                if ch == '"':
                    # 检查下一个字符，如果是 , 或 } 说明这是值的结束
                    break
                i += 1
            if i > fb_start:
                feedback = content[fb_start:i]
                # 处理转义
                feedback = feedback.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t').replace('\\\\', '\\')
        
        if score_match:
            score = int(score_match.group(1))
            return {"score": score, "feedback": feedback}
        
        # 4. 最后尝试 json_repair（如果可用）
        try:
            from json_repair import repair_json
            repaired = repair_json(content)
            return json.loads(repaired)
        except:
            raise Exception("无法解析AI返回的JSON内容")

    async def score_essay(
        self,
        essay_content: str,
        question_content: str,
        level: str = "cet4",
        essay_type: str = "essay"
    ) -> Dict:
        """
        模考轻量打分（仅返回分数，不返回详细批改）

        Args:
            essay_content: 作文/翻译内容
            question_content: 题目要求
            level: 级别 (cet4 或 cet6)
            essay_type: 类型 (essay 或 translation)
            
        Returns:
            Dict with score (0-100 normalized)
        """
        print(f"\n=== 模考打分: {level} {essay_type} === 字数: {len(essay_content)}")

        if not self.api_key:
            raise Exception("AI服务未配置API Key，暂时无法打分")

        system_prompt = f"""你是一位正在给学生批改{'作文' if essay_type == 'essay' else '翻译'}的阅卷老师，你现在要直接对你的学生说话。
⚠️ 重要：下面 user 消息中【学生作答】部分就是学生提交的完整答案，这就是你要评价的内容。无论它多短、多不完整，你都必须基于现有内容打分和写评语，绝对不能说"未提供""请补充""缺少原文"之类的话。
你必须用第二人称"你"直接对学生说，像面对面谈心一样。即使学生只写了几个字，你也要先肯定他/她敢于尝试，然后鼓励多写一些。
只返回一个JSON对象：{{"score": 百分制分数(0-100), "feedback": "用'你'对学生说的评语，150-300字，温暖鼓励的语气"}}"""

        user_prompt = f"【学生作答——这就是你要评价的全部内容】\n{essay_content if essay_content.strip() else '（学生没有写任何内容）'}\n\n【题目要求】\n{question_content}\n\n请基于以上学生的作答直接给出分数和评语。即使作答很短甚至空白，也必须打分（空白给0-10分）并给出鼓励性评语。"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.1,
                        "max_tokens": self.max_tokens
                    }
                )

                if response.status_code != 200:
                    raise Exception(f"API 错误: {response.status_code}")

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                print(f"[调试] AI返回原始内容: {content[:200] if content else '(空)'}")
                
                # AI 可能返回空内容（如因安全策略拦截）
                if not content or not content.strip():
                    raise Exception("AI返回了空内容，可能被内容安全策略拦截")
                    
                result = self._parse_json_response(content)
                if not isinstance(result, dict) or 'score' not in result:
                    # 尝试从 content 中用正则提取分数
                    import re
                    score_match = re.search(r'"score"\s*:\s*(\d+)', content)
                    if score_match:
                        result = {"score": int(score_match.group(1)), "feedback": ""}
                    else:
                        raise Exception("AI未返回有效分数")
                print(f"[OK] 模考打分完成: {result.get('score', 0)}分")
                return {"score": result.get("score", 0), "feedback": result.get("feedback", "")}

        except Exception as e:
            print(f"[ERROR] 模考打分失败: {str(e)}")
            raise

    async def analyze_topic(
        self,
        question_content: str,
        level: str = "cet4"
    ) -> Dict:
        """
        分析题目，提供审题指导

        Args:
            question_content: 题目内容
            level: 级别

        Returns:
            Dict: 审题分析结果
        """
        if not self.api_key:
            raise Exception("AI服务未配置API Key，无法进行审题分析")

        system_prompt = """你是一位专业的四六级写作指导老师，帮助学生进行审题分析。
请分析题目并返回以下JSON格式：
{
    "main_point": "核心主旨",
    "writing_type": "文体类型",
    "key_points": ["关键要点列表"],
    "structure_suggestion": ["结构建议列表"],
    "common_mistakes": ["常见审题错误提醒"]
}"""

        user_prompt = f"""请分析以下{'四级' if level == 'cet4' else '六级'}写作题目：

{question_content}

请提供审题分析。"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": self.max_tokens
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"DeepSeek API 错误: {response.status_code}")

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return self._parse_json_response(content)
        except Exception as e:
            print(f"审题分析错误: {str(e)}")
            raise

    async def suggest_materials(
        self,
        topic: str,
        level: str = "cet4"
    ) -> List[Dict]:
        """
        根据话题推荐素材

        Args:
            topic: 写作话题
            level: 级别

        Returns:
            List[Dict]: 推荐素材列表
        """
        if not self.api_key:
            raise Exception("AI服务未配置API Key，无法推荐素材")

        system_prompt = """你是一位四六级写作素材推荐专家。
根据话题推荐相关的高级词汇、句式和论据。
返回JSON格式：
{
    "materials": [
        {
            "type": "vocabulary/sentence/argument",
            "content": "英文内容",
            "translation": "中文翻译",
            "usage": "使用场景说明"
        }
    ]
}"""

        user_prompt = f"""请为以下{'四级' if level == 'cet4' else '六级'}写作话题推荐素材：

话题：{topic}

请推荐5-10个相关素材。"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.5,
                        "max_tokens": self.max_tokens
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"DeepSeek API 错误: {response.status_code}")

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result = self._parse_json_response(content)
                return result.get("materials", [])
        except Exception as e:
            print(f"素材推荐错误: {str(e)}")
            raise

    async def score_training(
        self,
        type: str,
        content: str,
        requirements: str,
        reference_answer: Dict = None,
        user_answer: str = ""
    ) -> Dict:
        """
        评分专项训练答案

        Args:
            type: 训练类型 (topic_analysis / material_apply / open_close / format)
            content: 练习题目内容
            requirements: 练习要求
            reference_answer: 参考答案
            user_answer: 用户答案

        Returns:
            Dict: { score: int, feedback: str }
        """
        if not self.api_key:
            raise Exception("AI服务未配置API Key，无法评分")

        type_labels = {
            "topic_analysis": "审题构思",
            "material_apply": "素材应用",
            "open_close": "开头结尾",
            "format": "格式规范"
        }
        type_label = type_labels.get(type, type)

        system_prompt = f"""你是一位专业的四六级写作指导教师，正在批改学生的「{type_label}」专项训练。

请根据以下标准对学生的答案进行评分（满分10分），并给出详细的反馈和改进建议：

评分标准：
- 审题构思：要考察学生是否正确抓取主旨、识别文体、搭建合理框架
- 素材应用：要考察学生是否运用了高级词汇、复杂句式，改写是否提升明显
- 开头结尾：要考察开头是否引人入胜、结尾是否有力、逻辑是否通顺
- 格式规范：要考察称呼、正文、落款是否符合对应文体格式要求

请返回JSON格式：
{{
    "score": 整数(1-10),
    "feedback": "详细反馈，至少100字，包含：优点、不足、具体改进建议"
}}"""

        user_prompt = f"""请批改学生的「{type_label}」专项训练：

练习题目：
{content}

练习要求：
{requirements}

参考答案：
{json.dumps(reference_answer, ensure_ascii=False) if reference_answer else '无'}

学生答案：
{user_answer}

请评分并给出反馈。"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": self.max_tokens
                    }
                )

                if response.status_code != 200:
                    raise Exception(f"DeepSeek API 错误: {response.status_code}")

                data = response.json()
                response_content = data["choices"][0]["message"]["content"]
                result = self._parse_json_response(response_content)
                if "feedback" in result:
                    result["feedback"] = re.sub(r'\*\*([^*]+)\*\*', r'\1', result["feedback"])
                    result["feedback"] = re.sub(r'\*([^*]+)\*', r'\1', result["feedback"])
                return result
        except Exception as e:
            print(f"训练评分错误: {str(e)}")
            raise