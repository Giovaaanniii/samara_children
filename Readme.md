# Самара Детям

Информационно-сервисная платформа для экскурсионного бюро: каталог мероприятий, бронирование и администрирование контента. Репозиторий — монорепозиторий с раздельными клиентом и сервером.

## Состав репозитория

| Каталог | Назначение |
|--------|------------|
| `frontend/` | Веб-клиент (React, Vite, TypeScript) |
| `backend/` | REST API (FastAPI, SQLAlchemy, PostgreSQL) |
| `requirements.txt` | Зависимости Python для бэкенда |

После запуска API документация доступна по адресу `http://localhost:8000/docs` (Swagger UI).

## Требования

| Режим | Что нужно |
|-------|-----------|
| Docker | Docker Engine и Docker Compose Plugin |
| Локально | Python 3.11+, Node.js 18+, отдельно запущенные PostgreSQL 15+ и Redis 7+ |

## Переменные окружения

1. В корне репозитория скопируйте шаблон: `cp .env.example .env` (Windows: `copy .env.example .env`).
2. Откройте `.env` и задайте как минимум `SECRET_KEY`; при локальном запуске — корректные `DATABASE_URL` и `REDIS_URL` под ваши службы.
3. Файл `.env` не коммитится; подробности полей — в `.env.example`.

## Запуск

### Вариант 1: Docker Compose (рекомендуется для разработки)

Все сервисы (БД, Redis, бэкенд, фронтенд) поднимаются одной командой из **корня репозитория** (каталог, где лежат `docker-compose.yml` и `requirements.txt`):

```bash
docker compose up --build
```

Первый запуск соберёт образы; при изменении кода в `./backend` и `./frontend` контейнеры перезагружаются за счёт `uvicorn --reload` и Vite.

| Что открыть | URL |
|-------------|-----|
| Фронтенд | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |

Остановка: `Ctrl+C` в терминале или в другом окне: `docker compose down`.

### Вариант 2: Локально (без Docker)

Убедитесь, что PostgreSQL и Redis запущены и строки в `.env` указывают на них (для API обычно `localhost`).

**Терминал 1 — бэкенд**

```bash
pip install -r requirements.txt
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Терминал 2 — фронтенд**

```bash
cd frontend
npm install
npm run dev
```

| Что открыть | URL |
|-------------|-----|
| Фронтенд | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |

Порт фронтенда задаётся в `frontend/vite.config.ts` (по умолчанию 3000).

**Сборка фронтенда для продакшена**

```bash
cd frontend
npm run build
```

Статика окажется в `frontend/dist/`; раздачу настраивает ваш веб-сервер или отдельный образ/nginx.

## Лицензия

Укажите лицензию при публикации (например, добавьте файл `LICENSE` в корень репозитория).
