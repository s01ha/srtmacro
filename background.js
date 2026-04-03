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

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message && message.type == 'playSound') {
    playSound().then(() => sendMessageToTelegram());
    sendResponse(true);
  }
  return true;
});
