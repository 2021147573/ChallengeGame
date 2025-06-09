import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymW7lS5EyUaujC8A-kbBKNbhVZCBeGuHsezgDFNO6SjOfnDUHj-V4nEapMr8eXVzcYbQ/exec'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, table, data, google_id } = body
    
    console.log('=== 데이터베이스 API 호출 ===')
    console.log('Action:', action)
    console.log('Table:', table)
    console.log('Data:', data)
    console.log('Google ID:', google_id)
    
    let url = `${APPS_SCRIPT_URL}?action=${action}&table=${table}`
    
    // google_id가 직접 전달된 경우 (getUserStepsInfo)
    if (google_id) {
      url += `&google_id=${encodeURIComponent(google_id)}`
      console.log('Google ID가 URL에 추가됨:', google_id)
    }
    
    if (action === 'insert' || action === 'insertTeam' || action === 'update' || action === 'upsert') {
      const dataString = JSON.stringify(data)
      url += `&data=${encodeURIComponent(dataString)}`
      console.log('인코딩된 데이터:', encodeURIComponent(dataString))
    } else if (action === 'get') {
      // GET 요청의 경우 추가 파라미터들을 URL에 추가
      Object.keys(data || {}).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          url += `&${key}=${encodeURIComponent(data[key])}`
        }
      })
    }
    
    console.log('최종 요청 URL:', url)
    console.log('URL 길이:', url.length)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('응답 상태:', response.status)
    console.log('응답 헤더:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP 에러 응답:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }
    
    const result = await response.text()
    console.log('원본 응답:', result)
    
    // HTML 에러 페이지 감지
    if (result.includes('<!DOCTYPE html>') || result.includes('<html>')) {
      console.log('Google Apps Script 에러 감지!')
      
      // 에러 메시지 추출
      const errorMatch = result.match(/Error: ([^<]+)/);
      const errorMessage = errorMatch ? errorMatch[1] : '알 수 없는 에러';
      
      console.log('추출된 에러 메시지:', errorMessage)
      
      return NextResponse.json({
        success: false,
        message: `Google Apps Script 에러: ${errorMessage}`,
        error: 'APPS_SCRIPT_ERROR',
        details: {
          type: 'HTML_ERROR_PAGE',
          rawError: errorMessage
        }
      }, { status: 500 })
    }
    
    try {
      let cleanResult = result
      
      // undefined( 형태의 JSONP 응답 처리
      if (result.startsWith('undefined(') && result.endsWith(')')) {
        cleanResult = result.slice(10, -1) // 'undefined(' 제거하고 마지막 ')' 제거
        console.log('JSONP 응답 정리됨:', cleanResult)
      }
      
      // undefined 응답 처리
      if (cleanResult === 'undefined' || cleanResult.trim() === '') {
        console.log('Apps Script가 undefined 또는 빈 응답을 반환했습니다.')
        return NextResponse.json({
          success: false,
          message: 'Google Apps Script에서 유효하지 않은 응답을 받았습니다.',
          data: null
        })
      }
      
      const jsonResult = JSON.parse(cleanResult)
      console.log('파싱된 JSON:', jsonResult)
      return NextResponse.json({
        success: true,
        data: jsonResult
      })
    } catch (parseError) {
      console.log('JSON 파싱 실패, 텍스트로 반환:', parseError)
      console.log('파싱 시도한 텍스트:', result)
      console.log('원본 응답 길이:', result.length)
      console.log('요청 URL 확인:', url)
      
      return NextResponse.json({
        success: false,
        message: 'JSON 파싱 실패 - Google Apps Script 응답을 확인해주세요.',
        data: result,
        debug: {
          originalResponse: result,
          urlLength: url.length,
          requestUrl: url
        }
      })
    }
    
  } catch (error) {
    console.error('데이터베이스 API 오류:', error)
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      error: String(error)
    }, { status: 500 })
  }
} 