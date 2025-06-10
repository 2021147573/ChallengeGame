// 간단한 데이터베이스 유틸리티 (CORS 문제 해결용)

// 타임스탬프 생성
function getTimeStamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const padValue = (value: number): string => (value < 10) ? "0" + value : value.toString();
  return `${year}-${padValue(month)}-${padValue(day)} ${padValue(hours)}:${padValue(minutes)}:${padValue(seconds)}`;
}

// 서버 API를 통한 요청 함수
async function makeRequest(endpoint: string, data?: any): Promise<any> {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
  
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// GET 요청을 위한 함수
async function makeGetRequest(endpoint: string, params?: any): Promise<any> {
  let url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    if (searchParams.toString()) {
      url += '?' + searchParams.toString();
    }
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// 사용자 인터페이스 정의
export interface User {
  google_id: string;
  email: string;
  name: string;
  nickname?: string;
  profile_image?: string;
  team_id?: string;
  created_at?: string;
}

export interface Team {
  team_code: string;
  name: string;
  description?: string;
  creator_id: string;
  created_at?: string;
}

export interface TeamMember {
  google_id: string;
  name: string;
  email: string;
  profile_image?: string;
  joined_at: string;
  role?: string;
}

export interface StepRecord {
  user_google_id: string;
  team_id: string;
  steps: number;
  date: string;
  extracted_text?: string;
  matched_pattern?: string;
  confidence?: number;
  created_at?: string;
}

// 호환성을 위한 인터페이스
export interface StepData {
  user_name: string;
  team_name: string;
  steps: number;
  date: string;
  confidence: number;
  extracted_text?: string;
  matched_pattern?: string;
}

// 사용자 관리 (UPSERT: google_id 기준으로 존재하면 업데이트, 없으면 삽입)
export const saveUser = async (userData: User): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    if (!userData.google_id) {
      return {
        success: false,
        message: 'google_id가 필요합니다.'
      };
    }

    const requestData = {
      action: 'upsert',
      table: 'users',
      data: {
        ...userData,
        created_at: getTimeStamp()
      }
    };

    console.log('사용자 UPSERT 요청 (google_id 기준):', requestData);
    console.log('대상 google_id:', userData.google_id);
    
    const result = await makeRequest('database', requestData);
    console.log('UPSERT 결과:', result);
    
    return result;
  } catch (error) {
    console.error('사용자 저장 실패:', error);
    return {
      success: false,
      message: '사용자 저장에 실패했습니다.'
    };
  }
};

export const getUser = async (googleId: string): Promise<{ success: boolean; data?: User; message?: string }> => {
  try {
    const requestData = {
      action: 'get',
      table: 'users',
      data: { google_id: googleId }
    };

    const result = await makeRequest('database', requestData);
    return result;
  } catch (error) {
    console.error('사용자 조회 실패:', error);
    return {
      success: false,
      message: '사용자 조회에 실패했습니다.'
    };
  }
};

// 팀 관리
export const createTeam = async (teamData: Omit<Team, 'team_code'>): Promise<{ success: boolean; message?: string; data?: Team }> => {
  try {
    console.log('=== 팀 생성 및 자동 가입 시작 ===');
    console.log('입력 데이터:', teamData);

    // 1. 팀 생성
    const requestData = {
      action: 'insertTeam',
      table: 'teams',
      data: teamData
    };
    
    console.log('전송할 요청 데이터:', requestData);
    const result = await makeRequest('database', requestData);
    console.log('팀 생성 API 호출 결과:', result);
    console.log('result.success:', result.success);
    console.log('result.data:', result.data);
    console.log('result.message:', result.message);

    if (!result.success) {
      console.error('팀 생성 실패:', result.message);
      return {
        success: false,
        message: result.message || '팀 생성에 실패했습니다.'
      };
    }

    // result.data 구조 확인
    let createdTeam = result.data;
    console.log('원본 createdTeam:', createdTeam);
    
    // 중첩된 구조 처리
    if (createdTeam && typeof createdTeam === 'object' && createdTeam.success && createdTeam.data) {
      console.log('중첩된 구조 감지, 내부 data 추출');
      createdTeam = createdTeam.data;
    }
    
    console.log('최종 createdTeam:', createdTeam);

    if (!createdTeam || !createdTeam.team_code) {
      console.error('팀 코드가 없는 응답:', createdTeam);
      return {
        success: false,
        message: '팀 생성에 성공했으나 팀 코드를 받지 못했습니다.'
      };
    }

    console.log('생성된 팀:', createdTeam);

    // 2. 생성자를 팀에 자동 가입 (리더 역할)
    console.log('팀 생성자 자동 가입 시작');
    const joinResult = await joinTeam(createdTeam.team_code, teamData.creator_id);
    console.log('자동 가입 결과:', joinResult);

    if (!joinResult.success) {
      console.warn('팀 생성은 성공했으나 자동 가입 실패:', joinResult.message);
      // 팀은 생성되었으므로 성공으로 처리하되 메시지에 경고 포함
      return {
        success: true,
        data: createdTeam,
        message: `팀이 생성되었지만 자동 가입에 실패했습니다: ${joinResult.message}`
      };
    }

    console.log('팀 생성 및 자동 가입 완료');
    return {
      success: true,
      data: createdTeam,
      message: '팀이 성공적으로 생성되고 가입되었습니다.'
    };

  } catch (error) {
    console.error('팀 생성 실패:', error);
    return {
      success: false,
      message: '팀 생성 중 오류가 발생했습니다.'
    };
  }
};

export const joinTeam = async (teamCode: string, googleId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const requestData = {
      action: 'insert',
      table: 'team_members',
      data: {
        google_id: googleId,
        team_code: teamCode,
        joined_at: getTimeStamp()
      }
    };

    await makeRequest('database', requestData);
    return { success: true };
  } catch (error) {
    console.error('팀 가입 실패:', error);
    return {
      success: false,
      message: '팀 가입에 실패했습니다.'
    };
  }
};

// 사용자별 걸음수 정보 조회
export const getUserStepsInfo = async (googleId: string): Promise<{ 
  success: boolean; 
  data?: { 
    todaySteps: number; 
    totalSteps: number; 
    lastUpdateDate: string | null; 
  }; 
  message?: string 
}> => {
  try {
    console.log('=== 사용자 걸음수 정보 조회 ===');
    console.log('대상 사용자 ID:', googleId);

    const requestData = {
      action: 'getUserStepsInfo',
      table: 'step_records',
      google_id: googleId
    };

    console.log('전송할 요청 데이터:', requestData);
    const result = await makeRequest('database', requestData);
    console.log('사용자 걸음수 정보 결과:', result);

    if (result.success) {
      // 중첩된 구조 처리: result.data.data에 실제 데이터가 있을 수 있음
      let actualData = result.data;
      
      // Apps Script에서 중첩된 응답을 보내는 경우 처리
      if (actualData && typeof actualData === 'object' && actualData.success && actualData.data) {
        actualData = actualData.data;
        console.log('중첩된 구조에서 실제 데이터 추출:', actualData);
      }
      
      if (actualData) {
        return {
          success: true,
          data: {
            todaySteps: actualData.todaySteps || 0,
            totalSteps: actualData.totalSteps || 0,
            lastUpdateDate: actualData.lastUpdateDate || null
          }
        };
      }
      
      // actualData가 없지만 성공인 경우 (데이터 없음)
      return {
        success: true,
        data: {
          todaySteps: 0,
          totalSteps: 0,
          lastUpdateDate: null
        }
      };
    }

    // 실패한 경우
    console.error('getUserStepsInfo 실패:', result.message);
    return {
      success: true, // UI에서는 성공으로 처리하되 0으로 표시
      data: {
        todaySteps: 0,
        totalSteps: 0,
        lastUpdateDate: null
      }
    };
  } catch (error) {
    console.error('사용자 걸음수 정보 조회 실패:', error);
    return {
      success: false,
      message: '사용자 걸음수 정보 조회에 실패했습니다.'
    };
  }
};

export const getUserTeams = async (googleId: string): Promise<{ success: boolean; data?: Team[]; message?: string }> => {
  try {
    const requestData = {
      action: 'get',
      table: 'user_teams',
      data: { google_id: googleId }
    };

    const result = await makeRequest('database', requestData);

    if (result.success && result.data) {
      let teams = [];
      
      // Apps Script가 중첩된 구조로 응답하는 경우 처리
      let actualData = result.data;
      if (actualData && typeof actualData === 'object' && actualData.success && actualData.data) {
        actualData = actualData.data;
      }
      
      if (Array.isArray(actualData)) {
        teams = actualData;
      } else if (typeof actualData === 'object') {
        const values = Object.values(actualData);
        
        if (values.length >= 2 && Array.isArray(values[1])) {
          teams = values[1];
        } else {
          const arrayValues = values.filter(v => Array.isArray(v));
          teams = arrayValues.flat();
        }
      }
      
      // team_code가 유효한 팀만 필터링
      const validTeams = teams.filter((t: any) => t && t.team_code && t.team_code !== '');
      
      return {
        success: true,
        data: validTeams
      };
    } else {
      return {
        success: true,
        data: []
      };
    }
  } catch (error) {
    console.error('사용자 팀 목록 조회 실패:', error);
    return {
      success: true,
      data: [],
      message: '사용자 팀 목록 조회에 실패했습니다.'
    };
  }
};

export const getTeamMembers = async (teamCode: string): Promise<{ success: boolean; data?: TeamMember[]; message?: string }> => {
  try {
    console.log('=== getTeamMembers 함수 시작 ===');
    console.log('요청할 팀 코드:', teamCode);
    console.log('팀 코드 타입:', typeof teamCode);
    console.log('팀 코드 길이:', teamCode.length);
    
    if (!teamCode || teamCode.trim() === '') {
      console.error('팀 코드가 비어있습니다');
      return {
        success: false,
        message: '팀 코드가 필요합니다.'
      };
    }
    
    const requestData = {
      action: 'get',
      table: 'team_members',
      team_code: teamCode.trim()  // 직접 파라미터로 전달
    };

    console.log('요청 데이터:', requestData);
    const result = await makeRequest('database', requestData);
    console.log('팀 멤버 조회 원본 결과:', result);

    if (result.success && result.data) {
      let members = [];
      
      // Apps Script 응답 데이터 파싱
      let actualData = result.data;
      
      // 중첩된 구조인 경우 처리
      if (actualData && typeof actualData === 'object' && actualData.success && actualData.data) {
        actualData = actualData.data;
      }
      
      if (Array.isArray(actualData)) {
        members = actualData;
      } else if (typeof actualData === 'object') {
        const values = Object.values(actualData);
        console.log('Object values:', values);
        
        // values[1]이 배열인 경우 (일반적인 Apps Script 응답 패턴)
        if (values.length >= 2 && Array.isArray(values[1])) {
          members = values[1];
        } else {
          // 다른 형태의 배열 찾기
          const arrayValues = values.filter(v => Array.isArray(v));
          members = arrayValues.flat();
        }
      }
      
      console.log('파싱된 멤버 데이터:', members);
      console.log('멤버 수:', members.length);
      
      // 각 멤버의 team_code 확인 (디버깅용)
      members.forEach((member, index) => {
        console.log(`멤버 ${index + 1}:`, {
          google_id: member.google_id,
          team_code: member.team_code,
          name: member.name,
          email: member.email
        });
      });
      
      // Google Apps Script에서 이미 필터링되었지만, 안전을 위해 한 번 더 필터링
      const filteredMembers = members.filter((member: any) => 
        member && 
        member.google_id && 
        member.team_code === teamCode.trim()
      );
      
      console.log('최종 필터링된 멤버들:', filteredMembers);
      
      return {
        success: true,
        data: filteredMembers
      };
    } else {
      console.log('팀 멤버 조회 실패 또는 데이터 없음:', result.message);
      return {
        success: true,
        data: [],
        message: result.message || '팀 멤버를 찾을 수 없습니다.'
      };
    }
  } catch (error) {
    console.error('팀 멤버 조회 실패:', error);
    return {
      success: false,
      data: [],
      message: '팀 멤버 조회에 실패했습니다.'
    };
  }
};



// 호환성을 위한 함수들
export const saveStepRecord = async (stepData: StepData): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    // stepData에서 실제 google_id와 team_code 추출
    const userGoogleId = stepData.user_name; // 실제로는 google_id가 전달됨
    const teamCode = stepData.team_name; // 실제로는 team_code가 전달됨

    const requestData = {
      action: 'insert', // Apps Script에서 table에 따라 InsertStepRecord 호출
      table: 'step_records',
      data: {
        user_google_id: userGoogleId,
        team_code: teamCode,
        steps: stepData.steps,
        date: stepData.date,
        extracted_text: stepData.extracted_text || '',
        matched_pattern: stepData.matched_pattern || '',
        confidence: stepData.confidence || 0,
        created_at: getTimeStamp()
      }
    };
    
    const result = await makeRequest('database', requestData);
    
    if (result.success) {
      return {
        success: true,
        message: result.message || '걸음수가 성공적으로 저장되었습니다.',
        data: result.data
      };
    } else {
      return {
        success: false,
        message: result.message || '걸음수 저장에 실패했습니다.'
      };
    }
    
  } catch (error) {
    console.error('걸음수 저장 실패:', error);
    return {
      success: false,
      message: '걸음수 저장 중 오류가 발생했습니다.'
    };
  }
};

export const getTeamRankings = async (): Promise<{ success: boolean; data?: any[]; message?: string }> => {
  try {
    // 1. 모든 걸음수 기록 조회
    const stepRecordsResult = await makeRequest('database', {
      action: 'read',
      table: 'step_records',
      data: {}
    });
    
    // Apps Script 응답에서 실제 데이터 추출
    let stepRecords = [];
    if (stepRecordsResult.success && stepRecordsResult.data) {
      if (Array.isArray(stepRecordsResult.data)) {
        stepRecords = stepRecordsResult.data;
      } else if (typeof stepRecordsResult.data === 'object') {
        const values = Object.values(stepRecordsResult.data);
        if (values.length >= 2 && Array.isArray(values[1])) {
          stepRecords = values[1];
        } else {
          stepRecords = values.filter(v => Array.isArray(v)).flat();
        }
      }
    }
    
    if (stepRecords.length === 0) {
      return { 
        success: true, 
        data: [
          { name: '데이터 없음', steps: 0, rank: 1 }
        ]
      };
    }
    
    // 2. 팀별 걸음수 합계 계산
    const teamSteps: { [key: string]: number } = {};
    
    stepRecords.forEach((record: any) => {
      // team_code 또는 team_id 필드를 확인 (둘 다 비어있으면 NO_TEAM)
      const teamCode = record.team_code || record.team_id || record.team_name || 'NO_TEAM';
      const steps = parseInt(record.steps) || 0;
      
      if (teamSteps[teamCode]) {
        teamSteps[teamCode] += steps;
      } else {
        teamSteps[teamCode] = steps;
      }
    });
    
    // 3. 팀 정보 조회
    const teamsResult = await makeRequest('database', {
      action: 'read', 
      table: 'teams',
      data: {}
    });
    
    // 팀 데이터 파싱
    let teamsData = [];
    if (teamsResult.success && teamsResult.data) {
      if (Array.isArray(teamsResult.data)) {
        teamsData = teamsResult.data;
      } else if (typeof teamsResult.data === 'object') {
        const values = Object.values(teamsResult.data);
        if (values.length >= 2 && Array.isArray(values[1])) {
          teamsData = values[1];
        } else {
          teamsData = values.filter(v => Array.isArray(v)).flat();
        }
      }
    }
    
    // 4. 팀 이름과 걸음수 매핑
    const rankings: any[] = [];
    
    // 실제 팀 데이터 사용
    teamsData.forEach((team: any) => {
      const teamCode = team.team_code;
      const teamName = team.name || teamCode;
      const totalSteps = teamSteps[teamCode] || 0;
      
      const teamData = {
        name: teamName,
        total_steps: totalSteps, // page.tsx에서 사용하는 필드명으로 변경
        steps: totalSteps, // 기존 호환성을 위해 유지
        member_count: 0, // 일단 0으로 설정, 나중에 멤버 수 계산 추가 가능
        rank: 0 // 나중에 설정
      };
      
      rankings.push(teamData);
    });
    
    // NO_TEAM 데이터가 있으면 추가
    if (teamSteps['NO_TEAM'] && teamSteps['NO_TEAM'] > 0) {
      rankings.push({
        name: '개인 참가자',
        total_steps: teamSteps['NO_TEAM'],
        steps: teamSteps['NO_TEAM'],
        member_count: 0,
        rank: 0
      });
    }
    
    // 걸음수 기준으로 정렬하고 순위 설정
    rankings.sort((a, b) => (b.total_steps || 0) - (a.total_steps || 0));
    rankings.forEach((team, index) => {
      team.rank = index + 1;
    });
    
    return { success: true, data: rankings };
    
  } catch (error) {
    console.error('팀 랭킹 조회 실패:', error);
    // 에러 시 더미 데이터 반환
    return { 
      success: true, 
      data: [
        { name: '오류 발생', steps: 0, rank: 1 }
      ]
    };
  }
};

// 모든 팀 목록 조회 (가입 가능한 팀들)
export const getAllTeams = async (): Promise<{ success: boolean; data?: (Team & { memberCount: number })[]; message?: string }> => {
  try {
    // 1. 모든 팀 데이터 조회 (기존 read 액션 사용)
    const teamsResult = await makeRequest('database', {
      action: 'read',
      table: 'teams',
      data: {}
    });
    
    if (!teamsResult.success || !teamsResult.data) {
      return { success: true, data: [] };
    }
    
    // 데이터가 배열이 아니면 배열로 변환 시도
    let teamsArray: any[] = [];
    if (Array.isArray(teamsResult.data)) {
      teamsArray = teamsResult.data;
    } else if (typeof teamsResult.data === 'object') {
      // 객체인 경우 값들을 배열로 변환
      const values = Object.values(teamsResult.data);
      
      // Apps Script 응답 구조: {success: true, data: [...]}
      // Object.values()하면 [true, [...]] 형태가 됨
      if (values.length >= 2 && Array.isArray(values[1])) {
        teamsArray = values[1];
      } else {
        teamsArray = values.filter(v => Array.isArray(v)).flat();
      }
    } else {
      return { success: true, data: [] };
    }
    
    // 2. 팀 멤버 데이터 조회
    const membersResult = await makeRequest('database', {
      action: 'read',
      table: 'team_members',
      data: {}
    });
    
    // 3. 팀별 멤버 수 계산
    const memberCounts: { [key: string]: number } = {};
    
    if (membersResult.success && membersResult.data) {
      let membersArray: any[] = [];
      if (Array.isArray(membersResult.data)) {
        membersArray = membersResult.data;
      } else if (typeof membersResult.data === 'object') {
        const values = Object.values(membersResult.data);
        
        if (values.length >= 2 && Array.isArray(values[1])) {
          membersArray = values[1];
        } else {
          membersArray = values.filter(v => Array.isArray(v)).flat();
        }
      }
      
      membersArray.forEach((member: any) => {
        const teamCode = member.team_code;
        if (teamCode && teamCode !== '') {
          memberCounts[teamCode] = (memberCounts[teamCode] || 0) + 1;
        }
      });
    }
    
    // 4. team_code가 있는 팀만 필터링하고 멤버 수 추가
    const validTeams = teamsArray
      .filter((team: any) => {
        return team && team.team_code && team.team_code !== '';
      })
      .map((team: any) => ({
        ...team,
        memberCount: memberCounts[team.team_code] || 0
      }));
    
    return { success: true, data: validTeams };
    
  } catch (error) {
    console.error('모든 팀 목록 조회 실패:', error);
    return {
      success: true,
      data: [],
      message: '팀 목록 조회에 실패했습니다.'
    };
  }
};

// 팀 가입 (3명 제한 + 중복 가입 방지)
export const joinTeamWithLimit = async (teamCode: string, googleId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    // 1. 사용자의 현재 팀 목록 확인 (중복 가입 방지)
    const userTeamsResult = await getUserTeams(googleId);
    
    if (userTeamsResult.success && userTeamsResult.data && userTeamsResult.data.length > 0) {
      const userTeamCodes = userTeamsResult.data.map(team => team.team_code);
      
      if (userTeamCodes.includes(teamCode)) {
        return {
          success: false,
          message: '이미 이 팀에 가입되어 있습니다.'
        };
      }

      if (userTeamCodes.length > 0) {
        console.log('다른 팀에 이미 가입되어 있음:', userTeamCodes);
        return {
          success: false,
          message: `이미 다른 팀(${userTeamsResult.data[0].name})에 가입되어 있습니다. 팀을 변경하려면 먼저 탈퇴해주세요.`
        };
      }
    }

    // 2. 팀 멤버 수 확인 (정원 체크)
    console.log('2단계: 팀 정원 체크');
    const membersResult = await getTeamMembers(teamCode);
    console.log('팀 멤버 조회 결과:', membersResult);
    
    if (membersResult.success && membersResult.data) {
      const memberCount = Array.isArray(membersResult.data) ? membersResult.data.length : 0;
      console.log('현재 멤버 수:', memberCount);
      
      if (memberCount >= 3) {
        return {
          success: false,
          message: '팀 정원이 가득찼습니다. (최대 3명)'
        };
      }
    }

    // 3. 팀 가입 실행
    console.log('3단계: 팀 가입 실행');
    const result = await makeRequest('database', {
      action: 'insert',
      table: 'team_members',
      data: {
        team_code: teamCode,
        google_id: googleId,
        role: 'member',
        joined_at: getTimeStamp()
      }
    });

    console.log('팀 가입 결과:', result);

    if (result.success) {
      return {
        success: true,
        message: '팀에 성공적으로 가입되었습니다!'
      };
    } else {
      return {
        success: false,
        message: result.message || '팀 가입에 실패했습니다.'
      };
    }

  } catch (error) {
    console.error('팀 가입 실패:', error);
    return {
      success: false,
      message: '팀 가입 중 오류가 발생했습니다.'
    };
  }
};

// 팀의 오늘 걸음수 가져오기
export const getTeamTodaySteps = async (teamCode: string): Promise<{ success: boolean; data?: number; message?: string }> => {
  try {
    console.log('=== 팀 오늘 걸음수 조회 시작 ===');
    console.log('팀 코드:', teamCode);
    
    if (!teamCode || teamCode.trim() === '') {
      return {
        success: false,
        message: '팀 코드가 필요합니다.'
      };
    }
    
    const requestData = {
      action: 'getTeamTodaySteps',
      table: 'step_records',
      team_code: teamCode.trim()
    };

    console.log('오늘 걸음수 요청 데이터:', requestData);
    const result = await makeRequest('database', requestData);
    console.log('팀 오늘 걸음수 조회 결과:', result);

    if (result.success && typeof result.data === 'number') {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: true,
        data: 0,
        message: result.message || '오늘 걸음수 데이터를 찾을 수 없습니다.'
      };
    }
  } catch (error) {
    console.error('팀 오늘 걸음수 조회 실패:', error);
    return {
      success: false,
      data: 0,
      message: '팀 오늘 걸음수 조회에 실패했습니다.'
    };
  }
}; 