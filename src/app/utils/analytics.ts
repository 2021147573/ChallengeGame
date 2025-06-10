// Google Apps Script URL (랜딩페이지와 동일)
;

// 랜딩페이지와 동일한 IP 가져오기 (JSONP 방식)
let ip = "null";
function getIP(json: any) {
  try {
    ip = json.ip;
  } catch {
    ip = 'unknown';
  }
}

// IP 주소 스크립트 로드 (랜딩페이지와 동일)
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://jsonip.com?format=jsonp&callback=getIP';
  script.type = 'application/javascript';
  (window as any).getIP = getIP;
  document.head.appendChild(script);
}

// 쿠키에서 값을 가져오는 함수 (랜딩페이지와 동일)
function getCookieValue(name: string): string | undefined {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
}

// 쿠키에 값을 저장하는 함수 (랜딩페이지와 동일)
function setCookieValue(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// 6자리 유저 ID 생성 (랜딩페이지와 동일)
function getUVfromCookie(): string {
  // 6자리 임의의 문자열 생성
  const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
  // 쿠키에서 기존 해시 값을 가져옴
  const existingHash = getCookieValue("user");
  // 기존 해시 값이 없으면, 새로운 해시 값을 쿠키에 저장
  if (!existingHash) {
    setCookieValue("user", hash, 180); // 쿠키 만료일은 6개월 
    return hash;
  } else {
    // 기존 해시 값이 있으면, 기존 값을 반환
    return existingHash;
  }
}

// 패딩 함수 (랜딩페이지와 동일)
function padValue(value: number): string {
  return (value < 10) ? "0" + value : value.toString();
}

// 타임스탬프 생성 (랜딩페이지와 동일)
function getTimeStamp(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const formattedDate = `${padValue(year)}-${padValue(month)}-${padValue(day)} ${padValue(hours)}:${padValue(minutes)}:${padValue(seconds)}`;

  return formattedDate;
}

// 디바이스 타입 감지 (랜딩페이지와 동일)
function getDeviceType(): string {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

// UTM 파라미터 가져오기 (랜딩페이지와 동일)
function getUTM(): string | null {
  const queryString = location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get("utm");
}

// Axios 동적 로드 함수
async function loadAxios(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).axios) {
      resolve((window as any).axios);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/axios/dist/axios.min.js';
    script.onload = () => resolve((window as any).axios);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 방문자 데이터 수집 및 저장 (서버 API 사용)
export const logVisitor = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  // 약간의 지연을 두어 IP 가져오기 완료 대기
  setTimeout(async () => {
    try {
      const visitorData = {
        id: getUVfromCookie(),
        landingUrl: window.location.href,
        ip: ip,
        referer: document.referrer,
        time_stamp: getTimeStamp(),
        utm: getUTM(),
        device: getDeviceType()
      };
    
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'insert',
        table: 'visitors',
        data: visitorData
      })
    });

    if (!response.ok) {
      console.error('방문자 로그 저장 실패:', response.status);
    }
  } catch (error) {
    console.error('방문자 로그 저장 실패:', error);
  }
  }, 2000); // 2초 대기 (IP 가져오기를 위해)
};

// 페이지뷰 추적 (서버 API 사용)
export const trackPageView = async (page: string): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const pageViewData = {
      id: getUVfromCookie(),
      page: page,
      url: window.location.href,
      time_stamp: getTimeStamp(),
      device: getDeviceType()
    };

    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'insert',
        table: 'pageviews',
        data: pageViewData
      })
    });

    if (!response.ok) {
      console.error('페이지뷰 추적 실패:', response.status);
    }
  } catch (error) {
    console.error('페이지뷰 추적 실패:', error);
  }
};

// 간단한 페이지 추적 (이전 함수와의 호환성)
export async function trackPageViewSimple(pageName?: string) {
  // 개발 환경에서만 로그 출력
  if (process.env.NODE_ENV === 'development') {
    console.log(`페이지 조회: ${pageName || window.location.pathname}`);
  }
}