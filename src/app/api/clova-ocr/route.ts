import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 환경변수 확인
    const apiUrl = process.env.NAVER_CLOVA_OCR_APIGW_INVOKE_URL
    const secretKey = process.env.NAVER_CLOVA_OCR_SECRET_KEY
    
    if (!apiUrl || !secretKey) {
      return NextResponse.json(
        { error: '네이버 클로바 OCR API 설정이 필요합니다. 환경변수를 확인해주세요.' },
        { status: 500 }
      )
    }

    // 네이버 클로바 OCR API 호출
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OCR-SECRET': secretKey,
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('클로바 OCR API 에러:', response.status, errorText)
      return NextResponse.json(
        { error: `클로바 OCR API 호출 실패: ${response.status}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('클로바 OCR API 처리 에러:', error)
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    )
  }
} 