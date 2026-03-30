# Самара Детям — монорепозиторий

## Структура

- `frontend/` — клиент (React/Vite).
- `backend/` — API на FastAPI.

## Бэкенд: быстрый старт

1. Создайте виртуальное окружение Python 3.11+ и установите зависимости из корня проекта:

   ```bash
   pip install -r requirements.txt
   ```

2. Скопируйте `.env.example` в `.env` в **корне** репозитория (`samara/`) и заполните значения.

3. Запуск из каталога `backend/`:

   ```bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. Документация OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

## Docker Compose (разработка)

В корне `samara/`:

```bash
cp .env.example .env
# Укажите как минимум SECRET_KEY в .env
docker compose up --build
```

- API: [http://localhost:8000/docs](http://localhost:8000/docs)
- Фронтенд (Vite): [http://localhost:3000](http://localhost:3000)

Том `frontend_node_modules` сохраняет зависимости Node внутри контейнера; каталог `./backend` и `./frontend` смонтированы для автоперезапуска при изменении кода (`uvicorn --reload` и Vite HMR).

## Переменные окружения

См. файл `.env.example` в корне проекта.
