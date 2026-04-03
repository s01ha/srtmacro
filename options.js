var defaultBotToken = 'Set your telegram bot token';
var defaultChatId = 'Set your telegram chat id';

function save_options() {
  var botToken = document.getElementById('bot_token').value;
  var chatId = document.getElementById('chat_id').value;
  chrome.storage.local.set({ botToken: botToken, chatId: chatId }, function() {
    var url = 'https://api.telegram.org/bot' + botToken + '/sendMessage?chat_id=' + chatId + '&text=' + encodeURI('Bot connected.');
    fetch(url).catch(function(e) { console.error('Telegram test failed:', e); });

    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function restore_options() {
  chrome.storage.local.get(['botToken', 'chatId'], function(result) {
    var botToken = result.botToken;
    var chatId = result.chatId;

    if (botToken == undefined)
      botToken = defaultBotToken;

    if (chatId == undefined)
      chatId = defaultChatId;

    document.getElementById('bot_token').value = botToken;
    document.getElementById('chat_id').value = chatId;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
