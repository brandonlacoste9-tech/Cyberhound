# Use official Node.js lightweight image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --production

# Copy source code
COPY index.js .

# Expose port (Cloud Run sets this env var, usually 8080)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
