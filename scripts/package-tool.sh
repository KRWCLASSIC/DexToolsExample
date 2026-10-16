#!/usr/bin/env bash
# ==============================================================================
# DexTools Packaging Script for GitHub Actions / Linux CI
# Compiles upstream desktop JAR files into Android-compatible Multi-DEX containers (.dex.jar)
# ==============================================================================

set -euo pipefail

INPUT_JAR="${1:-}"
OUTPUT_NAME="${2:-}"
MIN_SDK="${3:-26}"

if [[ -z "$INPUT_JAR" ]]; then
    echo "Usage: $0 <path-to-input.jar> [output-name] [min-sdk]"
    exit 1
fi

if [[ ! -f "$INPUT_JAR" ]]; then
    echo "Error: Input file '$INPUT_JAR' does not exist."
    exit 1
fi

if [[ -z "$OUTPUT_NAME" ]]; then
    FILENAME=$(basename -- "$INPUT_JAR")
    OUTPUT_NAME="${FILENAME%.*}"
    OUTPUT_NAME=$(echo "$OUTPUT_NAME" | tr '[:upper:]' '[:lower:]')
fi

# Locate Android d8 compiler
if command -v d8 &> /dev/null; then
    D8_CMD="d8"
elif [[ -n "${ANDROID_HOME:-}" ]]; then
    D8_CMD=$(find "$ANDROID_HOME/build-tools" -name d8 -type f -executable 2>/dev/null | sort -V | tail -n 1)
else
    echo "Error: 'd8' not found in PATH and ANDROID_HOME is not set."
    exit 1
fi

echo "==> Using d8: $D8_CMD"
echo "==> Packaging: $INPUT_JAR -> ${OUTPUT_NAME}.dex.jar (min-sdk: $MIN_SDK)"

BUILD_DIR=$(mktemp -d -t dextools-build-XXXXXX)
trap 'rm -rf "$BUILD_DIR"' EXIT

# 1. Transpile JVM bytecode to Dalvik bytecode (Multi-DEX)
echo "==> Transpiling with d8..."
"$D8_CMD" --min-api "$MIN_SDK" --output "$BUILD_DIR" "$INPUT_JAR"

# 2. Package all classes*.dex into the output container
TARGET_JAR="${OUTPUT_NAME}.dex.jar"
echo "==> Creating ${TARGET_JAR}..."
(
    cd "$BUILD_DIR"
    zip -9 -q "$OLDPWD/$TARGET_JAR" classes*.dex
)

# 3. Calculate SHA-256 Checksum
SHA256_HASH=$(sha256sum "$TARGET_JAR" | awk '{print $1}')
echo "$SHA256_HASH" > "${TARGET_JAR}.sha256"

echo "=========================================================="
echo " SUCCESS: Built ${TARGET_JAR}"
echo " SHA-256: ${SHA256_HASH}"
echo "=========================================================="
