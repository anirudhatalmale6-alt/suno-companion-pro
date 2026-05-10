document.addEventListener("DOMContentLoaded", function () {
  var vaultList = document.getElementById("vaultList");
  var saveBtn = document.getElementById("saveBtn");
  var clearBtn = document.getElementById("clearBtn");
  var statusArea = document.getElementById("statusArea");

  function showStatus(message, type) {
    statusArea.innerHTML =
      '<div class="status-msg status-' + type + '">' + message + "</div>";
    setTimeout(function () {
      statusArea.innerHTML = "";
    }, 2500);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function updateList() {
    chrome.storage.local.get(["vault"], function (result) {
      var vault = result.vault || [];
      if (vault.length === 0) {
        vaultList.innerHTML =
          '<div class="empty-state">' +
          '<div class="icon">&#128274;</div>' +
          "<p>Your vault is empty.<br>Open Suno.com and click " +
          '"Save Current Prompt" to store your style tags and lyrics.</p>' +
          "</div>";
        return;
      }
      vaultList.innerHTML = "";
      vault.forEach(function (entry, index) {
        var div = document.createElement("div");
        div.className = "vault-item";

        var lyricsPreview = entry.lyrics || "";
        if (lyricsPreview.length > 120) {
          lyricsPreview = lyricsPreview.substring(0, 120) + "...";
        }

        div.innerHTML =
          '<div class="vault-item-header">' +
          '<span class="vault-item-name">' +
          escapeHtml(entry.name) +
          "</span>" +
          '<div class="vault-item-actions">' +
          '<button class="vault-mini-btn copy-btn" data-index="' +
          index +
          '">Copy</button>' +
          '<button class="vault-mini-btn delete" data-index="' +
          index +
          '">&#10005;</button>' +
          "</div>" +
          "</div>" +
          (entry.style
            ? '<div class="vault-item-style">' +
              escapeHtml(entry.style) +
              "</div>"
            : "") +
          (entry.lyrics
            ? '<div class="vault-item-lyrics">' +
              escapeHtml(lyricsPreview) +
              "</div>"
            : "");

        vaultList.appendChild(div);
      });

      document.querySelectorAll(".copy-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(this.getAttribute("data-index"));
          chrome.storage.local.get(["vault"], function (result) {
            var v = result.vault || [];
            if (v[idx]) {
              var text = "";
              if (v[idx].style) text += "Style: " + v[idx].style + "\n\n";
              if (v[idx].lyrics) text += v[idx].lyrics;
              navigator.clipboard.writeText(text).then(function () {
                showStatus("Copied to clipboard!", "success");
              });
            }
          });
        });
      });

      document.querySelectorAll(".delete").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(this.getAttribute("data-index"));
          chrome.storage.local.get(["vault"], function (result) {
            var v = result.vault || [];
            v.splice(idx, 1);
            chrome.storage.local.set({ vault: v }, updateList);
          });
        });
      });
    });
  }

  saveBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes("suno.com")) {
        showStatus("Navigate to suno.com first!", "error");
        return;
      }
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "GET_PROMPT_DATA" },
        function (response) {
          if (chrome.runtime.lastError || !response) {
            showStatus("Could not read page. Refresh suno.com and try again.", "error");
            return;
          }
          if (!response.style && !response.lyrics) {
            showStatus("No style or lyrics found on the page.", "error");
            return;
          }
          chrome.storage.local.get(["vault"], function (result) {
            var vault = result.vault || [];
            var newEntry = {
              name: "Prompt " + (vault.length + 1),
              style: response.style,
              lyrics: response.lyrics,
              timestamp: Date.now(),
            };
            vault.unshift(newEntry);
            chrome.storage.local.set({ vault: vault }, function () {
              updateList();
              showStatus("Prompt saved to vault!", "success");
            });
          });
        }
      );
    });
  });

  clearBtn.addEventListener("click", function () {
    if (confirm("Clear all saved prompts? This cannot be undone.")) {
      chrome.storage.local.set({ vault: [] }, function () {
        updateList();
        showStatus("Vault cleared.", "success");
      });
    }
  });

  updateList();
});
