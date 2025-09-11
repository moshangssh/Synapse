"""
配置管理模块
处理环境变量和配置文件管理
"""
import os
from typing import Optional, Dict, Any
from functools import lru_cache
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class Config:
    """简单配置类"""
    def __init__(self):
        # 加载 .env 文件
        load_dotenv()
        self.load_env()
    
    def load_env(self):
        """加载环境变量"""
        # LLM配置
        self.llm_api_key = os.getenv("LLM_API_KEY", "demo_key")
        self.llm_endpoint = os.getenv("LLM_ENDPOINT", "https://api.openai.com/v1/chat/completions")
        self.llm_model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
        self.llm_timeout = int(os.getenv("LLM_TIMEOUT", "30"))
        self.llm_max_retries = int(os.getenv("LLM_MAX_RETRIES", "3"))
        
        # 缓存配置
        self.cache_enabled = os.getenv("CACHE_ENABLED", "true").lower() == "true"
        self.cache_max_size = int(os.getenv("CACHE_MAX_SIZE", "1000"))
        self.cache_ttl = int(os.getenv("CACHE_TTL", "3600"))
        
        # 应用配置
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:1420,tauri://localhost")


@lru_cache()
def get_settings() -> Config:
    """获取配置实例（单例）"""
    try:
        return Config()
    except Exception as e:
        logger.error(f"加载配置失败: {e}")
        return Config()


def get_llm_config() -> Dict[str, Any]:
    """获取LLM配置"""
    settings = get_settings()
    return {
        "api_key": settings.llm_api_key,
        "endpoint": settings.llm_endpoint,
        "model": settings.llm_model,
        "timeout": settings.llm_timeout,
        "max_retries": settings.llm_max_retries
    }


def get_cache_config() -> Dict[str, Any]:
    """获取缓存配置"""
    settings = get_settings()
    return {
        "enabled": settings.cache_enabled,
        "max_size": settings.cache_max_size,
        "ttl": settings.cache_ttl
    }


def get_app_config() -> Dict[str, Any]:
    """获取应用配置"""
    settings = get_settings()
    return {
        "debug": settings.debug,
        "log_level": settings.log_level,
        "cors_origins": settings.cors_origins
    }


def validate_config() -> bool:
    """验证配置是否有效"""
    settings = get_settings()
    
    # 检查必要的配置项
    if not settings.llm_api_key or settings.llm_api_key == "demo_key":
        logger.warning("LLM API_KEY 未设置或使用默认值，请设置环境变量 LLM_API_KEY")
        return False
    
    return True


def get_cors_origins() -> list:
    """获取CORS允许的源"""
    origins_str = get_settings().cors_origins
    return [origin.strip() for origin in origins_str.split(",")]


# 全局配置实例
settings = get_settings()