# 1. 베이스 이미지 설정 (호환성이 더 좋은 slim 버전으로 변경)
FROM node:20-slim

# 2. pnpm 설치
RUN npm install -g pnpm

# Prisma가 OpenSSL 버전을 올바르게 감지할 수 있도록 openssl 패키지를 설치 (에러 메시지가 지시한 내용)
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

# 3. 작업 디렉토리 설정
WORKDIR /usr/src/app

# 4. 의존성 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# 5. 소스 코드 복사
COPY . .

# 6. Prisma 클라이언트 생성
RUN pnpm prisma generate

# 7. 애플리케이션 빌드
RUN pnpm build

# 8. 프로덕션 환경 설정
ENV NODE_ENV production

# 9. 애플리케이션 포트 노출
EXPOSE 3001

# 10. 애플리케이션 실행
CMD ["node", "dist/main"] 