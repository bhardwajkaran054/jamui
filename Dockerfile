# Use full Node 20 Bookworm for native compilation support
FROM node:20-bookworm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild sqlite3 for the container environment
RUN npm install && npm rebuild sqlite3

# Copy the rest of the application
COPY . .

# Ensure the database file is writable and in the correct place
RUN touch database.sqlite && chmod 666 database.sqlite

# Build the frontend for production
RUN npm run build

# Default port (Railway overrides this)
ENV PORT=5001

# Start the application
CMD ["npm", "start"]
