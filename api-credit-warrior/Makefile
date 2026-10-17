.PHONY: dev start test lint format migrate migrate-create help

# Ayuda por defecto
help:
	@echo "Comandos disponibles:"
	@echo "  make dev             - Inicia el servidor de desarrollo con hot-reload (tipo 'npm run dev')"
	@echo "  make start           - Inicia el servidor en modo producción"
	@echo "  make test            - Ejecuta la suite de pruebas con pytest (tipo 'npm test')"
	@echo "  make lint            - Revisa el código con ruff y mypy (tipo 'npm run lint')"
	@echo "  make format          - Formatea el código automáticamente"
	@echo "  make migrate         - Aplica las migraciones pendientes a PostgreSQL"
	@echo "  make migrate-create  - Genera una nueva migración con Alembic (ej: make migrate-create m=\"nombre\")"

# Equivalente a 'npm run dev' (hot-reload al guardar cambios)
dev:
	.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Equivalente a 'npm start' (producción)
start:
	.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4

# Equivalente a 'npm test'
test:
	.venv/bin/pytest -v

# Equivalente a 'npm run lint'
lint:
	.venv/bin/ruff check .
	.venv/bin/mypy app

# Formateo automático de código
format:
	.venv/bin/ruff format .
	.venv/bin/ruff check --fix .

# Migraciones de base de datos (tipo 'npx prisma migrate dev' o 'npx typeorm migration:run')
migrate:
	.venv/bin/alembic upgrade head

migrate-create:
	@if [ -z "$(m)" ]; then \
		echo "Error: Debes especificar un mensaje. Ejemplo: make migrate-create m=\"add_new_table\""; \
		exit 1; \
	fi
	.venv/bin/alembic revision --autogenerate -m "$(m)"
