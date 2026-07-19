FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Push DB schema and start server
CMD ["sh", "-c", "npx prisma db push && pnpm start"]
