#!/usr/bin/env bash
# start-emulator.sh — Arranca el emulador Android + Expo en un solo comando
# Uso: bash scripts/start-emulator.sh [avd-name]
# Si no se pasa AVD, usa el primero disponible.

set -e

export ANDROID_HOME="/home/developer/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

# Seleccionar AVD
AVD="${1:-}"
if [ -z "$AVD" ]; then
  AVD=$(emulator -list-avds 2>/dev/null | head -1)
fi

if [ -z "$AVD" ]; then
  echo "❌ No se encontró ningún AVD. Crea uno en Android Studio (Virtual Device Manager)."
  exit 1
fi

echo "📱 Arrancando emulador: $AVD"

# Verificar si ya hay un emulador corriendo
if adb devices 2>/dev/null | grep -q "emulator"; then
  echo "✅ Emulador ya está corriendo. Saltando arranque."
else
  # Arrancar emulador en background
  emulator -avd "$AVD" -no-snapshot-load &
  EMULATOR_PID=$!
  echo "⏳ Esperando que el emulador esté listo... (puede tomar ~30-60s)"

  # Esperar boot completo
  BOOTED=""
  TRIES=0
  until [ "$BOOTED" = "1" ] || [ $TRIES -gt 40 ]; do
    sleep 3
    BOOTED=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    TRIES=$((TRIES + 1))
    printf "."
  done
  echo ""

  if [ "$BOOTED" != "1" ]; then
    echo "⚠️  El emulador tardó demasiado. Puede estar iniciando en segundo plano."
    echo "   Espera a que aparezca la pantalla de inicio y ejecuta: npm run dev:android"
    exit 0
  fi

  echo "✅ Emulador listo."
fi

echo "🚀 Iniciando Expo en modo desarrollo..."
cd "$(dirname "$0")/.."
npm run dev:android
