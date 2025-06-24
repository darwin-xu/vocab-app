#!/bin/bash

# Session Management Database Migration Script
# This script creates the necessary tables for persistent session storage

echo "Creating session management tables..."

# Apply the session schema to your D1 database
# Replace 'vocab_db' with your actual database name if different

wrangler d1 execute vocab_db --file=sessions_schema.sql

echo "Session management tables created successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy the updated worker: wrangler deploy"
echo "2. Test session persistence by logging in and restarting the worker"
echo "3. Check the debug panel for session analytics"
echo ""
echo "The app now supports:"
echo "- Persistent sessions that survive worker restarts"
echo "- Smart error handling that doesn't logout on first error"
echo "- Session health monitoring and analytics"
echo "- Proper server-side session invalidation"
