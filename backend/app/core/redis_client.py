import redis.asyncio as aioredis
from app.core.config import settings
from typing import Optional
from jose import jwt

# Initialize async redis pool
redis_client: Optional[aioredis.Redis] = None

def get_redis_client() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=5.0
        )
    return redis_client

async def blacklist_token(token: str, ttl_seconds: Optional[int] = None):
    """
    Stores the token in Redis blacklist.
    If ttl_seconds is not specified, extracts remaining 'exp' timestamp from the JWT,
    or falls back to settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60.
    """
    try:
        r = get_redis_client()
        if ttl_seconds is None:
            try:
                # Decode unverified or verified payload to find expiration
                unverified_claims = jwt.get_unverified_claims(token)
                import time
                exp = unverified_claims.get("exp")
                if exp:
                    now = int(time.time())
                    remaining = exp - now
                    ttl_seconds = max(remaining, 60)
            except Exception:
                ttl_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        if ttl_seconds is None or ttl_seconds <= 0:
            ttl_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        key = f"bl_token:{token}"
        await r.set(key, "revoked", ex=ttl_seconds)
    except Exception as e:
        print(f"Warning: Failed to blacklist token in Redis: {e}")

async def is_token_blacklisted(token: str) -> bool:
    """
    Checks if the token exists in the Redis blacklist.
    """
    try:
        r = get_redis_client()
        key = f"bl_token:{token}"
        val = await r.get(key)
        return val is not None
    except Exception as e:
        print(f"Warning: Redis check failed (fallback allowed): {e}")
        return False
