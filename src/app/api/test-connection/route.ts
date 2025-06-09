import { NextResponse } from 'next/server'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymW7lS5EyUaujC8A-kbBKNbhVZCBeGuHsezgDFNO6SjOfnDUHj-V4nEapMr8eXVzcYbQ/exec'

export async function GET() {
  try {
    console.log('Google Apps Script 연결 테스트 시작...')
    
    // 간단한 테스트 요청
    const testUrl = `${APPS_SCRIPT_URL}?action=test`
    console.log('테스트 URL:', testUrl)
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('응답 상태:', response.status)
    console.log('응답 헤더:', response.headers)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.text()
    console.log('응답 데이터:', data)
    
    return NextResponse.json({
      success: true,
      message: '연결 테스트 성공',
      status: response.status,
      data: data
    })
    
  } catch (error) {
    console.error('연결 테스트 실패:', error)
    
    return NextResponse.json({
      success: false,
      message: '연결 테스트 실패',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 