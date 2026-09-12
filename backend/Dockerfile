FROM node:20-alpine
WORKDIR /app

# Install deps first so this layer is cached unless package.json changes.
COPY backend/package*.json ./
RUN npm install

# App source + the SQL migration the app runs on startup.
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY db ./db

EXPOSE 4000
CMD ["npm", "start"]
