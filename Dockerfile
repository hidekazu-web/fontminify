# FontMinify Development Docker Environment
FROM node:20-bullseye

# Install system dependencies for Electron and GUI testing
RUN apt-get update && apt-get install -y \
    # X11 and GUI dependencies
    xvfb \
    x11vnc \
    novnc \
    websockify \
    fluxbox \
    x11-xserver-utils \
    xfonts-base \
    xfonts-75dpi \
    xfonts-100dpi \
    # Audio dependencies
    libasound2-dev \
    # GTK dependencies for Electron
    libgtk-3-0 \
    libgbm-dev \
    libxss1 \
    libgconf-2-4 \
    libxtst6 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    # Build tools
    python3 \
    make \
    g++ \
    # Font handling
    fontconfig \
    fonts-noto \
    fonts-noto-cjk \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Set up display for GUI applications
ENV DISPLAY=:99
ENV NODE_ENV=development

# Create app directory
WORKDIR /app

# Create a non-root user for security
RUN groupadd -r fontminify && useradd -r -g fontminify -m fontminify
RUN chown -R fontminify:fontminify /app

# Copy package files first as root
COPY package*.json ./

# Install dependencies as root first
RUN npm ci

# Then switch to non-root user
USER fontminify

# Copy source code
COPY --chown=fontminify:fontminify . .

# Create directories for testing
RUN mkdir -p /app/test-fonts /app/test-output

# Expose VNC port for GUI access (optional)
EXPOSE 5900

# Create startup script
USER root
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh
USER fontminify

# Default command
CMD ["/start.sh"]