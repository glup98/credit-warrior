#!/usr/bin/env bash
set -e

echo "==> Configurando base de datos PostgreSQL local para Credit Warrior..."

sudo -u postgres psql <<'EOF'
-- 1. Crear usuario si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'credit_warrior_app') THEN
    CREATE USER credit_warrior_app WITH PASSWORD 'credit_warrior_pass';
    RAISE NOTICE 'Usuario credit_warrior_app creado.';
  ELSE
    ALTER USER credit_warrior_app WITH PASSWORD 'credit_warrior_pass';
    RAISE NOTICE 'Usuario credit_warrior_app ya existe, password actualizado.';
  END IF;
END
$$;

-- 2. Crear base de datos asignando propietario
SELECT 'CREATE DATABASE credit_warrior OWNER credit_warrior_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'credit_warrior')\gexec

-- 3. Asegurar permisos en esquema public (PostgreSQL 15+)
\c credit_warrior
GRANT ALL ON SCHEMA public TO credit_warrior_app;
EOF

echo "==> Base de datos 'credit_warrior' y usuario 'credit_warrior_app' listos."
