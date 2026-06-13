"""
AI 服务 FastAPI 后端
提供作文批改、审题分析、素材推荐等 API
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import httpx
from correction_service import DeepSeekCorrectionService, CorrectionResult

app = FastAPI(
    title="四六级写作AI批改服务",
    description="使用DeepSeek API提供智能作文批改（含模拟模式）",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

# 全局配置和服务实例
global_config = {}
global_service: DeepSeekCorrectionService = None

async def fetch_config():
    """从后端获取配置"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/api/configs", timeout=5)
            if response.status_code == 200:
                return response.json()
            return {}
    except Exception:
        return {}

async def create_correction_service(config: Dict) -> DeepSeekCorrectionService:
    """根据配置创建批改服务实例（即使没有 API Key 也能创建，会使用模拟模式）"""
    print("\n[调试] 配置详情:")
    print(f"[调试] 从数据库获取的配置: {config}")
    
    api_key_from_db = config.get("ai_api_key", "").strip() if config.get("ai_api_key") else ""
    # 清除多余的反引号
    api_key_from_db = api_key_from_db.strip('`').strip("'").strip()
    
    api_key_from_env = os.getenv("DEEPSEEK_API_KEY", "").strip() if os.getenv("DEEPSEEK_API_KEY") else ""
    
    print(f"[调试] api_key_from_db (清理后): '{api_key_from_db[:20] if api_key_from_db else '(空)'}'...")
    print(f"[调试] api_key_from_env: '{api_key_from_env[:20] if api_key_from_env else '(空)'}'...")
    
    api_key = api_key_from_db or api_key_from_env
    print(f"[调试] 最终使用的 api_key: '{api_key[:20] if api_key else '(空)'}'...")
    
    base_url = config.get("ai_base_url", "") or os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    base_url = base_url.strip().strip('`').strip("'").strip()
    print(f"[调试] base_url (清理后): '{base_url}'...")
    
    service = DeepSeekCorrectionService(api_key, base_url)
    
    service.model = config.get("ai_model", "deepseek-chat")
    service.timeout = float(config.get("ai_timeout", "60"))
    service.max_tokens = int(config.get("ai_max_tokens", "4000"))
    service.temperature = float(config.get("ai_temperature", "0.3"))

    print(f"[调试] 服务创建完成")
    return service

async def init_service():
    """初始化服务实例"""
    global global_config, global_service
    print("\n=== 初始化 AI 服务 ===")
    global_config = await fetch_config()
    print(f"[调试] 获取到的配置: {global_config}")
    global_service = await create_correction_service(global_config)
    print(f"[OK] AI服务已初始化")

async def get_correction_service() -> DeepSeekCorrectionService:
    """获取批改服务实例（依赖注入）"""
    global global_service
    if not global_service:
        raise HTTPException(status_code=500, detail="AI服务未初始化")
    return global_service

# 启动时初始化
import asyncio
# 处理 Python 3.12+ 的事件循环问题
try:
    asyncio.run(init_service())
except RuntimeError:
    # 如果已有事件循环，直接调用
    loop = asyncio.get_event_loop()
    loop.run_until_complete(init_service())


class CorrectionRequest(BaseModel):
    essay_content: str
    question_content: str
    level: str = "cet4"
    essay_type: str = "argumentative"


class TopicAnalysisRequest(BaseModel):
    question_content: str
    level: str = "cet4"


class MaterialSuggestionRequest(BaseModel):
    topic: str
    level: str = "cet4"


class TrainingScoreRequest(BaseModel):
    type: str
    content: str = ""
    requirements: str = ""
    referenceAnswer: Optional[Dict] = None
    userAnswer: str = ""


class MockExamCorrectionRequest(BaseModel):
    text: str
    level: str = "cet4"
    type: str = "essay"
    requirements: str = ""


class MockExamScoreRequest(BaseModel):
    text: str
    level: str = "cet4"
    type: str = "essay"
    requirements: str = ""


class MockExamScoreResponse(BaseModel):
    score: int


@app.post("/api/score")
async def score_mock_exam(
    request: MockExamScoreRequest,
    service: DeepSeekCorrectionService = Depends(get_correction_service)
):
    """
    模考轻量打分接口（仅返回分数，不返回详细批改）
    
    - **text**: 作文/翻译内容
    - **level**: cet4 或 cet6
    - **type**: essay 或 translation
    - **requirements**: 题目要求
    """
    try:
        result = await service.score_essay(
            essay_content=request.text,
            question_content=request.requirements,
            level=request.level,
            essay_type=request.type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/correct")
async def correct_mock_exam(
    request: MockExamCorrectionRequest,
    service: DeepSeekCorrectionService = Depends(get_correction_service)
):
    """
    模考作文批改接口（兼容旧版）
    
    - **text**: 作文内容
    - **level**: cet4 或 cet6
    - **type**: 类型
    - **requirements**: 写作要求
    """
    try:
        result = await service.correct_essay(
            essay_content=request.text,
            question_content=request.requirements,
            level=request.level,
            essay_type=request.type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/correction", response_model=CorrectionResult)
async def correct_essay(
    request: CorrectionRequest,
    service: DeepSeekCorrectionService = Depends(get_correction_service)
):
    """
    批改作文接口
    
    - **essay_content**: 学生作文内容
    - **question_content**: 题目要求
    - **level**: cet4 或 cet6
    - **essay_type**: 作文类型
    """
    try:
        result = await service.correct_essay(
            essay_content=request.essay_content,
            question_content=request.question_content,
            level=request.level,
            essay_type=request.essay_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/topic-analysis")
async def analyze_topic(
    request: TopicAnalysisRequest,
    service: DeepSeekCorrectionService = Depends(get_correction_service)
):
    """
    审题分析接口
    
    - **question_content**: 题目内容
    - **level**: cet4 或 cet6
    """
    try:
        result = await service.analyze_topic(
            question_content=request.question_content,
            level=request.level
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/material-suggestions")
async def suggest_materials(
    request: MaterialSuggestionRequest,
    service: DeepSeekCorrectionService = Depends(get_correction_service)
):
    """
    素材推荐接口
    
    - **topic**: 写作话题
    - **level**: cet4 或 cet6
    """
    try:
        result = await service.suggest_materials(
            topic=request.topic,
            level=request.level
        )
        return {"materials": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/config/reload")
async def reload_config():
    """
    刷新配置接口
    管理后台保存配置后调用此接口刷新AI服务配置
    """
    global global_config, global_service
    
    try:
        new_config = await fetch_config()
        global_service = await create_correction_service(new_config)
        global_config = new_config
        return {
            "success": True,
            "message": "配置刷新成功"
        }
    except Exception as e:
        return {"success": False, "message": f"配置刷新失败: {str(e)}"}


@app.post("/api/training/score")
async def score_training(
    request: TrainingScoreRequest,
    service: DeepSeekCorrectionService = Depends(get_correction_service)
):
    """
    专项训练评分接口
    
    - **type**: 训练类型 (topic_analysis / material_apply / open_close / format)
    - **content**: 练习题目内容
    - **requirements**: 练习要求
    - **referenceAnswer**: 参考答案
    - **userAnswer**: 用户答案
    """
    try:
        result = await service.score_training(
            type=request.type,
            content=request.content,
            requirements=request.requirements,
            reference_answer=request.referenceAnswer,
            user_answer=request.userAnswer
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "service": "ai-correction",
        "config_loaded": global_service is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)