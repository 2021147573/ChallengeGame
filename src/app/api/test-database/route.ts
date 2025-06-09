import { NextResponse } from 'next/server';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymW7lS5EyUaujC8A-kbBKNbhVZCBeGuHsezgDFNO6SjOfnDUHj-V4nEapMr8eXVzcYbQ/exec';

export async function GET() {
  try {
    const tests = {
      connection: {
        url_configured: true,
        script_accessible: false,
        error: null as string | null
      },
      tables: {} as Record<string, unknown>
    };

    // Google Apps Script 연결 테스트
    try {
      const testResponse = await fetch(APPS_SCRIPT_URL + '?action=test', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (testResponse.ok) {
        tests.connection.script_accessible = true;
        const data = await testResponse.json();
        tests.tables = data.tables || {};
      } else {
        tests.connection.error = `HTTP ${testResponse.status}: ${testResponse.statusText}`;
      }
    } catch (error: unknown) {
      tests.connection.script_accessible = false;
      tests.connection.error = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json({
      success: true,
      message: 'Google Spreadsheet 데이터베이스 연결 테스트 완료',
      timestamp: new Date().toISOString(),
      tests
    });

  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      message: 'Google Spreadsheet 데이터베이스 연결 실패',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 