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

## Миграции базы данных

### Docker (проще всего)

Бэкенд при **каждом старте** применяет недостающие изменения схемы (см. `backend/main.py`, lifespan): например, колонка `reviews.engagement_rating` добавляется через `ALTER TABLE ... IF NOT EXISTS`. Достаточно пересобрать и запустить стек:

```bash
docker compose up --build
```

Отдельно гонять SQL не обязательно, если поднимается актуальный код бэкенда.

### Ручной SQL в контейнере PostgreSQL

Если нужно применить скрипт из `backend/migrations/` вручную (имя сервиса и учётные данные возьмите из своего `docker-compose.yml` и `.env`; ниже — типичные `postgres`, пользователь и БД из `.env.example`):

```bash
docker compose exec -T postgres psql -U samara -d samara_children -f - < backend/migrations/add_review_engagement_rating.sql
```

Или одной командой:

```bash
docker compose exec postgres psql -U samara -d samara_children -c "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS engagement_rating INTEGER; UPDATE reviews SET engagement_rating = rating WHERE engagement_rating IS NULL;"
```

Убедитесь, что контейнер с PostgreSQL уже запущен (`docker compose up -d postgres` или полный compose).

### Alembic (если настроен в проекте)

Если в корне репозитория есть `alembic.ini` и каталог `alembic/`, переменная `DATABASE_URL` в `.env` должна указывать на ту же БД (для async — `postgresql+asyncpg://...`). Из корня, с venv и установленным `requirements.txt`:

```bash
alembic upgrade head
```

Новая ревизия по моделям:

```bash
alembic revision --autogenerate -m "описание"
alembic upgrade head
```

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
