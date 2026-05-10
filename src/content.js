(function () {
  "use strict";

  const TOOLBAR_ID = "scp-toolbar";
  const CHAR_COUNTER_ID = "scp-char-counter";
  const SYNC_BTN_ID = "scp-sync-btn";
  const BATCH_BTN_ID = "scp-batch-btn";

  const STRUCTURE_TAGS = [
    "[Intro]",
    "[Verse]",
    "[Pre-Chorus]",
    "[Chorus]",
    "[Drop]",
    "[Bridge]",
    "[Outro]",
    "[Instrumental]",
    "[Break]",
    "[Hook]",
  ];

  const CHAR_LIMIT = 3000;
  const CHAR_WARN = 2800;
  const CHAR_DANGER = 2950;

  function findLyricsArea() {
    const selectors = [
      'textarea[placeholder*="lyrics" i]',
      'textarea[placeholder*="Write your lyrics" i]',
      'textarea[data-testid*="lyrics" i]',
      'textarea[aria-label*="lyrics" i]',
      ".css-1sqnrkk",
      'div[class*="lyrics"] textarea',
      'div[class*="prompt"] textarea',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    const allTextareas = document.querySelectorAll("textarea");
    for (const ta of allTextareas) {
      if (
        ta.rows > 3 ||
        ta.offsetHeight > 100 ||
        (ta.placeholder && ta.placeholder.toLowerCase().includes("lyric"))
      ) {
        return ta;
      }
    }
    return allTextareas.length > 0 ? allTextareas[allTextareas.length - 1] : null;
  }

  function findStyleInput() {
    const selectors = [
      'input[placeholder*="style" i]',
      'input[placeholder*="Style of Music" i]',
      'input[data-testid*="style" i]',
      'input[aria-label*="style" i]',
      'div[class*="style"] input[type="text"]',
      'div[class*="tag"] input[type="text"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findExtendInput() {
    const selectors = [
      'input[placeholder*="extend" i]',
      'input[placeholder*="time" i]',
      'input[aria-label*="extend" i]',
      'input[type="text"][inputmode="numeric"]',
      'input[pattern*="\\d"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function insertAtCursor(textarea, text) {
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    ).set;
    const currentVal = textarea.value;
    const newVal =
      currentVal.substring(0, start) +
      text +
      "\n" +
      currentVal.substring(end);
    nativeInputValueSetter.call(textarea, newVal);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    const newPos = start + text.length + 1;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
  }

  function formatSunoTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function getPlayheadTime() {
    const timeSelectors = [
      '[class*="currentTime"]',
      '[class*="playback"] [class*="time"]',
      '[data-testid*="time"]',
      '[aria-label*="current time"]',
      'span[class*="time"]',
      'div[class*="player"] span',
    ];
    for (const sel of timeSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = el.textContent.trim();
        const match = text.match(/^(\d{1,2}):(\d{2})$/);
        if (match) return text;
      }
    }
    const audioEl = document.querySelector("audio");
    if (audioEl && !isNaN(audioEl.currentTime) && audioEl.currentTime > 0) {
      return formatSunoTime(audioEl.currentTime);
    }
    const allSpans = document.querySelectorAll("span, div, p");
    for (const el of allSpans) {
      if (el.children.length > 0) continue;
      const text = el.textContent.trim();
      if (/^\d{1,2}:\d{2}$/.test(text)) {
        const parent = el.closest('[class*="player"], [class*="audio"], [class*="playback"], [class*="controls"]');
        if (parent) return text;
      }
    }
    return null;
  }

  function syncToPlayhead() {
    const time = getPlayheadTime();
    if (!time) {
      showNotification("No playback detected. Play a track first!", "warning");
      return;
    }
    const extendInput = findExtendInput();
    if (!extendInput) {
      showNotification("Extend field not found on this page.", "warning");
      return;
    }
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeSetter.call(extendInput, time);
    extendInput.dispatchEvent(new Event("input", { bubbles: true }));
    extendInput.dispatchEvent(new Event("change", { bubbles: true }));
    showNotification("Synced to " + time, "success");
    const syncBtn = document.getElementById(SYNC_BTN_ID);
    if (syncBtn) {
      syncBtn.classList.add("scp-pulse");
      setTimeout(function () {
        syncBtn.classList.remove("scp-pulse");
      }, 600);
    }
  }

  function updateCharCounter() {
    const textarea = findLyricsArea();
    const counter = document.getElementById(CHAR_COUNTER_ID);
    if (!textarea || !counter) return;
    const len = textarea.value.length;
    counter.textContent = len + " / " + CHAR_LIMIT;
    counter.className = "scp-char-counter";
    if (len >= CHAR_DANGER) {
      counter.classList.add("scp-danger");
    } else if (len >= CHAR_WARN) {
      counter.classList.add("scp-warning");
    }
  }

  function showNotification(message, type) {
    const existing = document.querySelector(".scp-notification");
    if (existing) existing.remove();
    const notif = document.createElement("div");
    notif.className = "scp-notification scp-notif-" + (type || "info");
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(function () {
      notif.classList.add("scp-notif-fade");
      setTimeout(function () {
        notif.remove();
      }, 300);
    }, 2500);
  }

  function scrapeLibraryItems() {
    var items = [];
    var songCards = document.querySelectorAll(
      '[class*="song"], [class*="track"], [class*="item"], [class*="card"]'
    );
    songCards.forEach(function (card) {
      var titleEl =
        card.querySelector('[class*="title"], h3, h4, [class*="name"]');
      var styleEl = card.querySelector(
        '[class*="style"], [class*="tag"], [class*="genre"]'
      );
      var audioEl = card.querySelector("audio");
      var linkEl = card.querySelector('a[href*="/song/"]');
      if (titleEl) {
        var title = titleEl.textContent.trim();
        var style = styleEl ? styleEl.textContent.trim() : "";
        var audioSrc = audioEl ? audioEl.src : "";
        var songUrl = linkEl ? linkEl.href : "";
        if (title && (audioSrc || songUrl)) {
          items.push({
            title: title,
            style: style,
            audioSrc: audioSrc,
            songUrl: songUrl,
          });
        }
      }
    });
    return items;
  }

  function sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 200);
  }

  function batchExport() {
    var items = scrapeLibraryItems();
    if (items.length === 0) {
      showNotification(
        "No tracks found. Navigate to your Library page first.",
        "warning"
      );
      return;
    }
    var downloaded = 0;
    items.forEach(function (item) {
      if (!item.audioSrc) return;
      var styleSuffix = item.style
        ? "_[" + sanitizeFilename(item.style) + "]"
        : "";
      var filename = sanitizeFilename(item.title) + styleSuffix + ".mp3";
      chrome.runtime.sendMessage(
        {
          type: "TRIGGER_DOWNLOAD",
          url: item.audioSrc,
          filename: filename,
        },
        function () {
          downloaded++;
          if (downloaded === items.length) {
            showNotification(
              "Batch export complete! " + downloaded + " tracks.",
              "success"
            );
          }
        }
      );
    });
    showNotification("Exporting " + items.length + " tracks...", "info");
  }

  function injectToolbar() {
    if (document.getElementById(TOOLBAR_ID)) return;
    var textarea = findLyricsArea();
    if (!textarea) return;

    var toolbar = document.createElement("div");
    toolbar.id = TOOLBAR_ID;
    toolbar.className = "scp-toolbar";

    var tagSection = document.createElement("div");
    tagSection.className = "scp-tag-section";

    var tagLabel = document.createElement("span");
    tagLabel.className = "scp-section-label";
    tagLabel.textContent = "Structure";
    tagSection.appendChild(tagLabel);

    STRUCTURE_TAGS.forEach(function (tag) {
      var btn = document.createElement("button");
      btn.className = "scp-tag-btn";
      btn.textContent = tag;
      btn.title = "Insert " + tag;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var ta = findLyricsArea();
        if (ta) {
          insertAtCursor(ta, tag);
          updateCharCounter();
        }
      });
      tagSection.appendChild(btn);
    });
    toolbar.appendChild(tagSection);

    var toolsSection = document.createElement("div");
    toolsSection.className = "scp-tools-section";

    var syncBtn = document.createElement("button");
    syncBtn.id = SYNC_BTN_ID;
    syncBtn.className = "scp-tool-btn scp-sync-btn";
    syncBtn.innerHTML = "&#9654; SYNC PLAYHEAD";
    syncBtn.title = "Capture current playhead time and inject into Extend field";
    syncBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      syncToPlayhead();
    });
    toolsSection.appendChild(syncBtn);

    var batchBtn = document.createElement("button");
    batchBtn.id = BATCH_BTN_ID;
    batchBtn.className = "scp-tool-btn scp-batch-btn";
    batchBtn.innerHTML = "&#128229; BATCH EXPORT";
    batchBtn.title = "Export all tracks from your library with organized filenames";
    batchBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      batchExport();
    });
    toolsSection.appendChild(batchBtn);

    toolbar.appendChild(toolsSection);

    var charCounter = document.createElement("div");
    charCounter.id = CHAR_COUNTER_ID;
    charCounter.className = "scp-char-counter";
    charCounter.textContent = "0 / " + CHAR_LIMIT;
    toolbar.appendChild(charCounter);

    var parent = textarea.parentElement;
    if (parent) {
      parent.insertBefore(toolbar, textarea);
    } else {
      textarea.before(toolbar);
    }

    textarea.addEventListener("input", updateCharCounter);
    textarea.addEventListener("keyup", updateCharCounter);
    updateCharCounter();
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === "GET_PROMPT_DATA") {
      var styleInput = findStyleInput();
      var lyricsArea = findLyricsArea();
      sendResponse({
        style: styleInput ? styleInput.value : "",
        lyrics: lyricsArea ? lyricsArea.value : "",
      });
    }
    return true;
  });

  function init() {
    injectToolbar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  var observer = new MutationObserver(function (mutations) {
    var shouldReinject = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
          var node = mutations[i].addedNodes[j];
          if (node.nodeType === 1) {
            if (
              node.querySelector &&
              (node.querySelector("textarea") ||
                node.tagName === "TEXTAREA")
            ) {
              shouldReinject = true;
              break;
            }
          }
        }
      }
      if (shouldReinject) break;
    }
    if (shouldReinject) {
      setTimeout(init, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
