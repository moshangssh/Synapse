"""
缓存管理模块
提供内存缓存和持久化缓存功能
"""
import json
import time
import hashlib
import threading
from typing import Dict, Any, Optional, List
from functools import lru_cache
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """缓存条目"""
    key: str
    value: str
    created_at: float
    ttl: int
    hits: int = 0
    
    def is_expired(self) -> bool:
        """检查是否过期"""
        return time.time() - self.created_at > self.ttl
    
    def record_hit(self):
        """记录命中"""
        self.hits += 1


class CacheManager:
    """缓存管理器"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: Dict[str, CacheEntry] = {}
        self.lock = threading.RLock()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'expirations': 0
        }
    
    def generate_key(self, *args) -> str:
        """生成缓存键"""
        key_data = "|".join(str(arg) for arg in args)
        return hashlib.md5(key_data.encode('utf-8')).hexdigest()
    
    def get(self, key: str) -> Optional[str]:
        """获取缓存值"""
        with self.lock:
            entry = self.cache.get(key)
            if entry is None:
                self.stats['misses'] += 1
                return None
            
            if entry.is_expired():
                self._remove_entry(key)
                self.stats['expirations'] += 1
                return None
            
            entry.record_hit()
            self.stats['hits'] += 1
            logger.debug(f"缓存命中: {key}")
            return entry.value
    
    def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """设置缓存值"""
        with self.lock:
            # 检查缓存大小
            if len(self.cache) >= self.max_size:
                self._evict_entries()
            
            # 创建缓存条目
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=time.time(),
                ttl=ttl or self.default_ttl
            )
            
            self.cache[key] = entry
            logger.debug(f"缓存设置: {key}")
            return True
    
    def delete(self, key: str) -> bool:
        """删除缓存值"""
        with self.lock:
            if key in self.cache:
                self._remove_entry(key)
                return True
            return False
    
    def clear(self):
        """清空缓存"""
        with self.lock:
            self.cache.clear()
            logger.info("缓存已清空")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        with self.lock:
            total_requests = self.stats['hits'] + self.stats['misses']
            hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'size': len(self.cache),
                'max_size': self.max_size,
                'hits': self.stats['hits'],
                'misses': self.stats['misses'],
                'hit_rate': f"{hit_rate:.2f}%",
                'evictions': self.stats['evictions'],
                'expirations': self.stats['expirations'],
                'entries': [
                    {
                        'key': entry.key,
                        'created_at': entry.created_at,
                        'ttl': entry.ttl,
                        'hits': entry.hits,
                        'is_expired': entry.is_expired()
                    }
                    for entry in self.cache.values()
                ]
            }
    
    def cleanup(self):
        """清理过期缓存"""
        with self.lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if entry.is_expired()
            ]
            for key in expired_keys:
                self._remove_entry(key)
                self.stats['expirations'] += 1
            
            if expired_keys:
                logger.info(f"清理了 {len(expired_keys)} 个过期缓存条目")
    
    def _remove_entry(self, key: str):
        """移除缓存条目"""
        if key in self.cache:
            del self.cache[key]
    
    def _evict_entries(self):
        """淘汰缓存条目（LRU策略）"""
        if not self.cache:
            return
        
        # 按最后访问时间排序（这里简化为按创建时间）
        sorted_entries = sorted(
            self.cache.values(),
            key=lambda x: x.created_at
        )
        
        # 淘汰最旧的10%条目
        evict_count = max(1, len(self.cache) // 10)
        for i in range(min(evict_count, len(sorted_entries))):
            self._remove_entry(sorted_entries[i].key)
            self.stats['evictions'] += 1
        
        logger.info(f"淘汰了 {evict_count} 个缓存条目")


# 全局缓存管理器实例
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """获取全局缓存管理器实例"""
    global _cache_manager
    if _cache_manager is None:
        # 延迟导入以避免循环导入
        from config import get_cache_config
        cache_config = get_cache_config()
        _cache_manager = CacheManager(
            max_size=cache_config["max_size"],
            default_ttl=cache_config["ttl"]
        )
    return _cache_manager


def get_cached_optimization(subtitles_hash: str, reference_hash: str) -> Optional[str]:
    """获取缓存的优化结果"""
    cache_manager = get_cache_manager()
    key = cache_manager.generate_key(subtitles_hash, reference_hash)
    return cache_manager.get(key)


def cache_optimization_result(subtitles_hash: str, reference_hash: str, result: str, ttl: Optional[int] = None) -> bool:
    """缓存优化结果"""
    cache_manager = get_cache_manager()
    key = cache_manager.generate_key(subtitles_hash, reference_hash)
    return cache_manager.set(key, result, ttl)


def clear_optimization_cache():
    """清空优化缓存"""
    cache_manager = get_cache_manager()
    cache_manager.clear()


def get_cache_stats() -> Dict[str, Any]:
    """获取缓存统计信息"""
    cache_manager = get_cache_manager()
    return cache_manager.get_stats()


# 定期清理过期缓存
def start_cache_cleanup_task():
    """启动缓存清理任务"""
    import threading
    import time
    
    def cleanup_task():
        while True:
            time.sleep(300)  # 5分钟清理一次
            try:
                get_cache_manager().cleanup()
            except Exception as e:
                logger.error(f"缓存清理任务失败: {e}")
    
    thread = threading.Thread(target=cleanup_task, daemon=True)
    thread.start()
    logger.info("缓存清理任务已启动")