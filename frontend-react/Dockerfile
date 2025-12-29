# --- STAGE 1: Build the React App ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application for production
# This creates a 'dist' folder with the static files
RUN npm run build

# --- STAGE 2: Serve the App with Nginx ---
FROM nginx:1.25-alpine

# Copy the built static files from the 'builder' stage to Nginx's web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration file
# This file tells Nginx how to handle API proxying and client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# The default Nginx command will start the server
CMD ["nginx", "-g", "daemon off;"]