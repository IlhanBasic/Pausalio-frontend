FROM node:22-alpine AS builder
WORKDIR /app

ARG API_URL=http://localhost:8080/api
ARG HUB_URL=http://localhost:8080
ARG GOOGLE_CLIENT_ID=736675084586-853jdc3pdf91tqtrqutf5mo2e1qt3jaq.apps.googleusercontent.com

COPY package*.json ./
RUN npm install --no-fund --no-audit

COPY . .
RUN cat > src/environments/environment.ts <<EOF
export const environment = {
  production: true,
  apiUrl: '${API_URL}',
  hubUrl: '${HUB_URL}',
  googleClientId: '${GOOGLE_CLIENT_ID}'
};
EOF

RUN npm run build -- --configuration production --output-path=dist-out

FROM nginx:1.27-alpine
COPY --from=builder /app/dist-out/browser /usr/share/nginx/html

RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
