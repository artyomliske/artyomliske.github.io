"""Приёмник заявок с портфолио.

Сайт — статика на GitHub Pages, а токен бота в статике лежать не может.
Поэтому форма стучится сюда, а сюда уже знает токен и пересылает заявку
в Telegram. Одна ручка, никакой базы: заявка живёт в переписке.

    BOT_TOKEN=123:abc CHAT_ID=456 ORIGIN=https://artyomliske.github.io \\
      uvicorn main:app --host 127.0.0.1 --port 8090

Наружу торчит nginx, см. README.md рядом.
"""

import os
import time
from collections import deque

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

BOT_TOKEN = os.environ["BOT_TOKEN"]
CHAT_ID = os.environ["CHAT_ID"]
ORIGIN = os.environ.get("ORIGIN", "https://artyomliske.github.io")

# Сколько заявок с одного адреса пускаем в час. Без этого форму
# один раз найдёт спам-бот, и Telegram превратится в помойку.
RATE_LIMIT = int(os.environ.get("RATE_LIMIT", "5"))
RATE_WINDOW = 3600

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ORIGIN],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

_seen: dict[str, deque[float]] = {}


def _too_often(ip: str) -> bool:
    now = time.time()
    hits = _seen.setdefault(ip, deque())
    while hits and now - hits[0] > RATE_WINDOW:
        hits.popleft()
    if len(hits) >= RATE_LIMIT:
        return True
    hits.append(now)
    return False


class Lead(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    contact: str = Field(min_length=1, max_length=120)
    task: str = Field(min_length=1, max_length=1500)
    # Поле-ловушка: человек его не видит, бот заполняет.
    website: str = ""
    lang: str = "ru"


@app.post("/lead")
async def lead(body: Lead, request: Request) -> JSONResponse:
    if body.website:
        # Боту отвечаем «принято» — пусть считает, что попал.
        return JSONResponse({"ok": True})

    ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "?")
    if _too_often(ip):
        return JSONResponse({"ok": False}, status_code=429)

    text = (
        "Заявка с портфолио\n\n"
        f"Имя: {body.name}\n"
        f"Связь: {body.contact}\n"
        f"Язык страницы: {body.lang}\n\n"
        f"{body.task}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        # Без parse_mode: текст уходит как есть, и ничего не надо экранировать.
        r = await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": CHAT_ID, "text": text, "disable_web_page_preview": True},
        )

    if r.status_code != 200:
        return JSONResponse({"ok": False}, status_code=502)
    return JSONResponse({"ok": True})


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}
