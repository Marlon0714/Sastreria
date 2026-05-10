#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
DIST_DIR="$ROOT_DIR/dist/apk"
LOG_DIR="$ROOT_DIR/dist/logs"
PID_FILE="$LOG_DIR/apk-build.pid"
LOG_FILE="$LOG_DIR/apk-build.log"
LOCAL_PROPERTIES_FILE="$ANDROID_DIR/local.properties"

usage() {
  cat <<USAGE
Usage:
  scripts/build-apk-bg.sh start [debug|release] [--install]
  scripts/build-apk-bg.sh status
  scripts/build-apk-bg.sh logs
  scripts/build-apk-bg.sh stop
USAGE
}

detect_android_sdk() {
  if [[ -n "${ANDROID_SDK_ROOT:-}" && -d "${ANDROID_SDK_ROOT:-}" ]]; then
    echo "$ANDROID_SDK_ROOT"
    return
  fi

  if [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME:-}" ]]; then
    echo "$ANDROID_HOME"
    return
  fi

  if [[ -d "$HOME/Android/Sdk" ]]; then
    echo "$HOME/Android/Sdk"
    return
  fi

  if [[ -d "/home/developer/Android/Sdk" ]]; then
    echo "/home/developer/Android/Sdk"
    return
  fi

  echo ""
}

write_local_properties() {
  local sdk_path="$1"
  printf 'sdk.dir=%s\n' "$sdk_path" >"$LOCAL_PROPERTIES_FILE"
}

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

start_build() {
  local variant="${1:-debug}"
  local install_flag="${2:-}"
  local task
  local apk_source
  local sdk_path

  case "$variant" in
    debug)
      task="assembleDebug"
      apk_source="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
      ;;
    release)
      task="assembleRelease"
      apk_source="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
      ;;
    *)
      echo "Invalid variant: $variant"
      usage
      exit 1
      ;;
  esac

  sdk_path="$(detect_android_sdk)"
  if [[ -z "$sdk_path" ]]; then
    echo "Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT."
    echo "Expected default path: $HOME/Android/Sdk"
    exit 1
  fi

  mkdir -p "$DIST_DIR" "$LOG_DIR"

  if is_running; then
    echo "Build already running. PID: $(cat "$PID_FILE")"
    echo "Check logs: $LOG_FILE"
    exit 1
  fi

  write_local_properties "$sdk_path"

  {
    echo "[$(date -Iseconds)] Starting APK build ($variant)"
    echo "[$(date -Iseconds)] Android SDK: $sdk_path"
    echo "[$(date -Iseconds)] Running Gradle task: $task"

    export ANDROID_HOME="$sdk_path"
    export ANDROID_SDK_ROOT="$sdk_path"
    export PATH="$PATH:$sdk_path/platform-tools:$sdk_path/emulator"

    cd "$ANDROID_DIR"
    ./gradlew "$task"

    if [[ ! -f "$apk_source" ]]; then
      echo "[$(date -Iseconds)] ERROR: APK not found at $apk_source"
      exit 1
    fi

    local stamp
    stamp="$(date +%Y%m%d-%H%M%S)"
    local apk_target
    apk_target="$DIST_DIR/sastreria-$variant-$stamp.apk"

    cp "$apk_source" "$apk_target"
    ln -sfn "$apk_target" "$DIST_DIR/latest-$variant.apk"

    echo "[$(date -Iseconds)] APK ready: $apk_target"
    echo "[$(date -Iseconds)] Symlink: $DIST_DIR/latest-$variant.apk"

    if [[ "$install_flag" == "--install" ]]; then
      if command -v adb >/dev/null 2>&1; then
        echo "[$(date -Iseconds)] Installing APK via adb..."
        adb install -r "$apk_target"
        echo "[$(date -Iseconds)] Install finished"
      else
        echo "[$(date -Iseconds)] WARNING: adb not found; skipping install"
      fi
    fi

    echo "[$(date -Iseconds)] Build completed successfully"
  } >"$LOG_FILE" 2>&1 &

  local pid=$!
  echo "$pid" >"$PID_FILE"

  echo "Build started in background. PID: $pid"
  echo "Logs: $LOG_FILE"
}

show_status() {
  if is_running; then
    echo "Build is running. PID: $(cat "$PID_FILE")"
    echo "Logs: $LOG_FILE"
  else
    if [[ -f "$PID_FILE" ]]; then
      rm -f "$PID_FILE"
    fi
    echo "No build running"
    if [[ -f "$LOG_FILE" ]]; then
      echo "Last log: $LOG_FILE"
      tail -n 20 "$LOG_FILE" || true
    fi
  fi
}

show_logs() {
  if [[ -f "$LOG_FILE" ]]; then
    tail -f "$LOG_FILE"
  else
    echo "No log file yet: $LOG_FILE"
  fi
}

stop_build() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill "$pid"
    rm -f "$PID_FILE"
    echo "Stopped build process PID: $pid"
  else
    if [[ -f "$PID_FILE" ]]; then
      rm -f "$PID_FILE"
    fi
    echo "No running build to stop"
  fi
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    start)
      start_build "${2:-debug}" "${3:-}"
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs
      ;;
    stop)
      stop_build
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
