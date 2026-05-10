chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "TRIGGER_DOWNLOAD") {
    chrome.downloads.download(
      {
        url: message.url,
        filename: message.filename || "suno_track.mp3",
        saveAs: false,
      },
      function (downloadId) {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId: downloadId });
        }
      }
    );
    return true;
  }
});
