import os
import sys
import types
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")


class _DummyLimiter:
    def limit(self, _value):
        def decorator(fn):
            return fn

        return decorator


fake_main = types.ModuleType("app.main")
fake_main.limiter = _DummyLimiter()
sys.modules.setdefault("app.main", fake_main)
