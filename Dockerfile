FROM node:18

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libdrm2 \
    libgbm1 \
    libxshmfence1 \
    libegl1 \
    libgles2 \
    libxtst6 \
    libxss1 \
    libgtk-3-0 \
    lsb-release \
    xdg-utils \
    iputils-ping \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY src ./

# Run the application
# CMD ["node", "src/app.js"]
CMD ["tail", "-f", "/dev/null"]