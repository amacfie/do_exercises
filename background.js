chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set({
      power: 10,
      cost: 1,
      trigger_only_blank_tabs: true
    });
    chrome.action.setBadgeText({text: (10).toString()});
    chrome.action.setBadgeBackgroundColor({color: '#fdf6e3'});
  }
});

// set badge on startup
chrome.storage.local.get(
  ['power'],
  function  (result) {
    if (result.power !== undefined) {
      chrome.action.setBadgeText({text: (result.power).toString()});
      if (result.power === 0) {
        chrome.action.setBadgeBackgroundColor({color: '#dc322f'});
      } else {
        chrome.action.setBadgeBackgroundColor({color: '#fdf6e3'});
      }
    }
  }
);

chrome.tabs.onCreated.addListener(function (tab) {
  chrome.storage.local.get(
    ['power', 'cost', 'trigger_only_blank_tabs'],
    function(result) {
      if (
        result.trigger_only_blank_tabs
        && !('pendingUrl' in tab && tab.pendingUrl === 'chrome://newtab/')
      ) {
        return;
      }

      let newPower = Math.max(0, result.power - result.cost);
      chrome.storage.local.set({power: newPower});
      chrome.action.setBadgeText({text: newPower.toString()});
      if (newPower === 0) {
        chrome.action.setBadgeBackgroundColor({color: '#dc322f'});
      }
      if (result.power === 0) {
        chrome.runtime.openOptionsPage();
      }
  });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage();
});

