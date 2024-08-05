var saveCost = function () {
  var costBox = document.getElementById('cost');
  var val = parseInt(costBox.value);
  if (val > 0) {
    chrome.storage.local.set({cost: val});
  }
}

var saveTrigger = function () {
  var triggerBox = document.getElementById('trigger');
  var val = triggerBox.checked;
  chrome.storage.local.set({trigger_only_blank_tabs: val});
}

chrome.storage.local.get(
  ['cost', 'trigger_only_blank_tabs'],
  function(result) {
    var costBox = document.getElementById('cost');
    costBox.value = result.cost.toString();
    costBox.oninput = saveCost;

    var triggerBox = document.getElementById('trigger');
    triggerBox.checked = result.trigger_only_blank_tabs;
    triggerBox.oninput = saveTrigger;
});
