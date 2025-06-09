'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { 
  createTeam, 
  joinTeamWithLimit, 
  getUserTeams, 
  leaveTeam, 
  getTeamMembers, 
  getAllTeams,
  getTeamRankings,
  getUserStepsInfo,
  getTeamTodaySteps,
  Team,
  TeamMember
} from '../lib/database_simple'

interface TeamManagerProps {
  onTeamChange?: () => void
}

export default function TeamManager({ onTeamChange }: TeamManagerProps) {
  const { user, isLoggedIn } = useUser()
  const [userTeams, setUserTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [memberStepsInfo, setMemberStepsInfo] = useState<{[key: string]: {todaySteps: number, totalSteps: number, lastUpdateDate: string | null}}>({})
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [availableTeams, setAvailableTeams] = useState<(Team & { memberCount: number })[]>([])
  
  // 팀 통계 상태
  const [teamStats, setTeamStats] = useState({
    totalSteps: 0,
    averageSteps: 0,
    todaySteps: 0,
    teamRank: 0
  })
  
  // 폼 상태
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')

  const loadUserTeams = async () => {
    if (!user) return
    
    try {
      setInitialLoading(true)
      const result = await getUserTeams(user.google_id)
      
      if (result.success && result.data) {
        const teams = Array.isArray(result.data) ? result.data : []
        console.log('로드된 사용자 팀들:', teams)
        setUserTeams(teams)
        if (teams.length > 0 && !selectedTeam) {
          console.log('첫 번째 팀을 선택합니다:', teams[0])
          setSelectedTeam(teams[0])
        }
      } else {
        console.log('사용자 팀 로드 실패:', result.message)
        setUserTeams([])
      }
    } catch (error) {
      console.error('팀 목록 로드 실패:', error)
      setUserTeams([])
    } finally {
      setInitialLoading(false)
    }
  }

  const loadAvailableTeams = async () => {
    setTeamsLoading(true)
    try {
      console.log('=== 가입 가능한 팀 목록 로드 시작 ===')
      const result = await getAllTeams()
      console.log('getAllTeams 결과:', result)
      
      if (result.success && result.data) {
        if (!Array.isArray(result.data)) {
          setAvailableTeams([]);
          return;
        }
        
        const userTeamCodes = userTeams.map(team => team.team_code)
        const filteredTeams = result.data.filter(team => {
          return !userTeamCodes.includes(team.team_code);
        });
        
        console.log('필터링된 가입 가능한 팀들:', filteredTeams)
        setAvailableTeams(filteredTeams)
      } else {
        setAvailableTeams([])
      }
    } catch (error) {
      console.error('가입 가능한 팀 목록 로드 실패:', error)
      setAvailableTeams([])
    } finally {
      setTeamsLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    if (!selectedTeam) {
      console.log('선택된 팀이 없어서 멤버 로드 건너뜀')
      setTeamMembers([])
      setMemberStepsInfo({})
      return
    }

    try {
      console.log('=== 팀 멤버 로드 시작 ===')
      console.log('선택된 팀:', selectedTeam)
      console.log('팀 코드:', selectedTeam.team_code)
      
      const result = await getTeamMembers(selectedTeam.team_code)
      console.log('getTeamMembers 결과:', result)
      
      if (result.success && result.data) {
        const members = Array.isArray(result.data) ? result.data : []
        console.log('파싱된 멤버 배열:', members)
        
        // 각 멤버의 정보를 자세히 로그
        members.forEach((member, index) => {
          console.log(`멤버 ${index + 1}:`, {
            google_id: member.google_id,
            name: member.name,
            email: member.email,
            profile_image: member.profile_image,
            role: member.role,
            joined_at: member.joined_at
          })
        })
        
        setTeamMembers(members)
        
        // 각 멤버의 걸음수 정보 로드
        console.log('멤버 걸음수 정보 로드 시작:', members.length, '명')
        const stepsInfoPromises = members.map(async (member) => {
          try {
            const stepsResult = await getUserStepsInfo(member.google_id)
            console.log(`${member.name || member.google_id} 걸음수 정보:`, stepsResult)
            return {
              google_id: member.google_id,
              stepsInfo: stepsResult.success && stepsResult.data ? stepsResult.data : {
                todaySteps: 0,
                totalSteps: 0,
                lastUpdateDate: null
              }
            }
          } catch (error) {
            console.error(`멤버 ${member.name} 걸음수 정보 로드 실패:`, error)
            return {
              google_id: member.google_id,
              stepsInfo: {
                todaySteps: 0,
                totalSteps: 0,
                lastUpdateDate: null
              }
            }
          }
        })
        
        const stepsInfoResults = await Promise.all(stepsInfoPromises)
        const stepsInfoMap: {[key: string]: any} = {}
        
        stepsInfoResults.forEach(result => {
          stepsInfoMap[result.google_id] = result.stepsInfo
        })
        
        console.log('멤버 걸음수 정보 로드 완료:', stepsInfoMap)
        setMemberStepsInfo(stepsInfoMap)
      } else {
        console.log('팀 멤버 데이터 없음 또는 실패:', result.message)
        setTeamMembers([])
        setMemberStepsInfo({})
      }
    } catch (error) {
      console.error('팀 멤버 로드 실패:', error)
      setTeamMembers([])
      setMemberStepsInfo({})
    }
  }

  const loadTeamStats = async () => {
    if (!selectedTeam) {
      setTeamStats({
        totalSteps: 0,
        averageSteps: 0,
        todaySteps: 0,
        teamRank: 0
      })
      return
    }

    try {
      // 팀 랭킹 데이터에서 팀 순위만 가져오기
      const rankingsResult = await getTeamRankings()
      let teamRank = 0
      
      if (rankingsResult.success && rankingsResult.data) {
        const currentTeamRanking = rankingsResult.data.find(
          (team: any) => team.name === selectedTeam.name
        )
        teamRank = currentTeamRanking?.rank || 0
      }
      
      // 멤버 데이터가 있는 경우 직접 계산
      if (teamMembers.length > 0 && Object.keys(memberStepsInfo).length > 0) {
        // 각 멤버의 총 걸음수와 오늘 걸음수 수집
        const memberTotalSteps = Object.values(memberStepsInfo).map(info => info.totalSteps || 0)
        const memberTodaySteps = Object.values(memberStepsInfo).map(info => info.todaySteps || 0)
        
        // 팀 전체 통계 계산
        const totalSteps = memberTotalSteps.reduce((sum, steps) => sum + steps, 0)
        const todaySteps = memberTodaySteps.reduce((sum, steps) => sum + steps, 0)
        const averageSteps = Math.round(totalSteps / teamMembers.length)
        
        console.log('팀 통계 계산:', {
          teamMembers: teamMembers.length,
          memberTotalSteps,
          memberTodaySteps,
          totalSteps,
          todaySteps,
          averageSteps,
          teamRank
        })
        
        setTeamStats({
          totalSteps,
          averageSteps,
          todaySteps,
          teamRank
        })
      } else {
        // 멤버 데이터가 없는 경우 0으로 설정
        console.log('멤버 데이터 없음, 기본값 설정')
        setTeamStats({
          totalSteps: 0,
          averageSteps: 0,
          todaySteps: 0,
          teamRank
        })
      }
      
    } catch (error) {
      console.error('팀 통계 로드 실패:', error)
      setTeamStats({
        totalSteps: 0,
        averageSteps: 0,
        todaySteps: 0,
        teamRank: 0
      })
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !teamName.trim()) return

    setLoading(true)
    try {
             const result = await createTeam({
         name: teamName.trim(),
         description: teamDescription.trim(),
         creator_id: user.google_id
       })

      if (result.success) {
        setTeamName('')
        setTeamDescription('')
        setShowCreateForm(false)
        await loadUserTeams()
        onTeamChange?.()
        alert('팀이 성공적으로 생성되었습니다!')
      } else {
        alert(result.message || '팀 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('팀 생성 실패:', error)
      alert('팀 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinTeam = async (teamCode: string) => {
    if (!user) return

    setLoading(true)
    try {
      console.log('=== 팀 가입 시작 ===')
      console.log('팀 코드:', teamCode)
      console.log('사용자 ID:', user.google_id)
      
      const result = await joinTeamWithLimit(teamCode, user.google_id)
      console.log('팀 가입 결과:', result)
      
      if (result.success) {
        console.log('팀 가입 성공, 데이터 새로고침 시작')
        await loadUserTeams()
        await loadAvailableTeams()
        setShowJoinForm(false)
        onTeamChange?.()
        alert('팀에 성공적으로 가입했습니다!')
      } else {
        console.error('팀 가입 실패:', result.message)
        alert(result.message || '팀 가입에 실패했습니다.')
      }
    } catch (error) {
      console.error('팀 가입 중 예외 발생:', error)
      alert('팀 가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveTeam = async (teamCode: string) => {
    if (!user || !confirm('정말로 팀을 탈퇴하시겠습니까?')) return

    setLoading(true)
    try {
      const result = await leaveTeam(teamCode, user.google_id)
      
      if (result.success) {
        await loadUserTeams()
        setSelectedTeam(null)
        onTeamChange?.()
        alert('팀에서 탈퇴했습니다.')
      } else {
        alert(result.message || '팀 탈퇴에 실패했습니다.')
      }
    } catch (error) {
      console.error('팀 탈퇴 실패:', error)
      alert('팀 탈퇴 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn && user) {
      loadUserTeams()
    }
  }, [isLoggedIn, user])

  useEffect(() => {
    if (userTeams.length > 0) {
      loadAvailableTeams()
    }
  }, [userTeams])

  useEffect(() => {
    console.log('=== selectedTeam 변경됨 ===');
    console.log('새로운 selectedTeam:', selectedTeam);
    if (selectedTeam) {
      console.log('팀 정보:', {
        name: selectedTeam.name,
        team_code: selectedTeam.team_code,
        description: selectedTeam.description,
        creator_id: selectedTeam.creator_id
      });
    }
    
    loadTeamMembers()
  }, [selectedTeam])

  // 팀 멤버 정보가 로드된 후 팀 통계 계산
  useEffect(() => {
    if (selectedTeam && memberStepsInfo && Object.keys(memberStepsInfo).length > 0) {
      loadTeamStats()
    }
  }, [selectedTeam, memberStepsInfo])

  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">팀 관리</h2>
          <p className="text-gray-600">팀 기능을 사용하려면 로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  // 초기 로딩 중
  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">팀 정보 로딩 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    )
  }

  // 가입한 팀이 없는 경우 - 팀 생성/가입 화면
  if (userTeams.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🏃‍♀️ 팀에 참가하세요!</h2>
          <p className="text-gray-600 text-lg">
            챌린지를 함께할 팀을 만들거나 기존 팀에 가입해보세요.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 팀 생성 카드 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">새 팀 만들기</h3>
            <p className="text-gray-600 mb-6">
              친구들과 함께 새로운 팀을 만들어 챌린지에 도전해보세요.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 font-medium"
              disabled={loading}
            >
              팀 생성하기
            </button>
          </div>

          {/* 팀 가입 카드 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">기존 팀 가입</h3>
            <p className="text-gray-600 mb-6">
              이미 만들어진 팀에 가입하여 함께 목표를 달성해보세요.
            </p>
            <button
              onClick={() => {
                setShowJoinForm(true)
                loadAvailableTeams()
              }}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium"
              disabled={loading}
            >
              팀 가입하기
            </button>
          </div>
        </div>

        {/* 팀 생성 폼 모달 */}
        {showCreateForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* 블러 백그라운드 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md"></div>
            
            {/* 모달 컨텐츠 */}
            <div className="relative bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all duration-300 scale-100 hover:scale-[1.02] border border-gray-200/50 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">🚀 새 팀 생성</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateTeam}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    팀 이름 *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
                    placeholder="멋진 팀 이름을 입력하세요"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    팀 설명
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
                    placeholder="팀에 대한 간단한 설명을 입력하세요"
                    rows={3}
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 px-6 rounded-lg text-white font-medium transition-colors ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        생성 중...
                      </div>
                    ) : (
                      '팀 생성하기'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={loading}
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 팀 가입 폼 모달 */}
        {showJoinForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* 블러 백그라운드 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md"></div>
            
            {/* 모달 컨텐츠 */}
            <div className="relative bg-white rounded-2xl p-8 w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl transform transition-all duration-300 scale-100 hover:scale-[1.02] border border-gray-200/50 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">🤝 팀 가입하기</h3>
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[50vh]">
                {teamsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600">가입 가능한 팀을 찾고 있습니다...</p>
                  </div>
                ) : availableTeams.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">😔</div>
                    <p className="text-gray-500 text-lg">가입 가능한 팀이 없습니다.</p>
                    <p className="text-gray-400 text-sm mt-2">새로운 팀을 만들어보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableTeams.map((team) => (
                      <div
                        key={team.team_code}
                        className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-lg text-gray-800">{team.name}</h4>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            team.memberCount >= 3 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {team.memberCount}/3명
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                          {team.description || '팀 설명이 없습니다.'}
                        </p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleJoinTeam(team.team_code)}
                            disabled={loading || team.memberCount >= 3}
                            className={`py-2 px-6 rounded-lg text-sm font-medium transition-colors ${
                              team.memberCount >= 3
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : loading
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {team.memberCount >= 3 ? '정원 초과' : loading ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                가입 중...
                              </div>
                            ) : '가입하기'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={loading}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 팀이 있는 경우 - 팀 대시보드
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">🏆 {selectedTeam?.name || '팀을 선택하세요'}</h2>
          <p className="text-gray-600 mt-2 text-lg">{selectedTeam?.description || '팀 설명이 없습니다'}</p>
        </div>
        
        {/* 팀 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-3xl font-bold">
              {teamStats.totalSteps.toLocaleString()}
            </div>
            <div className="text-sm opacity-90">총 걸음수</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-3xl font-bold">
              {teamStats.averageSteps.toLocaleString()}
            </div>
            <div className="text-sm opacity-90">평균 걸음수</div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-3xl font-bold">
              {teamStats.todaySteps.toLocaleString()}
            </div>
            <div className="text-sm opacity-90">오늘 걸음수</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-3xl font-bold">
              {teamStats.teamRank > 0 ? `${teamStats.teamRank}위` : '-'}
            </div>
            <div className="text-sm opacity-90">팀 순위</div>
          </div>
        </div>

        {/* 팀 멤버 목록 */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h4 className="text-xl font-semibold text-gray-800 mb-4">👥 팀 멤버 ({teamMembers.length}/3명)</h4>
          {teamMembers.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <div className="text-4xl mb-2">👥</div>
              <p>멤버 정보를 불러올 수 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {teamMembers.map((member, index) => {
                const stepsInfo = memberStepsInfo[member.google_id] || {
                  todaySteps: 0,
                  totalSteps: 0,
                  lastUpdateDate: null
                }
                
                const challengerNumber = index + 1
                const isCurrentUser = user && member.google_id === user.google_id
                const challengerName = isCurrentUser ? '나' : `챌린저${challengerNumber}`
                
                return (
                  <div
                    key={member.google_id}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-gray-200"
                  >
                    {/* 챌린저 아이콘 */}
                    <div className="relative mb-4">
                      <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-md ${
                        isCurrentUser 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                      }`}>
                        <span className="text-2xl font-bold text-white">
                          {isCurrentUser ? '😊' : challengerNumber}
                        </span>
                      </div>
                      
                      {/* 역할 뱃지 */}
                      {member.role && member.role === 'leader' && (
                        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-yellow-500 text-white">
                          👑
                        </div>
                      )}
                    </div>

                    {/* 챌린저 이름 */}
                    <h5 className="font-bold text-lg text-gray-800 mb-2">{challengerName}</h5>
                    
                    {/* 역할 표시 */}
                    {member.role && (
                      <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium mb-3 ${
                        member.role === 'leader' 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {member.role === 'leader' ? '팀 리더' : '팀 멤버'}
                      </span>
                    )}

                    {/* 걸음수 정보 */}
                    <div className="space-y-3 mt-4">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="text-sm text-gray-500 mb-1">오늘 걸음수</div>
                        <div className="text-xl font-bold text-green-600">
                          {stepsInfo.todaySteps.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="text-sm text-gray-500 mb-1">총 걸음수</div>
                        <div className="text-lg font-semibold text-indigo-600">
                          {stepsInfo.totalSteps.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-2">
                        {stepsInfo.lastUpdateDate ? (
                          `마지막 업데이트: ${stepsInfo.lastUpdateDate}`
                        ) : (
                          '아직 걸음수를 등록하지 않았습니다'
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 팀 전환 버튼만 유지 */}
        <div className="flex justify-start items-center">
          {userTeams.length > 1 && (
            <div className="flex gap-2">
              <span className="text-sm text-gray-500 mr-2">팀 전환:</span>
              {userTeams.map((team) => (
                <button
                  key={team.team_code}
                  onClick={() => setSelectedTeam(team)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedTeam?.team_code === team.team_code
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 