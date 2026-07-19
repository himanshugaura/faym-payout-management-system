FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Expose port 3000
EXPOSE 3000
ENV PORT=3000

# Start development server on port 3000
CMD ["pnpm", "run", "dev", "--", "-p", "3000"]
