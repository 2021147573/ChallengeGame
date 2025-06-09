import { NextResponse } from 'next/server'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymW7lS5EyUaujC8A-kbBKNbhVZCBeGuHsezgDFNO6SjOfnDUHj-V4nEapMr8eXVzcYbQ/exec'

export async function GET() {
  try {
    console.log('=== 스프레드시트 구조 테스트 ===')
    
    // 1. 기본 연결 테스트
    const testUrl = `${APPS_SCRIPT_URL}?action=test`
    console.log('테스트 URL:', testUrl)
    
    const response = await fetch(testUrl)
    console.log('응답 상태:', response.status)
    console.log('응답 헤더:', Object.fromEntries(response.headers.entries()))
    
    const result = await response.text()
    console.log('원본 응답:', result)
    
    // JSONP 응답 처리
    let cleanResult = result
    if (result.startsWith('undefined(') && result.endsWith(')')) {
      cleanResult = result.slice(10, -1)
      console.log('정리된 응답:', cleanResult)
    }
    
    return NextResponse.json({
      success: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      rawResponse: result,
      cleanResponse: cleanResult
    })
    
  } catch (error) {
    console.error('스프레드시트 테스트 오류:', error)
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      error: String(error)
    }, { status: 500 })
  }
} 