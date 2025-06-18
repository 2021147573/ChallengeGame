let ip = "null";
function getIP(json: any) {
  try {
    ip = json.ip;
  } catch {
    ip = 'unknown';
  }
}

if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://jsonip.com?format=jsonp&callback=getIP';
  script.type = 'application/javascript';
  (window as any).getIP = getIP;
  document.head.appendChild(script);
}

function getCookieValue(name: string): string | undefined {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
}

function setCookieValue(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getUVfromCookie(): string {
  const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const existingHash = getCookieValue("user");
  if (!existingHash) {
    setCookieValue("user", hash, 180);
    return hash;
  } else {
    return existingHash;
  }
}

function padValue(value: number): string {
  return (value < 10) ? "0" + value : value.toString();
}

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

function getDeviceType(): string {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

function getUTM(): string | null {
  const queryString = location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get("utm");
}

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

export const logVisitor = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

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
  }, 2000);
};

// 페이지뷰 추적
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

export async function trackPageViewSimple(pageName?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`페이지 조회: ${pageName || window.location.pathname}`);
  }
}