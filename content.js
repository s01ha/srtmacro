(function() {
'use strict';

// 도메인 + pageId 기반 매칭 (URL 경로가 동적으로 변경되어도 동작)
var TARGET_DOMAINS = ['etk.srail.kr', 'etk.srail.co.kr'];
var TARGET_PAGE_ID = 'TK0101011000';

// sessionStorage에 저장할 사용자 설정 필드 목록
var PREF_FIELDS = [
	'psgInfoPerPrnb1', 'psgInfoPerPrnb5', 'psgInfoPerPrnb4',
	'psgInfoPerPrnb2', 'psgInfoPerPrnb3', 'locSeatAttCd1', 'rqSeatAttCd1'
];

function isTargetPage() {
	var hostname = location.hostname;
	var params = new URLSearchParams(location.search);
	var pageId = params.get('pageId');
	return TARGET_DOMAINS.indexOf(hostname) > -1 && pageId === TARGET_PAGE_ID;
}

function getFieldValue(name) {
	var el = document.getElementsByName(name)[0];
	return el ? el.value : '';
}

function setFieldValue(id, value) {
	var el = document.getElementById(id);
	if (el && value !== null) el.value = value;
}

function safeParse(key) {
	try {
		var val = JSON.parse(sessionStorage.getItem(key));
		return Array.isArray(val) ? val : [];
	} catch (e) {
		return [];
	}
}

function clearMacroSession() {
	sessionStorage.removeItem('macro');
	sessionStorage.removeItem('coachSelected');
	sessionStorage.removeItem('firstSelected');
	PREF_FIELDS.forEach(function(f) { sessionStorage.removeItem(f); });
}

window.showModalDialog = window.showModalDialog || function(url, arg, opt) {
	window.open(url, arg, opt);
};

function macrostart() {
	var coachSelected = Array.from(document.querySelectorAll('.coachMacro:checked')).map(function(el) {
		return el.value;
	});
	var firstSelected = Array.from(document.querySelectorAll('.firstMacro:checked')).map(function(el) {
		return el.value;
	});

	if (coachSelected.length === 0 && firstSelected.length === 0) {
		alert('매크로를 실행하기 위해서는 예매하기 위한 열차 1개 이상을 선택하십시오.');
	} else {
		alert('매크로를 시작합니다.\n트럼펫 소리가 나면 바로 결제를 해주셔야 합니다.');

		sessionStorage.setItem('macro', 'true');
		sessionStorage.setItem('coachSelected', JSON.stringify(coachSelected));
		sessionStorage.setItem('firstSelected', JSON.stringify(firstSelected));

		PREF_FIELDS.forEach(function(f) {
			sessionStorage.setItem(f, getFieldValue(f));
		});

		location.reload();
	}
}

function macrostop() {
	alert('매크로를 중지합니다.\n조건을 변경하여 재조회하신 후 다시 시작하실 수 있습니다.');
	clearMacroSession();
	location.reload();
}

// "예약하기" 링크를 텍스트 기반으로 찾기 (클래스명 변경에 강건)
function findReserveLink(cell) {
	var links = cell.querySelectorAll('a');
	for (var i = 0; i < links.length; i++) {
		if (links[i].textContent.trim() === '예약하기') {
			return links[i];
		}
	}
	return null;
}

function createMacroCheckbox(className, value, checked) {
	var p = document.createElement('p');
	p.className = 'p5';

	var label = document.createElement('label');
	var input = document.createElement('input');
	input.type = 'checkbox';
	input.name = 'checkbox';
	input.className = className;
	input.value = value;
	input.checked = checked;
	label.appendChild(input);
	label.appendChild(document.createTextNode(' 매크로'));

	return { spacer: p, label: label };
}

if (isTargetPage()) {

	var coachSelected = safeParse('coachSelected');
	var firstSelected = safeParse('firstSelected');

	// 매크로 시작/중지 버튼 추가
	var toolbar = document.getElementById('search_top_tag');
	if (toolbar) {
		var btnLink = document.createElement('a');
		btnLink.href = '#';
		btnLink.style.cssText = 'margin-left:5px;display:inline-block;height:100%;vertical-align:middle;';
		var btnImg = document.createElement('img');

		if (sessionStorage.getItem('macro') === 'true') {
			btnLink.id = 'btnstop';
			btnImg.src = chrome.runtime.getURL('images/btn_stop.png');
			btnLink.appendChild(btnImg);
			toolbar.appendChild(btnLink);
			btnLink.addEventListener('click', macrostop, false);
		} else {
			btnLink.id = 'btnstart';
			btnImg.src = chrome.runtime.getURL('images/btn_start.png');
			btnLink.appendChild(btnImg);
			toolbar.appendChild(btnLink);
			btnLink.addEventListener('click', macrostart, false);
		}
	} else {
		console.warn('[SRT Macro] 툴바 요소(#search_top_tag)를 찾을 수 없습니다.');
	}

	// 스타일 삽입
	var style = document.createElement('style');
	style.textContent = '.search-form form .button input, .search-form form .button a img { vertical-align: middle; }';
	document.body.appendChild(style);

	// 테이블에 매크로 체크박스 삽입
	var searchList = document.getElementById('search-list');
	if (searchList) {
		var rows = searchList.querySelectorAll('table tr');
		for (var i = 1; i < rows.length; i++) {
			var columns = rows[i].querySelectorAll('td');
			if (columns.length < 7) continue;

			var firstCell = columns[5];
			var coachCell = columns[6];

			if (coachCell.children.length > 0) {
				var cb = createMacroCheckbox('coachMacro', i, coachSelected.indexOf(i + '') > -1);
				coachCell.appendChild(cb.spacer);
				coachCell.appendChild(cb.label);
			}
			if (firstCell.children.length > 0) {
				var cb = createMacroCheckbox('firstMacro', i, firstSelected.indexOf(i + '') > -1);
				firstCell.appendChild(cb.spacer);
				firstCell.appendChild(cb.label);
			}
		}
	}

	// 매크로 실행 로직
	if (sessionStorage.getItem('macro') === 'true') {

		// 사용자 설정 복원
		PREF_FIELDS.forEach(function(f) {
			setFieldValue(f, sessionStorage.getItem(f));
		});

		if (searchList) {
			var rows = searchList.querySelectorAll('table tr');
			var succeed = false;

			for (var i = 1; i < rows.length; i++) {
				var columns = rows[i].querySelectorAll('td');
				if (columns.length < 7) continue;

				var firstCell = columns[5];
				var coachCell = columns[6];

				if (coachSelected.indexOf(i + '') > -1) {
					var link = findReserveLink(coachCell);
					if (link) {
						link.click();
						succeed = true;
						break;
					}
				}

				if (firstSelected.indexOf(i + '') > -1) {
					var link = findReserveLink(firstCell);
					if (link) {
						link.click();
						succeed = true;
						break;
					}
				}
			}

			if (succeed) {
				clearMacroSession();
				chrome.runtime.sendMessage({ type: 'playSound' }, function() {});
			} else {
				setTimeout(function() {
					location.reload();
				}, 1000);
			}
		} else {
			history.go(-1);
		}
	}
}

})();
