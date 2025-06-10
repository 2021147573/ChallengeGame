'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleUser, loadGoogleSDK, googleLogin, googleLogout, getCurrentGoogleUser, saveGoogleUserLocally } from '../lib/google';
import { saveUser, getUser, User } from '../lib/database_simple';



// 더 강력한 한글 복원 함수
function decodeKoreanFromLatin1(text: string): string {
  try {
    // Latin-1로 잘못 해석된 UTF-8 바이트를 올바른 한글로 복원
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i));
    }
    const uint8Array = new Uint8Array(bytes);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
  } catch (error) {
    console.error('한글 복원 실패:', error);
    return text;
  }
}

// 사용자 컨텍스트 타입
interface UserContextType {
  user: User | null;
  googleUser: GoogleUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// 컨텍스트 생성
const UserContext = createContext<UserContextType | undefined>(undefined);

// 커스텀 훅
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// 프로바이더 컴포넌트
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 구글 SDK 초기화 및 로그인 상태 확인
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await loadGoogleSDK();
        await checkLoginStatus();
      } catch (error) {
        console.error('인증 초기화 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 로그인 상태 확인
  const checkLoginStatus = async () => {
    try {
      const currentGoogleUser = await getCurrentGoogleUser();
      
      if (currentGoogleUser) {
        setGoogleUser(currentGoogleUser);
        
        // 데이터베이스에서 사용자 정보 조회
        const userResult = await getUser(currentGoogleUser.id);
        
        // DB 응답에서 실제 사용자 데이터 추출
        let actualUserData = null;
        if (userResult.success && userResult.data) {
          // 중첩된 구조 처리: userResult.data.data에 실제 데이터가 있을 수 있음
          let rawData: unknown = userResult.data;
          
          // Apps Script에서 중첩된 응답을 보내는 경우 처리
          if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
            rawData = (rawData as { data: unknown }).data;
          }
          
          // 배열인 경우 첫 번째 요소 사용
          if (Array.isArray(rawData) && rawData.length > 0) {
            actualUserData = rawData[0];
          }
          // 객체이고 google_id가 있는 경우
          else if (typeof rawData === 'object' && rawData !== null && 'google_id' in rawData) {
            actualUserData = rawData;
          }
          // 객체의 값들 중에서 google_id가 있는 항목 찾기
          else if (typeof rawData === 'object' && rawData !== null) {
                      const values = Object.values(rawData);
          for (const value of values) {
            if (typeof value === 'object' && value !== null && 'google_id' in value) {
              actualUserData = value;
              break;
            }
          }
            
            // 여전히 못 찾았으면 배열 형태의 값 확인
            if (!actualUserData) {
              const arrayValues = values.filter(v => Array.isArray(v));
              for (const arr of arrayValues) {
                if (arr.length > 0 && arr[0] && typeof arr[0] === 'object' && arr[0] !== null && 'google_id' in arr[0]) {
                  actualUserData = arr[0];
                  break;
                }
              }
            }
          }
        }

        if (actualUserData) {
          setUser(actualUserData);
        } else {
          
          // DB에 정보가 없으면 새 사용자로 등록
          const fixedName = decodeKoreanFromLatin1(currentGoogleUser.name)
          
          const newUser: User = {
            google_id: currentGoogleUser.id,
            email: currentGoogleUser.email,
            name: fixedName,
            nickname: fixedName,
            profile_image: currentGoogleUser.picture
          };
          
          // 스프레드시트에 사용자 정보 저장
          try {
            const saveResult = await saveUser(newUser);
            if (!saveResult.success) {
              console.error('사용자 저장 실패:', saveResult.message);
            }
          } catch (error) {
            console.error('사용자 저장 중 오류:', error);
          }
          
          setUser(newUser);
        }
      }
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
    }
  };

  // 로그인
  const login = async () => {
    try {
      setIsLoading(true);
      
      let loginResult: GoogleUser;
      
      try {
        // 기본 로그인 시도
        loginResult = await googleLogin();
      } catch (error: unknown) {
        // 취소된 경우는 에러를 다시 던지지 않음
        if (error instanceof Error && (error as any).cancelled) {
          return; // 함수 종료, 에러 안 던짐
        }
        console.error('구글 로그인 실패:', error instanceof Error ? error.message : String(error));
        throw error;
      }
      
      setGoogleUser(loginResult);
      
      // 로컬 스토리지에 저장
      saveGoogleUserLocally(loginResult);

      // 데이터베이스에서 사용자 조회
      const googleId = loginResult.id;
      
      try {
        const userResult = await getUser(googleId);

        if (userResult.success && userResult.data) {
          // 중첩된 구조 처리
          let rawData: unknown = userResult.data;
          
          // Apps Script에서 중첩된 응답을 보내는 경우 처리
          if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
            rawData = (rawData as { data: unknown }).data;
          }
          
          let actualUserData = null;
          
          // 배열인 경우 첫 번째 요소 사용
          if (Array.isArray(rawData) && rawData.length > 0) {
            actualUserData = rawData[0];
          }
          // 객체이고 google_id가 있는 경우
          else if (typeof rawData === 'object' && rawData !== null && 'google_id' in rawData) {
            actualUserData = rawData;
          }
          
          if (actualUserData) {
            // 기존 사용자
            setUser(actualUserData);
          } else {
            // 신규 사용자로 처리
            const fixedName = decodeKoreanFromLatin1(loginResult.name)
            const newUser: User = {
              google_id: googleId,
              email: loginResult.email,
              name: fixedName,
              nickname: fixedName,
              profile_image: loginResult.picture
            };

            const saveResult = await saveUser(newUser);
            if (!saveResult.success) {
              console.error('사용자 저장 실패:', saveResult.message);
            }
            
            setUser(newUser);
          }
        } else {
          // 신규 사용자로 처리
          const fixedName = decodeKoreanFromLatin1(loginResult.name)
          const newUser: User = {
            google_id: googleId,
            email: loginResult.email,
            name: fixedName,
            nickname: fixedName,
            profile_image: loginResult.picture
          };

          const saveResult = await saveUser(newUser);
          if (!saveResult.success) {
            console.error('사용자 저장 실패:', saveResult.message);
          }
          
          setUser(newUser);
        }
      } catch (dbError) {
        console.error('데이터베이스 연동 실패:', dbError);
        // DB 연동 실패해도 로컬 로그인은 유지
        const fixedLocalName = decodeKoreanFromLatin1(loginResult.name)
        const localUser: User = {
          google_id: googleId,
          email: loginResult.email,
          name: fixedLocalName,
          nickname: fixedLocalName,
          profile_image: loginResult.picture
        };
        setUser(localUser);
        alert('데이터베이스 연동에 실패했지만 로컬에서 사용 가능합니다. 나중에 다시 시도해주세요.');
      }
    } catch (error: unknown) {
      console.error('로그인 실패:', error);
      alert(`로그인에 실패했습니다: ${error instanceof Error ? error.message : '다시 시도해주세요.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      setIsLoading(true);
      await googleLogout();
      setUser(null);
      setGoogleUser(null);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 정보 새로고침
  const refreshUser = async () => {
    if (googleUser) {
      const userResult = await getUser(googleUser.id);
      if (userResult.success && userResult.data) {
        setUser(userResult.data);
      }
    }
  };

  const value: UserContextType = {
    user,
    googleUser,
    isLoggedIn: !!user && !!googleUser,
    isLoading,
    login,
    logout,
    refreshUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}; 