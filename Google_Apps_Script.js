function doGet(req) {
  return handleRequest(req);
}

function doPost(req) {
  return handleRequest(req);
}

function handleRequest(req) {
  // return ContentService.createTextOutput(JSON.stringify(req));
      
  var SHEET_URL = "https://docs.google.com/spreadsheets/d/1hL5hi_6M1OvAXTJmZRrMUddgmPYyd2bDytemxeGw0-s/edit"
  var SHEET_ID = "...."
  
  console.log('=== 요청 처리 시작 ===');
  console.log('요청 메서드:', req.method);
  console.log('URL 파라미터:', JSON.stringify(req.parameter));
  
  // POST body에서 파라미터 추출
  var postParams = {};
  if (req.postData && req.postData.contents) {
    try {
      postParams = JSON.parse(req.postData.contents);
      console.log('POST Body 파라미터:', JSON.stringify(postParams));
    } catch (e) {
      console.log('POST body JSON 파싱 실패:', e);
    }
  }
  
  // URL 파라미터와 POST body 파라미터 합치기
  var allParams = {};
  for (var key in req.parameter) {
    allParams[key] = req.parameter[key];
  }
  for (var key in postParams) {
    allParams[key] = postParams[key];
  }
  
  var action = allParams.action;
  var table_req = allParams.table;

  console.log('액션:', action);
  console.log('테이블:', table_req);
  console.log('전체 합쳐진 파라미터:', JSON.stringify(allParams));

  //var db    = SpreadsheetApp.openById( SHEET_ID );
  var db = SpreadsheetApp.openByUrl(SHEET_URL);
  var table = db.getSheetByName( table_req );
  var ret;

  // 합쳐진 파라미터를 req.parameter에 설정
  req.parameter = allParams;

  switch(action) {
    case "read":
        ret = Read( req, table );
        break;
    case "get":
        // 특별한 테이블 처리
        if (table_req === 'all_teams_with_members') {
          ret = GetAllTeamsWithMembers( req, db );
        } else if (table_req === 'user_teams') {
          ret = GetUserTeams( req, db );
        } else {
          ret = GetData( req, table );
        }
        break;
    case "insert":
        // 특별한 테이블 처리
        if (table_req === 'step_records') {
          ret = InsertStepRecord( req, table );
        } else if (table_req === 'teams') {
          ret = InsertTeam( req, table );
        } else if (table_req === 'team_members') {
          ret = InsertWithMissingColumns( req, table );
        } else {
          ret = Insert( req, table );
        }
        break;
    case "insertTeam":
        ret = InsertTeam( req, table );
        break;
    case "upsert":
        ret = UpsertData( req, table );
        break;
    case "update":
        ret = Update( req, table );
        break;
    case "delete":
        // 특별한 테이블 처리
        if (table_req === 'team_members') {
          ret = DeleteTeamMember( req, table );
        } else {
          ret = Delete( req, table );
        }
        break;
    case "getUserStepsInfo":
        ret = GetUserStepsInfo( req, db );
        break;
    case "getTeamTodaySteps":
        ret = GetTeamTodaySteps( req, table );
        break;
    default:
        break;
  }

  return response().jsonp(req, ret);
}

/* Read
 * request for all tables
 *
 * @parameter action=read
 * @parameter table=
 * @parameter id=
 *
 * @example-request | ?action=read&table=
 * @example-request-single-row | ?action=read&table=&id=
 */
function Read( request, table ) {
  var request_id = Number( request.parameter.id );
  return {
    success: true,
    data: _read( table, request_id )
  };
}

/* Insert
 * dynamic for all data
 *
 * @parameter action=insert
 * @parameter table=
 * @parameter data=JSON
 *  
 * @example-request | ?action=insert&table=&data={"name":"John Doe"}
 */
function Insert( request, table ) {
  var errors = [];
  
  var last_col     = table.getLastColumn();
  var first_row    = table.getRange(1, 1, 1, last_col).getValues();
  var headers      = first_row.shift();
  var data         = JSON.parse( request.parameter.data );
  var new_row;
  var result = {};
  
  console.log('=== Insert 시작 ===');
  console.log('테이블:', table.getName());
  console.log('헤더:', headers);
  console.log('데이터:', data);

  try {
    new_row = prepareRow( data, headers );
    console.log('준비된 행 데이터:', new_row);
    
    table.appendRow( new_row );
    console.log('행 추가 완료');
    
    result.success = true;
    result.data = data;
    result.message = '데이터가 성공적으로 추가되었습니다.';
  } catch ( error ) {
    console.error('Insert 에러:', error.toString());
    result.success = false;
    result.data = { error: error.toString() };
    result.message = 'Insert 실패: ' + error.toString();
  }
  return result;
}

/* Update
 * dynamic for all tablese
 *
 * @parameter action=update
 * @parameter table=
 * @parameter id=
 * @parameter data=JSON
 * 
 * @example-request | ?action=update&table=&id=&data={"col_to_update": "value" }
 */
function Update( request, table ) {
  var last_col      = table.getLastColumn();
  var first_row     = table.getRange(1, 1, 1, last_col).getValues();
  var headers       = first_row.shift();
  
  var request_id    = Number( request.parameter.id );
  var current_data  = _read( table, request_id );
  var data          = JSON.parse( request.parameter.data );
  
  var result = {};
  
  try {
    var current_row   = current_data.row;
    for( var object_key in data ) {
      var current_col = headers.indexOf( object_key ) + 1;
      table.getRange( current_row, current_col ).setValue( data[ object_key ]); // update iteratively
      current_data[ object_key ] = data[ object_key ]; // update for response;
    }
    result.successs = true;
    result.data = current_data;
  } catch ( error ) {
    result.success = false;
    result.data = { error: error.messsage };
  }
  
  return response().json( result );
}

/* Delete
 * dynamic for all tables
 *
 * @parameter action=delete
 * @parameter table=
 * @parameter id=
 * 
 * @example-request | ?action=update&table=&id=
 */
function Delete( request, table ) {
  var request_id    = Number( request.parameter.id );
  var current_data  = _read( table, request_id );
  
  // delete
  table.deleteRow( current_data.row );
  
  return response().json({
      success: true,
      data: current_data
    });
}

/**
 * Build the response content type 
 * back to the user
 */
function response() {
   return {
      json: function(data) {
          return ContentService.createTextOutput(
        JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
      },
      jsonp: function(req, data) {
        return ContentService.createTextOutput(
          req.parameters.callback + '(' + JSON.stringify(data) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
   }
}

/**
* Read from sheet and return map key-value
* javascript object
*/
function _read( sheet, id ) {
  var data         = sheet.getDataRange().getValues();
  var header       = data.shift();
  
  // Find All
  var result = data.map(function( row, indx ) {
  var reduced = header.reduce( function(accumulator, currentValue, currentIndex) {
    accumulator[ currentValue ] = row[ currentIndex ];
    return accumulator;
  }, {});

  reduced.row = indx + 2;
  return reduced;
  
  });
  
  // Filter if id is provided
  if( id ) {
    var filtered = result.filter( function( record ) {
      if ( record.id === id ) {
        return true;
      } else {
        return false;
      }
        });
          return filtered.shift();
  } 
 
  return result;
  
}

/*
 * Prepare row with correct order to insert into
 * sheet.
 * 
 * @throws Error
 */
function prepareRow( object_to_sort, array_with_order ) {
  var sorted_array   = [];
  
  for( var i=0; i<array_with_order.length; i++ ) {
          var value = object_to_sort[ array_with_order[ i ]];
    
          if( typeof value === 'undefined' ) {
        throw new Error( "The attribute/column <" + array_with_order[i] + "> is missing." );
          } else {
        sorted_array[i] = value;      
          }
  }

  return sorted_array;
}

// 새로운 GetData 함수 (우리 앱용)
function GetData( request, table ) {
  try {
    console.log('=== GetData 함수 시작 ===');
    console.log('테이블 이름:', table.getName());
    console.log('전체 request.parameter:', JSON.stringify(request.parameter));
    
    var google_id = request.parameter.google_id;
    var team_code = request.parameter.team_code;
    
    console.log('추출된 google_id:', google_id, '타입:', typeof google_id);
    console.log('추출된 team_code:', team_code, '타입:', typeof team_code);
    
    // 모든 데이터 읽기
    var allData = _readAll(table);
    console.log('전체 데이터 수:', allData.length);
    
    // 처음 몇 개 레코드를 로그로 출력 (디버깅용)
    if (allData.length > 0) {
      console.log('첫 번째 레코드 샘플:', JSON.stringify(allData[0]));
      if (allData.length > 1) {
        console.log('두 번째 레코드 샘플:', JSON.stringify(allData[1]));
      }
    }
    
    // google_id로 필터링 (users 테이블용)
    if (google_id && google_id !== '' && google_id !== 'undefined') {
      console.log('google_id로 필터링 시작');
      var filtered = allData.filter(function(record) {
        var matches = record.google_id === google_id;
        console.log('google_id 비교:', record.google_id, '===', google_id, '결과:', matches);
        return matches;
      });
      console.log('google_id 필터링 결과 수:', filtered.length);
      return {
        success: true,
        data: filtered.length > 0 ? filtered[0] : null
      };
    }
    
    // team_code로 필터링 (team_members 테이블용)
    if (team_code && team_code !== '' && team_code !== 'undefined') {
      console.log('team_code로 필터링 시작, 요청된 team_code:', team_code);
      
      // 모든 team_code 값들을 로그로 출력
      var allTeamCodes = allData.map(function(record) { return record.team_code; });
      console.log('데이터에 있는 모든 team_code들:', JSON.stringify(allTeamCodes));
      
      var filtered = allData.filter(function(record) {
        // 문자열 비교를 더 엄격하게
        var recordTeamCode = record.team_code ? String(record.team_code).trim() : '';
        var requestTeamCode = String(team_code).trim();
        var matches = recordTeamCode === requestTeamCode;
        console.log('레코드 비교:', recordTeamCode, '===', requestTeamCode, '결과:', matches);
        return matches;
      });
      
      console.log('필터링 결과 수:', filtered.length);
      console.log('필터링된 데이터:', JSON.stringify(filtered));
      
      // team_members인 경우 사용자 정보도 함께 가져오기
      if (table.getName() === 'team_members') {
        console.log('team_members 테이블 처리 시작');
        
        var usersSheet = table.getParent().getSheetByName('users');
        if (!usersSheet) {
          console.log('users 시트를 찾을 수 없음');
          return {
            success: true,
            data: filtered
          };
        }
        
        var usersData = _readAll(usersSheet);
        console.log('users 시트에서 가져온 사용자 수:', usersData.length);
        
        // 사용자 데이터 샘플 출력
        if (usersData.length > 0) {
          console.log('사용자 데이터 샘플:', JSON.stringify(usersData[0]));
        }
        
        // 각 팀 멤버에 사용자 정보 추가
        var enrichedMembers = filtered.map(function(member, index) {
          console.log('멤버', index + 1, '처리 중 - google_id:', member.google_id);
          
          var userInfo = usersData.find(function(user) {
            var memberGoogleId = member.google_id ? String(member.google_id).trim() : '';
            var userGoogleId = user.google_id ? String(user.google_id).trim() : '';
            var matches = memberGoogleId === userGoogleId;
            console.log('사용자 조인 비교:', memberGoogleId, '===', userGoogleId, '결과:', matches);
            return matches;
          });
          
          if (userInfo) {
            console.log('사용자 정보 발견:', {
              name: userInfo.name,
              email: userInfo.email,
              profile_image: userInfo.profile_image
            });
            
            return {
              google_id: member.google_id,
              team_code: member.team_code,
              role: member.role || 'member',
              joined_at: member.joined_at,
              name: userInfo.name || userInfo.nickname || 'Unknown User',
              email: userInfo.email || '',
              profile_image: userInfo.profile_image || ''
            };
          } else {
            console.log('사용자 정보를 찾을 수 없음 for google_id:', member.google_id);
            console.log('존재하는 모든 user google_id들:');
            usersData.forEach(function(u, idx) {
              console.log('  ', idx, ':', u.google_id);
            });
            
            return {
              google_id: member.google_id,
              team_code: member.team_code,
              role: member.role || 'member',
              joined_at: member.joined_at,
              name: 'Unknown User',
              email: '',
              profile_image: ''
            };
          }
        });
        
        console.log('최종 멤버 정보 (조인 완료):', JSON.stringify(enrichedMembers));
        
        return {
          success: true,
          data: enrichedMembers
        };
      }
      
      return {
        success: true,
        data: filtered
      };
    }
    
    // 필터링 조건이 없으면 전체 데이터 반환
    console.log('필터링 조건 없음, 전체 데이터 반환');
    return {
      success: true,
      data: allData
    };
    
  } catch (error) {
    console.error('GetData 오류:', error);
    return {
      success: false,
      message: '데이터 조회 실패: ' + error.toString()
    };
  }
}

// 새로운 UpsertData 함수 (우리 앱용)
function UpsertData( request, table ) {
  try {
    var last_col     = table.getLastColumn();
    var first_row    = table.getRange(1, 1, 1, last_col).getValues();
    var headers      = first_row.shift();
    var data         = JSON.parse( request.parameter.data );
    var result = {};
    
    console.log('UpsertData 요청 - 테이블:', table.getName(), '데이터:', data);
    
    // Primary key 결정
    var primaryKey = null;
    var primaryValue = null;
    
    if (table.getName() === 'users' && data.google_id) {
      primaryKey = 'google_id';
      primaryValue = data.google_id;
    } else if (table.getName() === 'teams' && data.team_code) {
      primaryKey = 'team_code';
      primaryValue = data.team_code;
    }
    
    if (!primaryKey || !primaryValue) {
      console.log('Primary key 없음, 일반 insert 수행');
      // 기존 Insert 함수 사용하되, missing 컬럼 허용 버전으로
      return InsertWithMissingColumns(request, table);
    }
    
    // 기존 데이터 검색
    var allData = _readAll(table);
    var existingRecord = null;
    var existingRowIndex = -1;
    
    for (var i = 0; i < allData.length; i++) {
      if (allData[i][primaryKey] === primaryValue) {
        existingRecord = allData[i];
        existingRowIndex = allData[i].row;
        break;
      }
    }
    
    if (existingRecord) {
      // 업데이트
      console.log('기존 레코드 발견, 업데이트 수행. Row:', existingRowIndex);
      
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          var colIndex = headers.indexOf(key);
          if (colIndex !== -1) {
            table.getRange(existingRowIndex, colIndex + 1).setValue(data[key]);
          }
        }
      }
      
      result.success = true;
      result.message = '데이터가 성공적으로 업데이트되었습니다.';
      result.data = data;
      
    } else {
      // 삽입
      console.log('새 레코드 삽입');
      var new_row = prepareRowWithMissingColumns( data, headers );
      table.appendRow( new_row );
      
      result.success = true;
      result.message = '데이터가 성공적으로 추가되었습니다.';
      result.data = data;
    }
    
    console.log('UpsertData 결과:', result);
    return result;
    
  } catch ( error ) {
    console.error('UpsertData 오류:', error);
    return {
      success: false,
      message: 'UpsertData 실패: ' + error.toString()
    };
  }
}

// 새로운 헬퍼 함수들 (기존 함수들과 별도)
function _readAll( sheet ) {
  var data         = sheet.getDataRange().getValues();
  var header       = data.shift();
  
  var result = data.map(function( row, indx ) {
    var reduced = header.reduce( function(accumulator, currentValue, currentIndex) {
      accumulator[ currentValue ] = row[ currentIndex ];
      return accumulator;
    }, {});

    reduced.row = indx + 2;
    return reduced;
  });
  
  return result;
}

function prepareRowWithMissingColumns( object_to_sort, array_with_order ) {
  var sorted_array   = [];
  
  for( var i=0; i<array_with_order.length; i++ ) {
    var value = object_to_sort[ array_with_order[ i ]];

    if( typeof value === 'undefined' ) {
      sorted_array[i] = '';  // missing 컬럼은 빈 문자열로 처리
    } else {
      sorted_array[i] = value;      
    }
  }

  return sorted_array;
}

function InsertWithMissingColumns( request, table ) {
  var errors = [];
  
  var last_col     = table.getLastColumn();
  var first_row    = table.getRange(1, 1, 1, last_col).getValues();
  var headers      = first_row.shift();
  var data         = JSON.parse( request.parameter.data );
  var new_row;
  var result = {};
  
  console.log('=== InsertWithMissingColumns 시작 ===');
  console.log('테이블:', table.getName());
  console.log('헤더:', headers);
  console.log('데이터:', data);

  try {
    new_row = prepareRowWithMissingColumns( data, headers );
    console.log('준비된 행 데이터:', new_row);
    
    table.appendRow( new_row );
    console.log('팀 멤버 추가 완료');
    
    result.success = true;
    result.data = data;
    result.message = '팀 멤버가 성공적으로 추가되었습니다.';
  } catch ( error ) {
    console.error('InsertWithMissingColumns 에러:', error.toString());
    result.success = false;
    result.data = { error: error.toString() };
    result.message = 'Insert 실패: ' + error.toString();
  }
  return result;
}

// ==== 추가된 새로운 기능들 ====

// 1. 모든 팀과 멤버 수 조회
function GetAllTeamsWithMembers( request, db ) {
  try {
    console.log('=== 모든 팀과 멤버 수 조회 시작 ===');
    
    var teamsSheet = db.getSheetByName('teams');
    var membersSheet = db.getSheetByName('team_members');
    
    if (!teamsSheet) {
      console.log('teams 시트가 없습니다');
      return { success: false, message: 'teams 시트를 찾을 수 없습니다' };
    }
    
    if (!membersSheet) {
      console.log('team_members 시트가 없습니다');
      return { success: false, message: 'team_members 시트를 찾을 수 없습니다' };
    }
    
    // 팀 데이터 가져오기
    var teamsData = _readAll(teamsSheet);
    console.log('팀 데이터:', teamsData.length, '개');
    
    // 멤버 데이터 가져오기
    var membersData = _readAll(membersSheet);
    console.log('멤버 데이터:', membersData.length, '개');
    
    // 팀별 멤버 수 계산
    var memberCounts = {};
    for (var i = 0; i < membersData.length; i++) {
      var teamCode = membersData[i].team_code;
      if (teamCode && teamCode !== '') { // 빈 문자열 체크 추가
        memberCounts[teamCode] = (memberCounts[teamCode] || 0) + 1;
      }
    }
    
    console.log('팀별 멤버 수:', memberCounts);
    
    // 팀 목록에 멤버 수 추가
    var result = [];
    for (var j = 0; j < teamsData.length; j++) {
      var team = teamsData[j];
      
      // team_code가 없거나 빈 문자열인 경우 스킵
      if (!team.team_code || team.team_code === '') {
        console.log('team_code가 없는 팀 스킵:', team.name);
        continue;
      }
      
      // 멤버 수 추가
      team.memberCount = memberCounts[team.team_code] || 0;
      result.push(team);
    }
    
    console.log('최종 결과:', result.length, '개 팀');
    return { success: true, data: result };
    
  } catch (error) {
    console.error('GetAllTeamsWithMembers 에러:', error.toString());
    return { success: false, message: '팀 목록 조회 실패: ' + error.toString() };
  }
}

// 2. 사용자의 팀 목록 조회 (team_members와 teams 조인)
function GetUserTeams( request, db ) {
  try {
    // URL 파라미터에서 직접 google_id 추출
    var google_id = request.parameter.google_id;
    
    // 백업: data 파라미터에서도 시도
    if (!google_id && request.parameter.data) {
      try {
        var data = JSON.parse(request.parameter.data || '{}');
        google_id = data.google_id;
      } catch (e) {
        console.log('data 파라미터 파싱 실패:', e);
      }
    }
    
    if (!google_id) {
      console.log('사용 가능한 파라미터들:', Object.keys(request.parameter));
      console.log('request.parameter:', request.parameter);
      return { success: false, message: 'google_id가 필요합니다. 파라미터: ' + JSON.stringify(request.parameter) };
    }
    
    console.log('GetUserTeams 요청 - google_id:', google_id);
    
    var teamsSheet = db.getSheetByName('teams');
    var membersSheet = db.getSheetByName('team_members');
    
    if (!teamsSheet || !membersSheet) {
      return { success: false, message: '필요한 시트를 찾을 수 없습니다' };
    }
    
    // 사용자가 가입한 팀 코드들 찾기
    var membersData = _readAll(membersSheet);
    console.log('전체 멤버 데이터 수:', membersData.length);
    console.log('멤버 데이터 샘플:', membersData.slice(0, 3)); // 처음 3개만 로깅
    
    var userTeamCodes = [];
    
    for (var i = 0; i < membersData.length; i++) {
      console.log('멤버 데이터 체크:', membersData[i].google_id, 'vs', google_id);
      if (membersData[i].google_id === google_id) {
        console.log('매칭된 멤버 발견:', membersData[i]);
        userTeamCodes.push(membersData[i].team_code);
      }
    }
    
    console.log('사용자가 가입한 팀 코드들:', userTeamCodes);
    
    // 해당 팀들의 상세 정보 가져오기
    var teamsData = _readAll(teamsSheet);
    console.log('전체 팀 데이터 수:', teamsData.length);
    console.log('팀 데이터 샘플:', teamsData.slice(0, 3));
    
    var userTeams = [];
    
    for (var j = 0; j < teamsData.length; j++) {
      console.log('팀 체크:', teamsData[j].team_code, 'in', userTeamCodes);
      if (userTeamCodes.indexOf(teamsData[j].team_code) !== -1) {
        console.log('매칭된 팀 발견:', teamsData[j]);
        userTeams.push(teamsData[j]);
      }
    }
    
    console.log('최종 사용자 팀들:', userTeams);
    console.log('사용자 팀 수:', userTeams.length);
    return { success: true, data: userTeams };
    
  } catch (error) {
    console.error('GetUserTeams 에러:', error);
    return { success: false, message: '사용자 팀 조회 실패: ' + error.toString() };
  }
}

// 3. 걸음수 저장 시 특별 처리 (중복 체크)
function InsertStepRecord( request, table ) {
  try {
    console.log('=== 걸음수 저장 시작 ===');
    
    var data = JSON.parse( request.parameter.data );
    console.log('받은 걸음수 데이터:', data);
    
    // 필수 데이터 확인
    if (!data.user_google_id || !data.steps || !data.date) {
      return { success: false, message: '필수 데이터가 부족합니다 (user_google_id, steps, date)' };
    }
    
    // 시트가 없으면 생성
    if (!table) {
      return { success: false, message: 'step_records 시트를 찾을 수 없습니다' };
    }
    
    // 같은 사용자의 같은 날짜 데이터가 있는지 확인
    var existingData = _readAll(table);
    var existingRecord = null;
    var existingRowIndex = -1;
    
    for (var i = 0; i < existingData.length; i++) {
      var record = existingData[i];
      if (record.user_google_id === data.user_google_id && record.date === data.date) {
        existingRecord = record;
        existingRowIndex = record.row;
        break;
      }
    }
    
    var last_col = table.getLastColumn();
    var first_row = table.getRange(1, 1, 1, last_col).getValues();
    var headers = first_row.shift();
    
    if (existingRecord) {
      // 기존 데이터 업데이트
      console.log('중복 데이터 발견, 업데이트 진행. Row:', existingRowIndex);
      
      var updateData = {
        user_google_id: data.user_google_id,
        team_code: data.team_code || 'NO_TEAM',
        steps: data.steps,
        date: data.date,
        extracted_text: data.extracted_text || '',
        matched_pattern: data.matched_pattern || '',
        confidence: data.confidence || 0,
        created_at: data.created_at || new Date().toISOString()
      };
      
      var values = headers.map(function(header) {
        return updateData[header] || '';
      });
      
      table.getRange(existingRowIndex, 1, 1, values.length).setValues([values]);
      
      return { success: true, message: '걸음수 데이터가 업데이트되었습니다' };
      
    } else {
      // 새 데이터 추가
      console.log('새 걸음수 데이터 추가');
      
      var newData = {
        user_google_id: data.user_google_id,
        team_code: data.team_code || 'NO_TEAM',
        steps: data.steps,
        date: data.date,
        extracted_text: data.extracted_text || '',
        matched_pattern: data.matched_pattern || '',
        confidence: data.confidence || 0,
        created_at: data.created_at || new Date().toISOString()
      };
      
      var new_row = prepareRowWithMissingColumns(newData, headers);
      table.appendRow(new_row);
      
      return { success: true, message: '걸음수가 성공적으로 저장되었습니다' };
    }
    
  } catch (error) {
    console.error('InsertStepRecord 에러:', error);
    return { success: false, message: '걸음수 저장 실패: ' + error.toString() };
  }
}

// 4. 팀 생성 시 team_code 자동 생성
function InsertTeam( request, table ) {
  try {
    console.log('=== InsertTeam 시작 ===');
    console.log('요청 파라미터:', JSON.stringify(request.parameter));
    
    var data = JSON.parse( request.parameter.data );
    console.log('파싱된 데이터:', data);
    
    // team_code가 없거나 빈 값이면 자동 생성
    if (!data.team_code || data.team_code === '') {
      data.team_code = generateTeamCode();
      console.log('생성된 팀 코드:', data.team_code);
    }
    
    // 기존 Insert 로직 사용
    var last_col = table.getLastColumn();
    var first_row = table.getRange(1, 1, 1, last_col).getValues();
    var headers = first_row.shift();
    
    console.log('테이블 헤더:', headers);
    
    try {
      var new_row = prepareRowWithMissingColumns( data, headers );
      console.log('준비된 행 데이터:', new_row);
      
      table.appendRow( new_row );
      console.log('팀 데이터 삽입 완료');
      
      var result = {
        success: true,
        data: data,
        message: '팀이 성공적으로 생성되었습니다.'
      };
      
      console.log('InsertTeam 결과:', result);
      return result;
      
    } catch ( insertError ) {
      console.error('데이터 삽입 실패:', insertError);
      return {
        success: false,
        message: '팀 데이터 삽입 실패: ' + insertError.toString(),
        data: null
      };
    }
    
  } catch (error) {
    console.error('InsertTeam 에러:', error);
    return { 
      success: false, 
      message: '팀 생성 실패: ' + error.toString(),
      data: null
    };
  }
}

// 5. 팀 코드 생성 함수
function generateTeamCode() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var result = '';
  for (var i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 팀 멤버 삭제 (team_code와 google_id로)
function DeleteTeamMember( request, table ) {
  try {
    var data = JSON.parse(request.parameter.data || '{}');
    var team_code = data.team_code;
    var google_id = data.google_id;
    
    console.log('=== DeleteTeamMember 시작 ===');
    console.log('팀 코드:', team_code);
    console.log('사용자 ID:', google_id);
    
    if (!team_code || !google_id) {
      return {
        success: false,
        message: 'team_code와 google_id가 모두 필요합니다.'
      };
    }
    
    // 모든 데이터 읽기
    var allData = _readAll(table);
    console.log('전체 멤버 데이터 수:', allData.length);
    
    // 삭제할 행 찾기
    var targetRow = -1;
    var targetData = null;
    
    for (var i = 0; i < allData.length; i++) {
      if (allData[i].team_code === team_code && allData[i].google_id === google_id) {
        targetRow = allData[i].row;
        targetData = allData[i];
        break;
      }
    }
    
    if (targetRow === -1) {
      console.log('삭제할 레코드를 찾을 수 없음');
      return {
        success: false,
        message: '해당 팀 멤버를 찾을 수 없습니다.'
      };
    }
    
    console.log('삭제할 행 번호:', targetRow);
    console.log('삭제할 데이터:', targetData);
    
    // 행 삭제
    table.deleteRow(targetRow);
    
    console.log('팀 멤버 삭제 완료');
    return {
      success: true,
      message: '팀에서 성공적으로 탈퇴했습니다.',
      data: targetData
    };
    
  } catch (error) {
    console.error('DeleteTeamMember 에러:', error.toString());
    return {
      success: false,
      message: '팀 탈퇴 실패: ' + error.toString()
    };
  }
}

/**
 * 사용자별 걸음수 정보 조회
 * 오늘 걸음수, 총 걸음수, 마지막 업데이트 날짜 반환
 */
function GetUserStepsInfo( request, db ) {
  console.log('=== GetUserStepsInfo 시작 ===');
  console.log('전체 요청 파라미터:', JSON.stringify(request.parameter));
  
  var google_id = request.parameter.google_id;
  console.log('받은 google_id:', google_id);
  
  if (!google_id) {
    console.error('google_id가 제공되지 않음');
    return {
      success: false,
      message: 'google_id가 필요합니다. 받은 파라미터: ' + JSON.stringify(request.parameter)
    };
  }
  
  try {
    var stepRecordsSheet = db.getSheetByName('step_records');
    var records = _readAll(stepRecordsSheet);
    
    console.log('전체 걸음수 기록 수:', records.length);
    
    // 처음 몇 개 기록 확인 (디버깅용)
    if (records.length > 0) {
      console.log('첫 번째 기록 샘플:', JSON.stringify(records[0]));
      if (records.length > 1) {
        console.log('두 번째 기록 샘플:', JSON.stringify(records[1]));
      }
      if (records.length > 2) {
        console.log('세 번째 기록 샘플:', JSON.stringify(records[2]));
      }
    }
    
    // 모든 기록을 로그로 출력 (최대 10개)
    console.log('=== 전체 step_records 데이터 (최대 10개) ===');
    records.slice(0, 10).forEach(function(record, index) {
      console.log('기록', index + 1, ':', JSON.stringify(record));
    });
    
    // 해당 사용자의 걸음수 기록만 필터링
    var userRecords = records.filter(function(record) {
      var match = record.user_google_id === google_id;
      if (match) {
        console.log('매칭된 기록:', JSON.stringify(record));
      }
      return match;
    });
    
    console.log('사용자 걸음수 기록 수:', userRecords.length);
    console.log('검색 대상 google_id:', google_id);
    
    // 유사한 google_id 찾기 (디버깅용)
    var similarIds = records.map(function(record) {
      return record.user_google_id;
    }).filter(function(id, index, arr) {
      return arr.indexOf(id) === index; // 중복 제거
    });
    console.log('스프레드시트에 있는 모든 고유 google_id들:', JSON.stringify(similarIds));
    
    if (userRecords.length === 0) {
      console.log('해당 사용자의 걸음수 기록이 없습니다.');
      return {
        success: true,
        data: {
          todaySteps: 0,
          totalSteps: 0,
          lastUpdateDate: null
        }
      };
    }
    
    // 오늘의 걸음수 계산
    var todaySteps = 0;
    var totalSteps = 0;
    var lastUpdateDate = null;
    
    // 여러 날짜 형식 생성
    var today = new Date();
    var koreanTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    var todayString = koreanTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    console.log('오늘 날짜 (한국 시간):', todayString);
    
    userRecords.forEach(function(record) {
      var recordSteps = parseInt(record.steps) || 0;
      totalSteps += recordSteps;
      console.log('기록 처리 - created_at:', record.created_at, '걸음수:', recordSteps);
      
      // created_at 필드를 사용하여 오늘 날짜 확인
      var isToday = false;
      if (record.created_at) {
        var createdDate = new Date(record.created_at);
        // 한국 시간으로 변환
        var createdKoreaTime = new Date(createdDate.getTime() + (9 * 60 * 60 * 1000));
        var createdDateString = createdKoreaTime.toISOString().split('T')[0];
        isToday = createdDateString === todayString;
        
        console.log('날짜 확인:', {
          created_at: record.created_at,
          createdKoreaTime: createdKoreaTime.toISOString(),
          createdDateString: createdDateString,
          todayString: todayString,
          isToday: isToday
        });
        
        if (isToday) {
          todaySteps += recordSteps;
          console.log('오늘 걸음수 추가:', recordSteps, '(created_at 매칭:', record.created_at, ')');
        }
      } else {
        // created_at이 없는 경우 기존 date 필드로 폴백
        if (record.date === todayString) {
          todaySteps += recordSteps;
          console.log('오늘 걸음수 추가 (date 폴백):', recordSteps, '(날짜 매칭:', record.date, ')');
        }
      }
      
      // 가장 최근 업데이트 날짜 추적 (created_at 우선, 없으면 date)
      var updateDate = record.created_at || record.date;
      if (updateDate) {
        // 날짜 형식 정규화
        var normalizedDate = updateDate;
        if (record.created_at) {
          // created_at은 ISO 형식이므로 날짜 부분만 추출
          var createdDate = new Date(record.created_at);
          var createdKoreaTime = new Date(createdDate.getTime() + (9 * 60 * 60 * 1000));
          normalizedDate = createdKoreaTime.toISOString();
        }
        
        if (!lastUpdateDate || normalizedDate > lastUpdateDate) {
          lastUpdateDate = normalizedDate;
        }
      }
    });
    
    console.log('계산 결과 - 오늘:', todaySteps, '총:', totalSteps, '마지막 업데이트:', lastUpdateDate);
    
    return {
      success: true,
      data: {
        todaySteps: todaySteps,
        totalSteps: totalSteps,
        lastUpdateDate: lastUpdateDate
      }
    };
    
  } catch (error) {
    console.error('사용자 걸음수 정보 조회 실패:', error.toString());
    return {
      success: false,
      message: '사용자 걸음수 정보 조회에 실패했습니다: ' + error.toString()
    };
  }
}

// 팀의 오늘 걸음수 가져오기
function GetTeamTodaySteps( request, table ) {
  try {
    console.log('=== GetTeamTodaySteps 함수 시작 ===');
    var team_code = request.parameter.team_code;
    console.log('요청된 팀 코드:', team_code);
    
    if (!team_code || team_code === '' || team_code === 'undefined') {
      console.log('팀 코드가 없음');
      return {
        success: false,
        message: '팀 코드가 필요합니다.'
      };
    }
    
    // 모든 걸음수 기록 가져오기
    var allData = _readAll(table);
    console.log('총 걸음수 기록 수:', allData.length);
    
    // 오늘 날짜 구하기 (한국 시간 기준)
    var today = new Date();
    var koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    var todayString = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    console.log('오늘 날짜 (한국 시간):', todayString);
    
    // 해당 팀의 오늘 걸음수만 필터링
    var todaySteps = 0;
    var todayRecords = allData.filter(function(record) {
      // team_code 확인
      var recordTeamCode = record.team_code ? String(record.team_code).trim() : '';
      var requestTeamCode = String(team_code).trim();
      var isTeamMatch = recordTeamCode === requestTeamCode;
      
      // 날짜 확인 (created_at 필드 사용)
      var isToday = false;
      if (record.created_at) {
        var createdDate = new Date(record.created_at);
        // 한국 시간으로 변환
        var createdKoreaTime = new Date(createdDate.getTime() + (9 * 60 * 60 * 1000));
        var createdDateString = createdKoreaTime.toISOString().split('T')[0];
        isToday = createdDateString === todayString;
        
        console.log('레코드 날짜 확인:', {
          created_at: record.created_at,
          createdKoreaTime: createdKoreaTime.toISOString(),
          createdDateString: createdDateString,
          todayString: todayString,
          isToday: isToday
        });
      }
      
      var isMatch = isTeamMatch && isToday;
      console.log('레코드 필터링:', {
        team_code: recordTeamCode,
        request_team_code: requestTeamCode,
        isTeamMatch: isTeamMatch,
        isToday: isToday,
        isMatch: isMatch,
        steps: record.steps
      });
      
      return isMatch;
    });
    
    console.log('오늘의 기록 수:', todayRecords.length);
    
    // 걸음수 합계 계산
    todayRecords.forEach(function(record) {
      var steps = parseInt(record.steps) || 0;
      todaySteps += steps;
      console.log('걸음수 추가:', steps, '누적:', todaySteps);
    });
    
    console.log('팀', team_code, '의 오늘 총 걸음수:', todaySteps);
    
    return {
      success: true,
      data: todaySteps
    };
    
  } catch (error) {
    console.error('GetTeamTodaySteps 오류:', error);
    return {
      success: false,
      message: 'GetTeamTodaySteps 실패: ' + error.toString(),
      data: 0
    };
  }
}