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
elif [[ -n "${BUILD_TOOLS_DIR:-}" && -x "$BUILD_TOOLS_DIR/d8" ]]; then
    D8_CMD="$BUILD_TOOLS_DIR/d8"
elif [[ -n "${ANDROID_HOME:-}" ]]; then
    D8_CMD=$(find "$ANDROID_HOME/build-tools" -name d8 -type f -executable 2>/dev/null | sort -V | tail -n 1)
else
    D8_CMD=$(find "${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}/build-tools" -name d8 -type f -executable 2>/dev/null | sort -V | tail -n 1)
fi

if [[ -z "$D8_CMD" || ! -x "$D8_CMD" ]]; then
    echo "Error: Could not find an executable d8 binary."
    exit 1
fi

TARGET_JAR="${OUTPUT_NAME}.dex.jar"
rm -f "$TARGET_JAR"

echo "==> Using d8: $D8_CMD"
echo "==> Transpiling $INPUT_JAR -> $TARGET_JAR (min-sdk: $MIN_SDK)..."

# Passing a .jar or .zip output path causes d8 to create the archive containing
# classes.dex, classes2.dex (Multi-DEX) and automatically preserve non-class resources
"$D8_CMD" --min-api "$MIN_SDK" --output "$TARGET_JAR" "$INPUT_JAR"

# Calculate SHA-256 Checksum
SHA256_HASH=$(sha256sum "$TARGET_JAR" | awk '{print $1}')
echo "$SHA256_HASH" > "${TARGET_JAR}.sha256"

echo "=========================================================="
echo " SUCCESS: Built ${TARGET_JAR}"
echo " SHA-256: ${SHA256_HASH}"
echo "=========================================================="
