// 구글 로그인 유틸리티

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

// 구글 사용자 정보 인터페이스
export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

// 구글 SDK 로드
export const loadGoogleSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('브라우저 환경이 아닙니다.'));
      return;
    }

    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      if (window.google) {
        resolve();
      } else {
        reject(new Error('구글 SDK 로드 실패'));
      }
    };
    script.onerror = () => reject(new Error('구글 SDK 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
};

// 간단한 구글 로그인 (버튼 클릭)
export const googleLogin = (): Promise<GoogleUser> => {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('구글 SDK가 로드되지 않았습니다.'));
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error('구글 클라이언트 ID가 설정되지 않았습니다. NEXT_PUBLIC_GOOGLE_CLIENT_ID 환경변수를 설정해주세요.'));
      return;
    }

    // 임시 버튼 엘리먼트 생성
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = '50%';
    tempDiv.style.left = '50%';
    tempDiv.style.transform = 'translate(-50%, -50%)';
    tempDiv.style.zIndex = '9999';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.borderRadius = '8px';
    tempDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    tempDiv.innerHTML = '<p style="margin-bottom: 10px; text-align: center;">구글 로그인</p>';
    
    document.body.appendChild(tempDiv);

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        try {
          const payload = JSON.parse(atob(response.credential.split('.')[1]));
          
          const userInfo: GoogleUser = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            given_name: payload.given_name,
            family_name: payload.family_name
          };

          // 임시 엘리먼트 제거
          document.body.removeChild(tempDiv);
          resolve(userInfo);
        } catch (error) {
          document.body.removeChild(tempDiv);
          reject(error);
        }
      }
    });

    // 버튼 렌더링
    window.google.accounts.id.renderButton(tempDiv, {
      theme: "filled_blue",
      size: "large",
      type: "standard",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left"
    });

    // 취소 버튼 추가
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '취소';
    cancelButton.style.marginTop = '10px';
    cancelButton.style.width = '100%';
    cancelButton.style.padding = '8px';
    cancelButton.style.backgroundColor = '#ef4444';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontWeight = '500';
    cancelButton.onmouseover = () => {
      cancelButton.style.backgroundColor = '#dc2626';
    };
    cancelButton.onmouseout = () => {
      cancelButton.style.backgroundColor = '#ef4444';
    };
    cancelButton.onclick = () => {
      document.body.removeChild(tempDiv);
      const cancelError = new Error('로그인이 취소되었습니다.');
      (cancelError as any).cancelled = true;
      reject(cancelError);
    };
    tempDiv.appendChild(cancelButton);
  });
};

// 구글 로그아웃
export const googleLogout = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
    
    // 로컬 스토리지 및 세션 스토리지 정리
    localStorage.removeItem('google_user');
    sessionStorage.removeItem('google_user');
    
    resolve();
  });
};

// 로그인 상태 확인
export const getGoogleLoginStatus = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 로컬 스토리지에서 사용자 정보 확인
    const storedUser = localStorage.getItem('google_user');
    resolve(!!storedUser);
  });
};

// 현재 로그인된 사용자 정보 가져오기
export const getCurrentGoogleUser = (): Promise<GoogleUser | null> => {
  return new Promise((resolve) => {
    try {
      const storedUser = localStorage.getItem('google_user');
      if (storedUser) {
        const userInfo = JSON.parse(storedUser);
        resolve(userInfo);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('저장된 사용자 정보 로드 실패:', error);
      resolve(null);
    }
  });
};

// 사용자 정보 로컬 저장
export const saveGoogleUserLocally = (user: GoogleUser): void => {
  try {
    localStorage.setItem('google_user', JSON.stringify(user));
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
  }
}; 