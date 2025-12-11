#!/bin/bash

# FontMinify Docker startup script

set -e

echo "🚀 Starting FontMinify Docker environment..."

# Start Xvfb (X Virtual Framebuffer) for headless GUI
echo "📺 Starting Xvfb display server..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

# Start window manager
echo "🪟 Starting window manager..."
fluxbox &
WM_PID=$!

# Optional: Start VNC server for remote GUI access
if [ "$ENABLE_VNC" = "true" ]; then
    echo "🔗 Starting VNC server on port 5900..."
    x11vnc -display :99 -nopw -listen 0.0.0.0 -xkb -forever -shared &
    VNC_PID=$!
    
    # Start noVNC web server
    echo "🌐 Starting noVNC web interface on port 6080..."
    websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
    NOVNC_PID=$!
fi

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$NOVNC_PID" ]; then
        kill $NOVNC_PID 2>/dev/null || true
    fi
    if [ ! -z "$VNC_PID" ]; then
        kill $VNC_PID 2>/dev/null || true
    fi
    kill $WM_PID 2>/dev/null || true
    kill $XVFB_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

echo "✅ Environment ready!"
echo "📍 Display: $DISPLAY"
echo "📁 Working directory: $(pwd)"

# Check if we should run a specific command
if [ $# -gt 0 ]; then
    echo "🏃 Running command: $@"
    exec "$@"
else
    # Default: start interactive shell
    echo "🐚 Starting interactive shell..."
    echo "Available commands:"
    echo "  npm test          - Run unit tests"
    echo "  npm run test:e2e  - Run E2E tests"
    echo "  npm run dev       - Start development mode"
    echo "  npm run build     - Build the application"
    exec /bin/bash
fi