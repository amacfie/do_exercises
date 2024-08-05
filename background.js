chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set({
      power: 10
    });
    chrome.action.setBadgeText({text: (10).toString()});
    chrome.action.setBadgeBackgroundColor({color: '#fdf6e3'});
  }
});

chrome.tabs.onCreated.addListener(function (tab) {
  // only triggers if the user is opening a blank new tab
  if (!('pendingUrl' in tab && tab.pendingUrl === 'chrome://newtab/')) {
    return;
  }
  chrome.storage.local.get(
    ['power'],
    function(result) {
      let newPower = Math.max(0, result.power - 1);
      chrome.storage.local.set({power: newPower});
      chrome.action.setBadgeText({text: newPower.toString()});
      if (newPower <= 1) {
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

