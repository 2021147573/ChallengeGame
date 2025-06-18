# 챌린지게임

**배포 주소:** [https://challengegame.vercel.app/](https://challengegame.vercel.app/)

## 로컬 실행 방법

1. **Node.js 설치**  
   [https://nodejs.org](https://nodejs.org) 에 접속하여 LTS 버전의 Node.js를 설치합니다.  
   설치 시 `npm`도 함께 설치됩니다.

2. **pnpm 설치**  
   Node.js 설치 후, 아래 명령어로 pnpm을 전역 설치합니다.

   ```bash
   npm install -g pnpm
   ```

3. **이 저장소를 클론합니다.**

   ```bash
   git clone https://github.com/2021147573/ChallengeGame.git
   cd challengegame
   ```

4. **패키지를 설치합니다.**

   ```bash
   pnpm install
   ```

5. **`.env.local` 파일을 생성하고 환경 변수를 추가합니다.**  
   프로젝트 루트 디렉토리에 `.env.local` 파일을 만들고 다음 내용을 작성합니다.

   ```
   NAVER_CLOVA_OCR_APIGW_INVOKE_URL=your_clova_url
   NAVER_CLOVA_OCR_SECRET_KEY=your_clova_secret_key
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   ```

6. **로컬 서버를 실행합니다.**

   ```bash
   pnpm dev
   ```

   또는 **프로덕션 환경**으로 실행하려면 아래 명령어를 사용합니다:

   ```bash
   pnpm build
   pnpm start
   ```

7. **브라우저에서 접속합니다.**  
   로컬 서버가 실행되면 브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속합니다.
