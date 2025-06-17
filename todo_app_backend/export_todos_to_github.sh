#!/bin/bash

# Script to export incomplete TODOs from data.json to GitHub issues.

# Ensure jq and gh are installed
if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install jq."
    exit 1
fi

if ! command -v gh &> /dev/null
then
    echo "GitHub CLI (gh) could not be found. Please install gh."
    exit 1
fi

# Check if data.json exists
DATA_FILE="data.json"
if [ ! -f "$DATA_FILE" ]; then
    echo "Error: $DATA_FILE not found."
    exit 1
fi

# Read data.json and create issues for incomplete tasks
jq -c '.[] | select(.completed == false)' "$DATA_FILE" | while IFS= read -r todo_item; do
  task_title=$(echo "$todo_item" | jq -r '.task')

  if [ -n "$task_title" ]; then
    echo "Creating issue for task: $task_title"
    gh issue create --title "$task_title" --body "This issue was automatically created from a TODO item in $DATA_FILE."
    if [ $? -eq 0 ]; then
      echo "Successfully created issue: $task_title"
    else
      echo "Failed to create issue: $task_title"
    fi
  else
    echo "Skipping item with no task title: $todo_item"
  fi
done

echo "Finished exporting TODOs."
