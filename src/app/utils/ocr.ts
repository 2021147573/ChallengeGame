export interface StepData {
  steps: number
  date: string
  confidence: number
  extractedText?: string
  matchedPattern?: string
}

interface ClovaOcrResult {
  version: string;
  requestId: string;
  timestamp: number;
  images: Array<{
    uid: string;
    name: string;
    inferResult: string;
    message: string;
    validationResult: {
      result: string;
    };
    fields: Array<{
      valueType: string;
      boundingPoly: {
        vertices: Array<{
          x: number;
          y: number;
        }>;
      };
      inferText: string;
      inferConfidence: number;
      type: string;
      lineBreak: boolean;
    }>;
  }>;
}

export async function extractStepsFromImage(imageFile: File): Promise<StepData | null> {
  console.log('🔍 클로바 OCR로 걸음수 추출 시작')
  
  try {
    // 1. 파일을 base64로 변환
    const base64Image = await fileToBase64(imageFile)
    
    // 2. 클로바 OCR API 호출
    const ocrResult = await callClovaOcrApi(base64Image)
    
    // 3. OCR 결과에서 텍스트 추출
    const extractedText = extractTextFromClovaResult(ocrResult)
    console.log('추출된 텍스트:', extractedText)
    
    // 4. 걸음수 패턴 매칭
    const stepsResult = extractStepsFromText(extractedText)
    
    if (stepsResult.steps === 0) {
      return null
    }
    
    return {
      steps: stepsResult.steps,
      date: new Date().toISOString().split('T')[0],
      confidence: stepsResult.confidence,
      extractedText: extractedText,
      matchedPattern: stepsResult.matchedPattern
    }
    
  } catch (error) {
    console.error('클로바 OCR 에러:', error)
    throw new Error(`OCR 처리 실패: ${error}`)
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

async function callClovaOcrApi(base64Image: string): Promise<ClovaOcrResult> {
  const response = await fetch('/api/clova-ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: [{
        format: 'jpg',
        name: 'health_app_screenshot',
        data: base64Image
      }],
      requestId: Date.now().toString(),
      version: 'V2',
      timestamp: Date.now()
    })
  })

  if (!response.ok) {
    throw new Error(`클로바 OCR API 호출 실패: ${response.status}`)
  }

  return await response.json()
}

function extractTextFromClovaResult(result: ClovaOcrResult): string {
  if (!result.images || result.images.length === 0) {
    throw new Error('OCR 결과에서 이미지를 찾을 수 없습니다')
  }

  const image = result.images[0]
  if (!image.fields) {
    throw new Error('OCR 결과에서 텍스트 필드를 찾을 수 없습니다')
  }

  // 모든 텍스트 필드를 하나의 문자열로 결합
  return image.fields
    .map(field => field.inferText)
    .join(' ')
}

function extractStepsFromText(text: string): {
  steps: number;
  confidence: number;
  matchedPattern: string;
} {
  console.log('걸음수 추출 시작:', text)

  // 텍스트 정리
  const cleanText = text.replace(/\s+/g, ' ').trim()

  // 걸음 앞 숫자 패턴만 (가장 단순하게)
  const stepPatterns = [
    { pattern: /(\d{1,3}(?:[,，]\d{3})+)\s*걸음/i, name: '쉼표걸음' },
    { pattern: /(\d+)\s*걸음/i, name: '숫자걸음' }
  ]

  for (const { pattern, name } of stepPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      const cleanNumber = match[1].replace(/[,，]/g, '')
      const steps = parseInt(cleanNumber)
      
      // 기본 유효성 검사
      if (isNaN(steps) || steps <= 0 || steps > 200000) {
        continue
      }
      
      // 너무 작은 숫자 제외
      if (steps < 100) {
        continue
      }
      
      console.log(`매칭됨: ${steps}걸음 (${name})`)
      
      return {
        steps: steps,
        confidence: 95, // 클로바 OCR + 직접 '걸음' 매칭이므로 높은 신뢰도
        matchedPattern: name
      }
    }
  }

  console.log('걸음수를 찾을 수 없음')
  return {
    steps: 0,
    confidence: 0,
    matchedPattern: '매칭 실패'
  }
}

export function validateStepData(stepData: StepData): boolean {
  if (!stepData) return false
  if (stepData.steps <= 0 || stepData.steps > 200000) return false
  if (!stepData.date) return false
  
  return true
} 