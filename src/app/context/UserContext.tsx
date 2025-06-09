'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleUser, loadGoogleSDK, googleLogin, googleLogout, getCurrentGoogleUser, saveGoogleUserLocally } from '../lib/google';
import { saveUser, getUser, User } from '../lib/database_simple';

// UTF-8 바이트를 올바른 한글로 변환하는 함수
function fixKoreanEncoding(text: string): string {
  try {
    // 이미 깨진 한글을 UTF-8 바이트로 변환한 후 다시 디코딩
    const bytes = new TextEncoder().encode(text);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (error) {
    console.error('한글 인코딩 수정 실패:', error);
    return text; // 실패하면 원본 반환
  }
}

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
      console.log('=== 로그인 상태 확인 시작 ===');
      const currentGoogleUser = await getCurrentGoogleUser();
      console.log('저장된 구글 사용자:', currentGoogleUser);
      console.log('구글 사용자 ID:', currentGoogleUser?.id);
      console.log('구글 사용자 이메일:', currentGoogleUser?.email);
      console.log('구글 사용자 이름:', currentGoogleUser?.name);
      
      if (currentGoogleUser) {
        setGoogleUser(currentGoogleUser);
        console.log('구글 사용자 정보 설정 완료');
        
        // 데이터베이스에서 사용자 정보 조회
        const userResult = await getUser(currentGoogleUser.id);
        console.log('DB 사용자 조회 결과 전체:', userResult);
        console.log('DB 사용자 조회 success:', userResult.success);
        console.log('DB 사용자 조회 data:', userResult.data);
        console.log('DB 사용자 조회 data 타입:', typeof userResult.data);
        
        // DB 응답에서 실제 사용자 데이터 추출
        let actualUserData = null;
        if (userResult.success && userResult.data) {
          console.log('DB 응답 구조 분석:', userResult.data);
          
          // 중첩된 구조 처리: userResult.data.data에 실제 데이터가 있을 수 있음
          let rawData: any = userResult.data;
          
          // Apps Script에서 중첩된 응답을 보내는 경우 처리
          if (rawData && typeof rawData === 'object' && rawData.success && rawData.data) {
            console.log('중첩된 구조 감지, 내부 data 추출');
            rawData = rawData.data;
          }
          
          console.log('파싱할 원본 데이터:', rawData);
          
          // 배열인 경우 첫 번째 요소 사용
          if (Array.isArray(rawData) && rawData.length > 0) {
            actualUserData = rawData[0];
            console.log('배열에서 첫 번째 요소 추출:', actualUserData);
          }
          // 객체이고 google_id가 있는 경우
          else if (typeof rawData === 'object' && rawData !== null && rawData.google_id) {
            actualUserData = rawData;
            console.log('객체에서 직접 사용자 데이터 추출:', actualUserData);
          }
          // 객체의 값들 중에서 google_id가 있는 항목 찾기
          else if (typeof rawData === 'object' && rawData !== null) {
            const values = Object.values(rawData);
            for (const value of values) {
              if (typeof value === 'object' && value !== null && (value as any).google_id) {
                actualUserData = value;
                console.log('객체 값에서 사용자 데이터 발견:', actualUserData);
                break;
              }
            }
            
            // 여전히 못 찾았으면 배열 형태의 값 확인
            if (!actualUserData) {
              const arrayValues = values.filter(v => Array.isArray(v));
              for (const arr of arrayValues) {
                if (arr.length > 0 && arr[0] && typeof arr[0] === 'object' && arr[0].google_id) {
                  actualUserData = arr[0];
                  console.log('배열 값에서 사용자 데이터 발견:', actualUserData);
                  break;
                }
              }
            }
          }
          
          console.log('최종 추출된 사용자 데이터:', actualUserData);
        }

        if (actualUserData) {
          setUser(actualUserData);
          console.log('DB 사용자 정보 설정 완료:', actualUserData);
        } else {
          console.log('DB에 사용자 정보 없음, 새 사용자로 등록');
          console.log('userResult.success:', userResult.success);
          console.log('userResult.data:', userResult.data);
          
          // DB에 정보가 없으면 새 사용자로 등록
          console.log('=== 구글 사용자 원본 데이터 확인 ===')
          console.log('구글 사용자 이름 원본:', currentGoogleUser.name)
          console.log('구글 사용자 이름 길이:', currentGoogleUser.name.length)
          console.log('구글 사용자 이름 charCodeAt:', Array.from(currentGoogleUser.name).map(char => char.charCodeAt(0)))
          
          // 한글 인코딩 수정 시도
          const fixedName = decodeKoreanFromLatin1(currentGoogleUser.name)
          console.log('수정된 이름:', fixedName)
          console.log('수정된 이름 charCodeAt:', Array.from(fixedName).map(char => char.charCodeAt(0)))
          
          const newUser: User = {
            google_id: currentGoogleUser.id,
            email: currentGoogleUser.email,
            name: fixedName,
            nickname: fixedName,
            profile_image: currentGoogleUser.picture
          };
          console.log('새 사용자 정보 생성:', newUser);
          
          // 스프레드시트에 사용자 정보 저장
          try {
            const saveResult = await saveUser(newUser);
            console.log('사용자 DB 저장 결과:', saveResult);
            
            if (saveResult.success) {
              console.log('✅ 새 사용자가 스프레드시트에 저장되었습니다');
            } else {
              console.error('❌ 사용자 저장 실패:', saveResult.message);
            }
          } catch (error) {
            console.error('❌ 사용자 저장 중 오류:', error);
          }
          
          setUser(newUser);
        }
      } else {
        console.log('저장된 구글 사용자 정보 없음');
      }
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
    }
  };

  // 로그인
  const login = async () => {
    try {
      setIsLoading(true);
      console.log('구글 로그인 시도 시작');
      
      let loginResult: GoogleUser;
      
      try {
        // 기본 로그인 시도
        loginResult = await googleLogin();
        console.log('기본 구글 로그인 성공');
      } catch (error: any) {
        console.error('구글 로그인 실패:', error.message);
        throw error;
      }
      
      setGoogleUser(loginResult);
      
      // 로컬 스토리지에 저장
      saveGoogleUserLocally(loginResult);

      // 데이터베이스에서 사용자 조회
      const googleId = loginResult.id;
      console.log('구글 로그인 성공, 사용자 정보 조회 시도:', googleId);
      
      try {
        const userResult = await getUser(googleId);
        console.log('사용자 조회 결과:', userResult);

        if (userResult.success && userResult.data) {
          // 중첩된 구조 처리
          let rawData: any = userResult.data;
          
          // Apps Script에서 중첩된 응답을 보내는 경우 처리
          if (rawData && typeof rawData === 'object' && rawData.success && rawData.data) {
            console.log('로그인 시 중첩된 구조 감지, 내부 data 추출');
            rawData = rawData.data;
          }
          
          let actualUserData = null;
          
          // 배열인 경우 첫 번째 요소 사용
          if (Array.isArray(rawData) && rawData.length > 0) {
            actualUserData = rawData[0];
          }
          // 객체이고 google_id가 있는 경우
          else if (typeof rawData === 'object' && rawData !== null && rawData.google_id) {
            actualUserData = rawData;
          }
          
          if (actualUserData) {
            // 기존 사용자
            setUser(actualUserData);
            console.log('기존 사용자 로그인 완료:', actualUserData);
          } else {
            console.log('사용자 데이터 파싱 실패, 신규 사용자로 처리');
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
            console.log('사용자 저장 결과:', saveResult);
            
            setUser(newUser);
            console.log('신규 사용자 등록 완료');
          }
        } else {
          console.log('사용자 데이터 파싱 실패, 신규 사용자로 처리');
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
          console.log('사용자 저장 결과:', saveResult);
          
          setUser(newUser);
          console.log('신규 사용자 등록 완료');
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
    } catch (error: any) {
      console.error('로그인 실패:', error);
      alert(`로그인에 실패했습니다: ${error.message || '다시 시도해주세요.'}`);
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
      console.log('로그아웃 완료');
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