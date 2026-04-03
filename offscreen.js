chrome.runtime.onMessage.addListener(function(message) {
  if (message && message.type === 'playOffscreenSound') {
    var audio = document.getElementById('audio');
    audio.src = chrome.runtime.getURL('assets/tada.mp3');
    audio.play();
  }
});
