#!/bin/bash

# Script to delete a generated module with all its related files
# Usage: ./delete-module.sh <module-name>

usage() {
  echo "Usage: $0 <module-name>"
  echo "Example: $0 reviews"
  exit 1
}

if [ -z "$1" ]; then
  usage
fi

MODULE_NAME="$1"
MODULE_DIR="src/modules/$MODULE_NAME"
INTERFACE_FILE="src/interfaces/$MODULE_NAME-service.interface.ts"
CONST_FILE="src/const/$MODULE_NAME.data.ts" # Optional if you create this manually

# Safety check
read -p "⚠️  Are you sure you want to permanently delete module '$MODULE_NAME'? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "❌ Aborted."
  exit 1
fi

# Delete module directory
if [ -d "$MODULE_DIR" ]; then
  rm -rf "$MODULE_DIR"
  echo "✅ Deleted module directory: $MODULE_DIR"
else
  echo "⚠️  Module directory not found: $MODULE_DIR"
fi

# Delete interface file
if [ -f "$INTERFACE_FILE" ]; then
  rm "$INTERFACE_FILE"
  echo "✅ Deleted interface file: $INTERFACE_FILE"
else
  echo "⚠️  Interface file not found: $INTERFACE_FILE"
fi

# Delete const/data file (optional)
if [ -f "$CONST_FILE" ]; then
  rm "$CONST_FILE"
  echo "✅ Deleted const file: $CONST_FILE"
else
  echo "⚠️  Const file not found: $CONST_FILE"
fi

echo "🧹 Clean up complete for module: $MODULE_NAME"
