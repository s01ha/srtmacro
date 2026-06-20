async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play notification sound when reservation succeeds'
  });
}

async function playSound() {
  await ensureOffscreenDocument();
  chrome.runtime.sendMessage({ type: 'playOffscreenSound' });
}

async function sendMessageToTelegram() {
  const result = await chrome.storage.local.get(['botToken', 'chatId']);
  var botToken = result.botToken;
  var chatId = result.chatId;
  var msg = encodeURI('Macro has been stopped. Please check your reservation status.');
  if (botToken && chatId) {
    var url = 'https://api.telegram.org/bot' + botToken + '/sendMessage?chat_id=' + chatId + '&text=' + msg;
    try {
      await fetch(url);
    } catch (e) {
      console.error('Telegram message failed:', e);
    }
  }
}

// 워치독: 매크로 실행 중 페이지 로딩이 멈추면 강제 새로고침
var WATCHDOG_ALARM = 'macroWatchdog';
var WATCHDOG_TIMEOUT = 15; // 초 (로딩 대기 최대 시간)
var watchdogTabId = null;

async function startWatchdog(tabId) {
  watchdogTabId = tabId;
  await chrome.alarms.create(WATCHDOG_ALARM, { delayInMinutes: WATCHDOG_TIMEOUT / 60 });
}

async function stopWatchdog() {
  watchdogTabId = null;
  await chrome.alarms.clear(WATCHDOG_ALARM);
}

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === WATCHDOG_ALARM && watchdogTabId !== null) {
    console.warn('[SRT Macro] 페이지 로딩 타임아웃 - 탭 강제 새로고침');
    chrome.tabs.reload(watchdogTabId, function() {
      // 다음 주기를 위해 워치독 재설정
      startWatchdog(watchdogTabId);
    });
  }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message && message.type == 'playSound') {
    stopWatchdog();
    playSound().then(() => sendMessageToTelegram());
    sendResponse(true);
  } else if (message && message.type == 'macroHeartbeat') {
    // content script에서 정상 로드됨 → 워치독 리셋
    startWatchdog(sender.tab.id);
    sendResponse(true);
  } else if (message && message.type == 'macroStopped') {
    stopWatchdog();
    sendResponse(true);
  }
  return true;
});
