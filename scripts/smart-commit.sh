#!/usr/bin/env bash
# smart-commit.sh — genera mensaje de commit basado en cambios staged
# Uso: ./scripts/smart-commit.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PREFIXES=(feat fix chore refactor test ci style docs perf revert build)
SCOPES=(clients schedule pricing navigation sync db shared config hooks ci)

# Gitmoji map: prefix -> default emoji (based on gitmoji.dev)
declare -A EMOJI_MAP=(
  [feat]="✨"    # sparkles  - new features
  [fix]="🐛"    # bug       - fix a bug
  [chore]="🔧"  # wrench    - config files
  [refactor]="♻️" # recycle  - refactor code
  [test]="✅"   # white_check_mark - add/update/pass tests
  [ci]="👷"     # construction_worker - CI build system
  [style]="🎨"  # art       - improve structure/format
  [docs]="📝"   # memo      - documentation
  [perf]="⚡️"  # zap       - performance
  [revert]="⏪️" # rewind    - revert changes
  [build]="📦️"  # package   - compiled files/packages
)

echo -e "${BLUE}[smart-commit]${NC} Cambios staged:"
echo ""
git diff --cached --name-status
echo ""

staged=$(git diff --cached --name-status)
if [ -z "$staged" ]; then
  echo -e "${RED}No hay cambios staged. Usa 'git add' antes de correr este script.${NC}"
  exit 1
fi

# Sugerir prefix por tipo de archivos
if echo "$staged" | grep -qE "test|spec"; then
  suggested_prefix="test"
elif echo "$staged" | grep -qE "\.yml|\.json|eslint|tsconfig|package"; then
  suggested_prefix="chore"
elif echo "$staged" | grep -qE "screen|Screen|navigator|Navigator"; then
  suggested_prefix="feat"
elif echo "$staged" | grep -qE "Repository|Impl"; then
  suggested_prefix="feat"
else
  suggested_prefix="feat"
fi

# Sugerir scope por rutas
if echo "$staged" | grep -q "clients"; then
  suggested_scope="clients"
elif echo "$staged" | grep -q "schedule"; then
  suggested_scope="schedule"
elif echo "$staged" | grep -q "pricing"; then
  suggested_scope="pricing"
elif echo "$staged" | grep -q "navigation"; then
  suggested_scope="navigation"
elif echo "$staged" | grep -q "data/local"; then
  suggested_scope="db"
elif echo "$staged" | grep -q "shared"; then
  suggested_scope="shared"
elif echo "$staged" | grep -q "workflows\|ci\|hooks"; then
  suggested_scope="ci"
else
  suggested_scope=""
fi

echo -e "${YELLOW}Prefijos disponibles:${NC} ${PREFIXES[*]}"
read -rp "Prefix [${suggested_prefix}]: " prefix
prefix="${prefix:-$suggested_prefix}"

# Obtener emoji sugerido
suggested_emoji="${EMOJI_MAP[$prefix]:-✨}"

echo ""
echo -e "${YELLOW}Scopes disponibles:${NC} ${SCOPES[*]}"
read -rp "Scope [${suggested_scope}]: " scope
scope="${scope:-$suggested_scope}"

echo ""
echo -e "${YELLOW}Gitmoji sugerido para '${prefix}':${NC} ${suggested_emoji}"
echo -e "Otros comunes: ✨🐛🚑️🩹🚨🔧🔨♻️🎨ⰰ️✅🧪👷💚📝💡📦️⬆️⬇️➕➖🔒️🏗️🗃️🏷️🦺✈️🚸🎉💥🔀"
echo -e "Referencia completa: https://gitmoji.dev"
read -rp "Emoji [${suggested_emoji}]: " emoji
emoji="${emoji:-$suggested_emoji}"

echo ""
read -rp "Descripción (en inglés, modo imperativo, max 50 chars): " description

if [ -z "$description" ]; then
  echo -e "${RED}La descripción es obligatoria.${NC}"
  exit 1
fi

# Construir mensaje con emoji
if [ -n "$scope" ]; then
  message="${prefix}(${scope}): ${emoji} ${description}"
else
  message="${prefix}: ${emoji} ${description}"
fi

# Validar longitud
len=${#message}
if [ "$len" -gt 72 ]; then
  echo -e "${YELLOW}⚠ El mensaje tiene ${len} caracteres (máximo recomendado: 72)${NC}"
fi

echo ""
echo -e "${GREEN}Mensaje generado:${NC}"
echo ""
echo "  $message"
echo ""
read -rp "¿Confirmar commit con este mensaje? [S/n]: " confirm
confirm="${confirm:-S}"

if [[ "$confirm" =~ ^[Ss]$ ]]; then
  git commit -m "$message"
  echo -e "${GREEN}[smart-commit] Commit realizado.${NC}"
else
  echo "Commit cancelado."
  exit 0
fi
