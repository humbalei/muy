# ExifTool Video Spoofer - Production Container
FROM node:20-slim

# Install ExifTool
RUN apt-get update && \
    apt-get install -y --no-install-recommends libimage-exiftool-perl && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy server code
COPY exiftool-server.js ./

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "exiftool-server.js"]
