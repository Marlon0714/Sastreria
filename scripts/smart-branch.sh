#!/usr/bin/env bash
# smart-branch.sh — crea una rama con nombre estandarizado
# Uso: ./scripts/smart-branch.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TYPES=(feature fix chore refactor test ci)
SCOPES=(clients schedule pricing navigation sync db shared config)

echo -e "${BLUE}[smart-branch]${NC} Crear rama estandarizada"
echo ""
echo -e "${YELLOW}Rama actual:${NC} $(git branch --show-current)"
echo ""

echo -e "${YELLOW}Tipos disponibles:${NC} ${TYPES[*]}"
read -rp "Tipo [feature]: " type
type="${type:-feature}"

echo ""
echo -e "${YELLOW}Scopes disponibles:${NC} ${SCOPES[*]}"
read -rp "Scope (opcional): " scope

echo ""
read -rp "Descripción corta en kebab-case (ej: client-list-screen): " desc

if [ -z "$desc" ]; then
  echo -e "${RED}La descripción es obligatoria.${NC}"
  exit 1
fi

# Normalizar: minúsculas, espacios a guiones, quitar caracteres especiales
desc=$(echo "$desc" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')

if [ -n "$scope" ]; then
  branch_name="${type}/${scope}-${desc}"
else
  branch_name="${type}/${desc}"
fi

# Validar longitud
len=${#branch_name}
if [ "$len" -gt 50 ]; then
  echo -e "${YELLOW}⚠ El nombre tiene ${len} caracteres (máximo recomendado: 50)${NC}"
fi

echo ""
echo -e "${GREEN}Rama propuesta:${NC}"
echo ""
echo "  $branch_name"
echo ""

# Mostrar ramas existentes para detección de conflicto
existing=$(git branch --list "$branch_name")
if [ -n "$existing" ]; then
  echo -e "${YELLOW}⚠ Esta rama ya existe localmente.${NC}"
fi

read -rp "¿Crear desde develop y cambiar a esta rama? [S/n]: " confirm
confirm="${confirm:-S}"

if [[ "$confirm" =~ ^[Ss]$ ]]; then
  current=$(git branch --show-current)
  if [ "$current" != "develop" ]; then
    echo "Cambiando a develop primero..."
    git checkout develop 2>/dev/null || { echo -e "${RED}No existe rama develop. Créala primero.${NC}"; exit 1; }
  fi
  git checkout -b "$branch_name"
  echo -e "${GREEN}[smart-branch] Rama '${branch_name}' creada y activa.${NC}"
else
  echo "Operación cancelada."
  exit 0
fi
