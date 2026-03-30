FROM node:20-alpine

WORKDIR /app

# Ensure HTTPS requests work reliably (CA bundle for outbound TLS).
RUN apk add --no-cache ca-certificates

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY jest.config.cjs ./
COPY .env.test ./.env.test

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Expose port
EXPOSE 3000

# Run the application
CMD ["npm", "run", "dev"]
