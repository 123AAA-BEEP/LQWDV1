"""Environment-driven configuration. Never hardcode credentials (Constraint #8/§8).

All secrets come from env vars (or a local .env loaded by the caller). Mirrors
the env-var style of supabase/imports/import_altus_xlsx.py.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

SUPABASE_PROJECT_REF = "mzdqlhopxfknwqxxuonn"  # LIQWD DB V1 (not a secret)


@dataclass(frozen=True)
class Settings:
    supabase_url: str | None
    supabase_service_role_key: str | None
    anthropic_api_key: str | None
    google_cse_key: str | None
    google_cse_cx: str | None
    # Claude model for extraction + copy — matches the app's use of Opus 4.8.
    anthropic_model: str = "claude-opus-4-8"

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def has_search(self) -> bool:
        return bool(self.google_cse_key and self.google_cse_cx)

    @property
    def has_anthropic(self) -> bool:
        return bool(self.anthropic_api_key)


def load_settings() -> Settings:
    return Settings(
        supabase_url=os.environ.get("SUPABASE_URL"),
        supabase_service_role_key=(
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            or os.environ.get("SUPABASE_SERVICE_KEY")
        ),
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY"),
        google_cse_key=os.environ.get("GOOGLE_CSE_KEY"),
        google_cse_cx=os.environ.get("GOOGLE_CSE_CX"),
        anthropic_model=os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8"),
    )
