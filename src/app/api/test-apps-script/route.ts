import { NextResponse } from 'next/server'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymW7lS5EyUaujC8A-kbBKNbhVZCBeGuHsezgDFNO6SjOfnDUHj-V4nEapMr8eXVzcYbQ/exec'

export async function GET() {
  console.log('=== Google Apps Script 진단 시작 ===')
  
  const tests = []
  
  // 테스트 1: 기본 연결
  try {
    const basicUrl = `${APPS_SCRIPT_URL}`
    console.log('기본 연결 테스트:', basicUrl)
    
    const response1 = await fetch(basicUrl)
    const result1 = await response1.text()
    
    tests.push({
      name: '기본 연결',
      url: basicUrl,
      status: response1.status,
      response: result1,
      length: result1.length
    })
  } catch (error) {
    tests.push({
      name: '기본 연결',
      error: String(error)
    })
  }
  
  // 테스트 2: test 액션
  try {
    const testUrl = `${APPS_SCRIPT_URL}?action=test`
    console.log('test 액션 테스트:', testUrl)
    
    const response2 = await fetch(testUrl)
    const result2 = await response2.text()
    
    tests.push({
      name: 'test 액션',
      url: testUrl,
      status: response2.status,
      response: result2,
      length: result2.length
    })
  } catch (error) {
    tests.push({
      name: 'test 액션',
      error: String(error)
    })
  }
  
  // 테스트 3: get 액션 (간단한 조회)
  try {
    const getUrl = `${APPS_SCRIPT_URL}?action=get&table=users`
    console.log('get 액션 테스트:', getUrl)
    
    const response3 = await fetch(getUrl)
    const result3 = await response3.text()
    
    tests.push({
      name: 'get 액션',
      url: getUrl,
      status: response3.status,
      response: result3,
      length: result3.length
    })
  } catch (error) {
    tests.push({
      name: 'get 액션',
      error: String(error)
    })
  }
  
  console.log('=== 진단 결과 ===')
  tests.forEach((test, index) => {
    console.log(`테스트 ${index + 1}: ${test.name}`)
    if (test.error) {
      console.log('  에러:', test.error)
    } else {
      console.log('  상태:', test.status)
      console.log('  응답 길이:', test.length)
      console.log('  응답 내용:', test.response?.substring(0, 200))
    }
  })
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    appsScriptUrl: APPS_SCRIPT_URL,
    tests: tests
  })
} 