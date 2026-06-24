"""Structured per-project logging (§6).

Emits one JSON line per significant event so runs are greppable:
sources hit, fields found/missing, confidence, decision.
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Any


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "msg": record.getMessage(),
        }
        if isinstance(getattr(record, "extra_fields", None), dict):
            payload.update(record.extra_fields)
        return json.dumps(payload, ensure_ascii=False)


def get_logger(verbose: bool = False) -> logging.Logger:
    logger = logging.getLogger("liqwd_enrich")
    if not logger.handlers:
        h = logging.StreamHandler(sys.stderr)
        h.setFormatter(JsonFormatter())
        logger.addHandler(h)
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    return logger


def log_event(logger: logging.Logger, msg: str, **fields: Any) -> None:
    logger.info(msg, extra={"extra_fields": fields})
