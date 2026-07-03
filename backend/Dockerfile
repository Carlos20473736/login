FROM node:22-alpine

WORKDIR /app

# Copiar arquivos de dependência
COPY package.json ./

# Instalar dependências com npm
RUN npm install

# Copiar código fonte
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
