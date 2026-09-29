import base64
import hashlib
import ipaddress
import os
import socket
import time
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any
from urllib.parse import quote, urlparse

import requests
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy.orm import Session

if "." in (__package__ or ""):
    from ..general import models
else:
    from general import models


AI_SETTING_CATEGORY = "ai_generation"
DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_GEMINI_MODEL = os.getenv("GOOGLE_GENERATION_MODEL", "gemini-3.1-flash-lite")
DEFAULT_TEST_PROMPT = "Reply with exactly: CONNECTED"


class ProviderError(RuntimeError):
    """Safe provider error that never contains an API key or full remote response."""


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Encryption Key (derives a stable Fernet key from a Render-held deployment secret)
def _get_cipher() -> Fernet:
    source_secret = (
        os.getenv("AI_CONFIG_ENCRYPTION_KEY", "").strip()
        or os.getenv("SECRET_KEY", "").strip()
    )
    if not source_secret:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI settings encryption is not configured. Add a stable SECRET_KEY or "
                "AI_CONFIG_ENCRYPTION_KEY in Render, deploy once, and try again."
            ),
        )
    if len(source_secret) < 32:
        raise HTTPException(
            status_code=503,
            detail="The Render encryption secret must contain at least 32 characters before AI keys can be saved.",
        )
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(source_secret.encode("utf-8")).digest())
    return Fernet(derived_key)


def _encrypt_api_key(api_key: str) -> str:
    return _get_cipher().encrypt(api_key.encode("utf-8")).decode("ascii")


def _decrypt_api_key(ciphertext: str) -> str:
    try:
        return _get_cipher().decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except InvalidToken:
        raise HTTPException(
            status_code=503,
            detail="The saved AI key cannot be decrypted. Restore the original encryption secret or enter the key again.",
        )


# Provider URL Validation (allows public HTTPS APIs while blocking internal-network access)
@lru_cache(maxsize=64)
def _validated_base_url(value: str, provider: str) -> str:
    clean = value.strip().rstrip("/")
    if provider == "openai_compatible" and clean.endswith("/chat/completions"):
        clean = clean[:-len("/chat/completions")].rstrip("/")
    if provider == "gemini" and not clean:
        return DEFAULT_GEMINI_BASE_URL

    parsed = urlparse(clean)
    allow_http = os.getenv("AI_ALLOW_HTTP_PROVIDERS", "false").lower() == "true"
    if parsed.scheme not in ({"https", "http"} if allow_http else {"https"}):
        raise HTTPException(status_code=422, detail="AI provider URLs must use HTTPS.")
    if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise HTTPException(status_code=422, detail="Enter a valid provider base URL without credentials or query parameters.")

    configured_hosts = {
        host.strip().lower()
        for host in os.getenv("AI_PROVIDER_HOST_ALLOWLIST", "").split(",")
        if host.strip()
    }
    hostname = parsed.hostname.lower()
    if configured_hosts and hostname not in configured_hosts:
        raise HTTPException(status_code=422, detail="This provider host is not in AI_PROVIDER_HOST_ALLOWLIST.")

    try:
        addresses = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror:
        raise HTTPException(status_code=422, detail="The AI provider hostname could not be resolved.")

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            raise HTTPException(status_code=422, detail="Private or reserved AI provider addresses are not allowed.")
    return clean


def _default_profile() -> dict[str, Any]:
    return {
        "display_name": "Render Gemini fallback",
        "provider": "gemini",
        "base_url": DEFAULT_GEMINI_BASE_URL,
        "model": DEFAULT_GEMINI_MODEL,
        "temperature": 0.4,
        "max_tokens": 1024,
        "timeout_seconds": 45,
        "thinking_mode": "disabled",
        "secret_source": "render_environment",
        "test_status": "environment",
        "tested_at": None,
        "latency_ms": None,
    }


def _setting_container(setting: models.IntegrationSetting | None) -> dict[str, Any]:
    if not setting or not isinstance(setting.config, dict):
        return {"active": None, "draft": None, "previous": None}
    return {
        "active": setting.config.get("active"),
        "draft": setting.config.get("draft"),
        "previous": setting.config.get("previous"),
    }


def _find_reusable_secret(container: dict[str, Any], payload: dict[str, Any]) -> tuple[str | None, str | None]:
    for name in ("draft", "active", "previous"):
        candidate = container.get(name)
        if not isinstance(candidate, dict):
            continue
        if (
            candidate.get("provider") == payload.get("provider")
            and candidate.get("base_url", "").rstrip("/") == payload.get("base_url", "").rstrip("/")
            and candidate.get("api_key_ciphertext")
        ):
            return candidate["api_key_ciphertext"], "stored"
    return None, None


def _resolve_api_key(profile: dict[str, Any]) -> str:
    ciphertext = profile.get("api_key_ciphertext")
    if ciphertext:
        return _decrypt_api_key(ciphertext)
    if profile.get("provider") == "gemini":
        environment_key = os.getenv("GOOGLE_API_KEY", "").strip()
        if environment_key:
            return environment_key
    raise HTTPException(status_code=422, detail="This provider does not have an API key.")


def _public_profile(profile: dict[str, Any] | None) -> dict[str, Any] | None:
    if not profile:
        return None
    public_fields = (
        "display_name",
        "provider",
        "base_url",
        "model",
        "temperature",
        "max_tokens",
        "timeout_seconds",
        "thinking_mode",
        "secret_source",
        "test_status",
        "tested_at",
        "latency_ms",
        "activated_at",
    )
    public = {key: profile.get(key) for key in public_fields}
    public["has_api_key"] = bool(profile.get("api_key_ciphertext")) or (
        profile.get("provider") == "gemini" and bool(os.getenv("GOOGLE_API_KEY", "").strip())
    )
    return public


def _get_setting(db: Session) -> models.IntegrationSetting | None:
    return db.query(models.IntegrationSetting).filter(
        models.IntegrationSetting.category == AI_SETTING_CATEGORY
    ).first()


def get_ai_settings(db: Session) -> dict[str, Any]:
    container = _setting_container(_get_setting(db))
    active = container["active"] or _default_profile()
    return {
        "active": _public_profile(active),
        "draft": _public_profile(container["draft"]),
        "previous": _public_profile(container["previous"]),
        "embedding": {
            "display_name": "Gemini document embeddings",
            "provider": "gemini",
            "model": "gemini-embedding-2",
            "managed_by": "Render environment",
            "change_supported": False,
        },
    }


def save_ai_draft(db: Session, payload: dict[str, Any], updated_by: str) -> dict[str, Any]:
    provider = payload["provider"]
    base_url = _validated_base_url(payload.get("base_url", ""), provider)
    model = payload["model"].strip()
    display_name = payload["display_name"].strip()
    if not model or not display_name:
        raise HTTPException(status_code=422, detail="Display name and model ID are required.")

    setting = _get_setting(db)
    container = _setting_container(setting)
    supplied_api_key = (payload.get("api_key") or "").strip()
    if supplied_api_key:
        ciphertext = _encrypt_api_key(supplied_api_key)
        secret_source = "stored"
    else:
        ciphertext, secret_source = _find_reusable_secret(container, {**payload, "base_url": base_url})
        if not ciphertext and provider == "gemini" and os.getenv("GOOGLE_API_KEY", "").strip():
            secret_source = "render_environment"
        elif not ciphertext:
            raise HTTPException(status_code=422, detail="Enter an API key for this provider.")

    draft = {
        "display_name": display_name,
        "provider": provider,
        "base_url": base_url,
        "model": model,
        "temperature": float(payload["temperature"]),
        "max_tokens": int(payload["max_tokens"]),
        "timeout_seconds": int(payload["timeout_seconds"]),
        "thinking_mode": payload.get("thinking_mode", "disabled"),
        "api_key_ciphertext": ciphertext,
        "secret_source": secret_source,
        "test_status": "untested",
        "tested_at": None,
        "latency_ms": None,
        "updated_by": updated_by,
        "updated_at": _utc_now_iso(),
    }
    container["draft"] = draft

    if not setting:
        setting = models.IntegrationSetting(
            category=AI_SETTING_CATEGORY,
            provider=provider,
            mode="draft",
            config=container,
        )
        db.add(setting)
    else:
        setting.provider = (container["active"] or draft).get("provider", provider)
        setting.mode = "active" if container["active"] else "draft"
        setting.config = container
    db.commit()
    return get_ai_settings(db)


def _provider_request(profile: dict[str, Any], prompt: str, test_mode: bool = False) -> str:
    profile = dict(profile)
    provider = profile["provider"]
    profile["base_url"] = _validated_base_url(profile.get("base_url", ""), provider)
    if provider == "gemini":
        return _gemini_request(profile, prompt, test_mode)
    if provider == "openai_compatible":
        return _openai_compatible_request(profile, prompt, test_mode)
    raise ProviderError("Unsupported AI provider type.")


def _gemini_request(profile: dict[str, Any], prompt: str, test_mode: bool) -> str:
    api_key = _resolve_api_key(profile)
    model = quote(profile["model"].removeprefix("models/"), safe="-._")
    endpoint = f"{profile['base_url']}/models/{model}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0 if test_mode else profile["temperature"],
            "maxOutputTokens": 24 if test_mode else profile["max_tokens"],
        },
    }
    try:
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            json=body,
            timeout=profile["timeout_seconds"],
        )
        response.raise_for_status()
        data = response.json()
        parts = data["candidates"][0]["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            raise ProviderError("The Gemini provider returned an empty response.")
        return text
    except requests.Timeout:
        raise ProviderError("The Gemini provider timed out.")
    except requests.RequestException as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        suffix = f" (HTTP {status_code})" if status_code else ""
        raise ProviderError(f"The Gemini provider request failed{suffix}.")
    except (KeyError, IndexError, TypeError, ValueError):
        raise ProviderError("The Gemini provider returned an unsupported response format.")


def _openai_compatible_request(profile: dict[str, Any], prompt: str, test_mode: bool) -> str:
    api_key = _resolve_api_key(profile)
    endpoint = f"{profile['base_url']}/chat/completions"
    body: dict[str, Any] = {
        "model": profile["model"],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0 if test_mode else profile["temperature"],
        "max_tokens": 24 if test_mode else profile["max_tokens"],
        "stream": False,
    }
    hostname = (urlparse(profile["base_url"]).hostname or "").lower()
    if hostname == "api.deepseek.com" or hostname.endswith(".deepseek.com"):
        body["thinking"] = {"type": profile.get("thinking_mode", "disabled")}

    try:
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=profile["timeout_seconds"],
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
        text = str(content or "").strip()
        if not text:
            raise ProviderError("The provider returned an empty response.")
        return text
    except requests.Timeout:
        raise ProviderError("The AI provider timed out.")
    except requests.RequestException as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        suffix = f" (HTTP {status_code})" if status_code else ""
        raise ProviderError(f"The AI provider request failed{suffix}.")
    except (KeyError, IndexError, TypeError, ValueError):
        raise ProviderError("The provider returned a response that is not OpenAI-compatible.")


def test_ai_draft(db: Session) -> dict[str, Any]:
    setting = _get_setting(db)
    container = _setting_container(setting)
    draft = container.get("draft")
    if not setting or not draft:
        raise HTTPException(status_code=409, detail="Save a draft configuration before testing it.")

    started = time.monotonic()
    try:
        preview = _provider_request(draft, DEFAULT_TEST_PROMPT, test_mode=True)
    except ProviderError as exc:
        draft["test_status"] = "failed"
        draft["tested_at"] = _utc_now_iso()
        draft["latency_ms"] = round((time.monotonic() - started) * 1000)
        container["draft"] = draft
        setting.config = container
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc))

    draft["test_status"] = "passed"
    draft["tested_at"] = _utc_now_iso()
    draft["latency_ms"] = round((time.monotonic() - started) * 1000)
    container["draft"] = draft
    setting.config = container
    db.commit()
    return {"message": "Connection test passed.", "preview": preview[:120], **get_ai_settings(db)}


def activate_ai_draft(db: Session, updated_by: str) -> dict[str, Any]:
    setting = _get_setting(db)
    container = _setting_container(setting)
    draft = container.get("draft")
    if not setting or not draft:
        raise HTTPException(status_code=409, detail="There is no draft configuration to activate.")
    if draft.get("test_status") != "passed":
        raise HTTPException(status_code=409, detail="Test the draft successfully before activating it.")

    previous = container.get("active")
    if not previous:
        previous = _default_profile()
    draft["activated_at"] = _utc_now_iso()
    draft["activated_by"] = updated_by
    container = {"active": draft, "draft": None, "previous": previous}
    setting.provider = draft["provider"]
    setting.mode = "active"
    setting.config = container
    db.commit()
    return get_ai_settings(db)


def rollback_ai_provider(db: Session, updated_by: str) -> dict[str, Any]:
    setting = _get_setting(db)
    container = _setting_container(setting)
    active = container.get("active")
    previous = container.get("previous")
    if not setting or not active or not previous:
        raise HTTPException(status_code=409, detail="There is no previous provider configuration to restore.")

    previous["activated_at"] = _utc_now_iso()
    previous["activated_by"] = updated_by
    container = {"active": previous, "draft": None, "previous": active}
    setting.provider = previous["provider"]
    setting.mode = "active"
    setting.config = container
    db.commit()
    return get_ai_settings(db)


def generate_ai_response(db: Session, prompt: str) -> str:
    setting = _get_setting(db)
    container = _setting_container(setting)
    active = container.get("active") or _default_profile()
    try:
        return _provider_request(active, prompt)
    except (ProviderError, HTTPException):
        fallback = _default_profile()
        is_already_fallback = active.get("provider") == "gemini" and active.get("model") == fallback["model"]
        if is_already_fallback or not os.getenv("GOOGLE_API_KEY", "").strip():
            raise
        return _provider_request(fallback, prompt)


def get_active_provider_name(db: Session) -> str:
    active = _setting_container(_get_setting(db)).get("active") or _default_profile()
    return active.get("display_name") or active.get("model") or "AI provider"
