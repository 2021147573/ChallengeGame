'use client'

import { useState, useEffect, useCallback } from 'react'

import { extractStepsFromImage, validateStepData, StepData } from './utils/ocr'
import { saveStepRecord, getTeamRankings } from './lib/database_simple'
import { logVisitor, trackPageView } from './utils/analytics'
import { UserProvider, useUser } from './context/UserContext'
import TeamManager from './components/TeamManager'
import { getUserTeams } from './lib/database_simple'

export default function Home() {
  return (
    <UserProvider>
      <HomeContent />
    </UserProvider>
  )
}

function HomeContent() {
  const [currentView, setCurrentView] = useState<'home' | 'upload' | 'ranking' | 'team'>('home')
  const { user, isLoggedIn, isLoading, login, logout } = useUser()
  
  // 컴포넌트 마운트 시 방문자 로그 수집
  useEffect(() => {
    logVisitor()
  }, [])
  
  // 탭 변경 시 페이지뷰 추적
  useEffect(() => {
    trackPageView(currentView)
  }, [currentView])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-600">챌린지게임 🎯</h1>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {/* 네비게이션 메뉴 */}
              <nav className="flex flex-wrap justify-center gap-2 sm:space-x-4">
                <button 
                  onClick={() => setCurrentView('home')}
                  className={`px-3 py-2 rounded-lg text-sm sm:text-base ${currentView === 'home' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                  홈
                </button>
                <button 
                  onClick={() => setCurrentView('upload')}
                  className={`px-3 py-2 rounded-lg text-sm sm:text-base ${currentView === 'upload' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                  걸음수 인증
                </button>
                <button 
                  onClick={() => setCurrentView('ranking')}
                  className={`px-3 py-2 rounded-lg text-sm sm:text-base ${currentView === 'ranking' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                  랭킹
                </button>
                {isLoggedIn && (
                  <button 
                    onClick={() => setCurrentView('team')}
                    className={`px-3 py-2 rounded-lg text-sm sm:text-base ${currentView === 'team' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-indigo-600'}`}
                  >
                    팀
                  </button>
                )}
              </nav>

              {/* 로그인/로그아웃 영역 */}
              <div className="flex items-center justify-center gap-3">
                {isLoading ? (
                  <div className="text-gray-500 text-sm">로딩중...</div>
                ) : isLoggedIn ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2">
                      {user?.profile_image && (
                        <img 
                          src={user.profile_image} 
                          alt="프로필" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                                             <span className="text-gray-700 text-sm sm:text-base">{user?.name || user?.nickname}님</span>
                    </div>
                    <button 
                      onClick={logout}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={login}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm sm:text-base"
                  >
                    구글 로그인
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {currentView === 'home' && <HomeView />}
        {currentView === 'upload' && <UploadView />}
        {currentView === 'ranking' && <RankingView />}
        {currentView === 'team' && <TeamManager />}
      </main>
    </div>
  )
}

function HomeView() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          🚶‍♀️ 서울에서 부산까지 걸어가기 챌린지! 🚶‍♂️
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          팀과 함께 2주 동안 400km를 걸어 목표를 달성해보세요!
        </p>
        <div className="bg-white rounded-lg p-6 shadow-md max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">📊 현재 진행상황</h3>
          <div className="bg-gray-200 rounded-full h-4 mb-4">
            <div className="bg-indigo-500 h-4 rounded-full" style={{width: '35%'}}></div>
          </div>
          <p className="text-gray-600">140km / 400km 완주 (35%)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">오늘의 목표</h3>
          <p className="text-3xl font-bold text-indigo-600">10,000</p>
          <p className="text-gray-600">걸음</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">우리 팀 순위</h3>
          <p className="text-3xl font-bold text-green-600">2</p>
          <p className="text-gray-600">위 / 총 5팀</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">남은 날짜</h3>
          <p className="text-3xl font-bold text-orange-600">8</p>
          <p className="text-gray-600">일</p>
        </div>
      </div>
    </div>
  )
}

function UploadView() {
  const { user, isLoggedIn } = useUser()
  const [dragActive, setDragActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<StepData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '', emoji: '', steps: 0 })

  // 걸음수에 따른 감정적인 메시지 생성
  const getMotivationalMessage = (steps: number) => {
    if (steps < 3000) {
      const messages = [
        { title: "아직 시작일 뿐이야! 💪", message: "오늘은 조금 부족했지만, 내일은 더 멋진 걸음을 보여줄 수 있어! 포기하지 말고 계속 도전해보자!", emoji: "🔥" },
        { title: "움직임이 생명이야! 🚶‍♀️", message: "작은 걸음도 소중해! 하지만 조금 더 움직여서 건강한 하루를 만들어보는 건 어때?", emoji: "💙" },
        { title: "도전은 계속되어야 해! ⚡", message: "오늘의 걸음은 내일의 도약을 위한 준비야! 조금씩이라도 더 멀리 걸어보자!", emoji: "🌟" }
      ]
      return messages[Math.floor(Math.random() * messages.length)]
    }
    
    if (steps < 5000) {
      const messages = [
        { title: "괜찮은 시작이야! 👍", message: "나쁘지 않은 걸음수네! 조금만 더 힘내면 5000보도 금방이야. 화이팅!", emoji: "🎯" },
        { title: "점점 좋아지고 있어! 📈", message: "꾸준히 걷고 있는 모습이 보기 좋아! 목표까지 조금만 더 달려보자!", emoji: "🏃‍♂️" },
        { title: "절반은 왔어! 🚀", message: "벌써 이만큼 걸었다니! 조금만 더 노력하면 하루 목표를 달성할 수 있을 거야!", emoji: "💫" }
      ]
      return messages[Math.floor(Math.random() * messages.length)]
    }
    
    if (steps < 8000) {
      const messages = [
        { title: "훌륭한 걸음수야! 👏", message: "정말 멋진 하루를 보냈구나! 이 정도면 건강한 라이프스타일의 완벽한 예시야!", emoji: "🌈" },
        { title: "대단한 활동력! ⭐", message: "오늘 정말 많이 움직였네! 이런 하루하루가 모여서 건강한 몸을 만드는 거야!", emoji: "💪" },
        { title: "목표 달성 완료! 🎉", message: "일일 목표를 훌쩍 넘어섰어! 이런 꾸준함이 정말 자랑스러워!", emoji: "🏆" }
      ]
      return messages[Math.floor(Math.random() * messages.length)]
    }
    
    if (steps < 12000) {
      const messages = [
        { title: "와! 정말 대단해! 🔥", message: "만보 이상 걸었다니! 정말 건강한 하루를 보냈구나! 이런 날들이 계속되길 바라!", emoji: "🎊" },
        { title: "운동 마니아구나! 💯", message: "이 정도 걸음수면 진짜 운동을 사랑하는 사람이야! 몸도 마음도 건강해질 거야!", emoji: "🌟" },
        { title: "완벽한 하루였어! ✨", message: "만보 넘게 걸었다니! 오늘 하루 정말 알차게 보냈구나! 너무 자랑스러워!", emoji: "🎯" }
      ]
      return messages[Math.floor(Math.random() * messages.length)]
    }
    
    // 12000보 이상
    const messages = [
      { title: "전설적인 걸음수! 👑", message: "와... 정말 믿기지 않는 걸음수야! 오늘 당신은 진짜 챔피언이야! 이런 열정이 정말 부럽다!", emoji: "🏅" },
      { title: "운동의 신이 강림했다! ⚡", message: "이 정도 걸음수는 정말 경이로워! 건강함의 끝판왕을 보여주는구나! 존경스러워!", emoji: "👑" },
      { title: "레전드 달성! 🚀", message: "이런 걸음수는 진짜 드물어! 오늘 당신은 모든 사람들의 롤모델이 되었어! 최고야!", emoji: "🎆" },
      { title: "믿을 수 없는 기록! 🌟", message: "이건 정말 대박이야! 이런 활동량이면 마라톤도 문제없겠어! 정말정말 대단해!", emoji: "🔥" }
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setExtractedData(null)

    // 이미지 미리보기
    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const stepData = await extractStepsFromImage(file)
      
      if (!stepData || stepData.steps === 0) {
        setError('걸음수를 인식할 수 없습니다. 더 선명한 이미지를 업로드해주세요.')
        return
      }

      if (!validateStepData(stepData)) {
        setError('인식된 데이터가 유효하지 않습니다. 올바른 걸음수 스크린샷인지 확인해주세요.')
        return
      }

      setExtractedData(stepData)
      
      // TODO: Supabase에 데이터 저장
      console.log('추출된 걸음수 데이터:', stepData)
      
    } catch (error) {
      console.error('OCR 처리 오류:', error)
      setError('이미지 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const submitStepData = async () => {
    if (!extractedData) return

    if (!isLoggedIn || !user) {
      setError('걸음수 등록을 위해서는 로그인이 필요합니다.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 사용자의 팀 정보 조회
      const userTeamsResult = await getUserTeams(user.google_id)

      let teamCode = 'NO_TEAM' // 기본값
      if (userTeamsResult.success && userTeamsResult.data && Array.isArray(userTeamsResult.data) && userTeamsResult.data.length > 0) {
        const firstTeam = userTeamsResult.data[0]
        teamCode = firstTeam.team_code || 'NO_TEAM' // team_code가 비어있을 수도 있음
      }

      // team_code가 여전히 비어있거나 NO_TEAM인 경우, 팀 멤버 정보에서 직접 조회
      if (!teamCode || teamCode === 'NO_TEAM') {
        try {
          const response = await fetch(`https://script.google.com/macros/s/AKfycbymW7lS5EyUaujC8A-kbBKNbhVZCBeGuHsezgDFNO6SjOfnDUHj-V4nEapMr8eXVzcYbQ/exec?action=read&table=team_members`)
          const membersData = await response.text()
          
          // JSONP 응답에서 JSON 부분 추출
          const jsonMatch = membersData.match(/undefined\((.+)\)%/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1])
            
            if (parsed.success && parsed.data) {
              const memberRecord = parsed.data.find((member: { google_id: string }) => member.google_id === user.google_id)
              if (memberRecord && memberRecord.team_code) {
                teamCode = memberRecord.team_code
              }
            }
          }
        } catch (error) {
          console.error('팀 멤버 정보 조회 실패:', error)
        }
      }

      const stepDataToSave = {
        user_name: user.google_id, // 실제로는 google_id 사용
        team_name: teamCode, // 실제로는 team_code 사용
        steps: extractedData.steps,
        date: extractedData.date,
        confidence: extractedData.confidence,
        extracted_text: extractedData.extractedText,
        matched_pattern: extractedData.matchedPattern
      }

      const result = await saveStepRecord(stepDataToSave)

      if (result.success) {
        const motivationalMessage = getMotivationalMessage(extractedData.steps)
        setSuccessMessage({
          title: motivationalMessage.title,
          message: motivationalMessage.message,
          emoji: motivationalMessage.emoji,
          steps: extractedData.steps
        })
        setShowSuccessPopup(true)
        
        // 초기화
        setUploadedImage(null)
        setExtractedData(null)
        setError(null)
      } else {
        setError(`데이터 저장에 실패했습니다: ${result.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('걸음수 저장 중 오류:', error)
      setError('데이터 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 로그인하지 않은 경우 안내 메시지
  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg p-8 shadow-md text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600">
            걸음수 업로드 기능을 사용하려면 먼저 구글 로그인을 해주세요.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">📱 걸음수 스크린샷 업로드</h2>
      
      {/* 클로바 OCR 안내 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">🇰🇷 네이버 클로바 OCR 사용</h3>
        <p className="text-sm text-blue-700">
          한국어 인식에 특화된 클로바 OCR을 사용하여 정확한 걸음수 추출을 제공합니다.
        </p>
      </div>

      {/* 사용자 정보 표시 */}
      <div className="bg-green-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-2">👤 현재 사용자</h3>
        <p className="text-sm text-green-700">
          {user?.name} ({user?.email})
        </p>
      </div>
      
      <div className="bg-white rounded-lg p-8 shadow-md">
        <div 
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-4xl">📸</div>
            <div>
              <p className="text-lg font-semibold text-gray-700">
                걸음수 스크린샷을 여기에 업로드하세요
              </p>
              <p className="text-gray-500 mt-2">
                드래그 앤 드롭하거나 클릭하여 파일을 선택하세요
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="file-upload"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-6 py-3 rounded-lg cursor-pointer ${
                isProcessing 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isProcessing ? '처리 중...' : '파일 선택'}
            </label>
          </div>
        </div>

        {/* 업로드된 이미지 미리보기 */}
        {uploadedImage && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-2">업로드된 이미지</h3>
            <img 
              src={uploadedImage} 
              alt="업로드된 걸음수 스크린샷" 
              className="max-w-full h-auto rounded-lg border"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}

        {/* OCR 처리 중 */}
        {isProcessing && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-blue-800">이미지에서 걸음수를 분석 중...</p>
          </div>
        )}

        {/* 추출된 데이터 */}
        {extractedData && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">🎉 걸음수 인식 완료!</h3>
            <div className="text-green-700 space-y-2">
              <p><strong>걸음수:</strong> {extractedData.steps.toLocaleString()}걸음</p>
              <p><strong>날짜:</strong> {extractedData.date}</p>
              <p><strong>OCR 방식:</strong> 네이버 클로바 OCR</p>
              {extractedData.extractedText && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-green-600 hover:text-green-800">
                    추출된 텍스트 보기
                  </summary>
                  <div className="mt-2 p-2 bg-white rounded text-xs text-gray-600 max-h-20 overflow-y-auto">
                    {extractedData.extractedText}
                  </div>
                </details>
              )}
            </div>
            <button
              onClick={submitStepData}
              disabled={isSubmitting}
              className={`mt-4 w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                isSubmitting 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  등록 중...
                </>
              ) : (
                '걸음수 등록하기'
              )}
            </button>
          </div>
        )}

        {/* 오류 메시지 */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">💡 업로드 팁</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 건강 앱의 걸음수가 명확히 보이는 스크린샷을 업로드하세요</li>
            <li>• 날짜와 걸음수가 모두 포함되어야 합니다</li>
            <li>• JPG, PNG 파일만 지원됩니다</li>
            <li>• 이미지가 선명할수록 인식률이 높아집니다</li>
          </ul>
        </div>
      </div>

      {/* 성공 팝업 */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* 블러 백그라운드 */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          
          {/* 팝업 컨텐츠 */}
          <div className="relative bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl transform transition-all duration-500 animate-in zoom-in scale-100">
            {/* 메인 이모지 */}
            <div className="text-6xl mb-4 animate-bounce">
              {successMessage.emoji}
            </div>
            
            {/* 제목 */}
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {successMessage.title}
            </h3>
            
            {/* 걸음수 표시 */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-4 mb-4">
              <div className="text-sm opacity-90 mb-1">등록된 걸음수</div>
              <div className="text-3xl font-bold">
                {successMessage.steps.toLocaleString()} 걸음
              </div>
            </div>
            
            {/* 메시지 */}
            <p className="text-gray-600 leading-relaxed mb-6 text-lg">
              {successMessage.message}
            </p>
            
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              계속 화이팅! 💪
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RankingView() {
  const { user } = useUser()
  const [teams, setTeams] = useState<{ name: string; total_steps: number; member_count: number; rank: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userTeams, setUserTeams] = useState<{ team_code: string; name: string }[]>([])

  // 사용자의 팀 정보 가져오기
  const loadUserTeams = useCallback(async () => {
    if (!user) return
    
    try {
      const result = await getUserTeams(user.google_id)
      if (result.success && result.data) {
        setUserTeams(Array.isArray(result.data) ? result.data : [])
      }
    } catch (error) {
      console.error('사용자 팀 로드 오류:', error)
    }
  }, [user])

  // 실시간 랭킹 불러오기
  const loadRankings = async () => {
    setIsLoading(true)
    try {
      console.log('=== 랭킹 데이터 로드 시작 ===')
      const result = await getTeamRankings()
      console.log('랭킹 데이터 결과:', result)
      
      if (result.success && result.data) {
        // 배열인지 확인하고 설정
        if (Array.isArray(result.data)) {
          console.log('설정할 팀 랭킹:', result.data)
          setTeams(result.data)
        } else {
          console.log('랭킹 데이터가 배열이 아님:', typeof result.data)
          setTeams([])
        }
      } else {
        console.log('랭킹 데이터 로드 실패:', result.message)
        setTeams([])
      }
    } catch (error) {
      console.error('랭킹 로드 오류:', error)
      setTeams([])
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadRankings()
    loadUserTeams()
  }, [user, loadUserTeams])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🏆 팀 랭킹</h2>
        <button
          onClick={loadRankings}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg ${
            isLoading 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isLoading ? '로딩 중...' : '새로고침'}
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-indigo-600 text-white">
          <h3 className="text-lg font-semibold">누적 걸음수 순위</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-gray-500">랭킹 데이터를 불러오는 중...</p>
            </div>
          ) : Array.isArray(teams) && teams.length > 0 ? (
            teams.map((team, index) => {
              // 사용자의 팀인지 확인
              const isUserTeam = userTeams.some(userTeam => userTeam.name === team.name)
              
              return (
                <div key={team.name || `team-${index}`} className={`px-6 py-4 flex items-center justify-between transition-colors ${isUserTeam ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      team.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                      team.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' : 
                      team.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                    }`}>
                      {team.rank || index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-lg">{team.name}</p>
                        {isUserTeam && (
                          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
                            내 팀
                          </span>
                        )}
                      </div>
                      {team.rank === 1 && (
                        <p className="text-yellow-600 text-sm font-medium">🏆 1등 팀</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-gray-800">{(team.total_steps || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">걸음</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500 text-lg">아직 등록된 팀이 없습니다.</p>
              <p className="text-gray-400 text-sm mt-2">팀을 만들고 걸음수를 등록해보세요!</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h3 className="font-semibold text-gray-800 mb-4">📈 우리팀 일별 걸음수</h3>
          <div className="space-y-2">
            {[
              { date: '12/15', steps: 12450 },
              { date: '12/14', steps: 9876 },
              { date: '12/13', steps: 11234 },
              { date: '12/12', steps: 8765 },
            ].map((day) => (
              <div key={day.date} className="flex justify-between items-center">
                <span className="text-gray-600">{day.date}</span>
                <span className="font-semibold">{day.steps.toLocaleString()} 걸음</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h3 className="font-semibold text-gray-800 mb-4">🎯 오늘의 미션</h3>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
            <p className="font-semibold text-purple-800">특별 미션!</p>
            <p className="text-purple-700 mt-1">
              팀원 모두 10,000보 이상 걷고 인증샷 업로드하기
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-sm text-purple-600">
                <span>진행률</span>
                <span>3/4명 완료</span>
              </div>
              <div className="bg-purple-200 rounded-full h-2 mt-1">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
