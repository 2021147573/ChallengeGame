# 챌린지게임

**배포 주소:** [https://challengegame.vercel.app/](https://challengegame.vercel.app/)

## 로컬 실행 방법

1. 이 저장소를 클론합니다.

```bash
git clone https://github.com/2021147573/ChallengeGame.git
cd challengegame
```

2. 패키지를 설치합니다. (pnpm 사용)

```bash
pnpm install
```

3. `.env.local` 파일을 프로젝트 루트에 생성하고, 다음과 같은 환경 변수를 추가합니다.

```
NAVER_CLOVA_OCR_APIGW_INVOKE_URL=your_clova_url
NAVER_CLOVA_OCR_SECRET_KEY=your_clova_secret_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

4. 로컬 서버를 실행합니다.

```bash
pnpm dev
```
프로덕션환경실행
```bash
pnpm build
pnpm start
```

5. 브라우저에서 `http://localhost:3000`에 접속하여 확인합니다.