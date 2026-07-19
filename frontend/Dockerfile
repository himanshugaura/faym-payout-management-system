FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port 3001
EXPOSE 3001
ENV PORT=3001

# Start development server on port 3001
CMD ["npm", "run", "dev", "--", "-p", "3001"]
