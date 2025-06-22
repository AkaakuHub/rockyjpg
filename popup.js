document.addEventListener("DOMContentLoaded", function () {
    // 現在のタブが対象ページかどうかをチェック
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        const statusElement = document.querySelector('.status');
        
        if (currentTab.url && currentTab.url.includes('~rocky/lecture/VisComp/hw25.php')) {
            statusElement.className = 'status active';
            statusElement.innerHTML = '<span class="status-icon">✅</span>対象ページで動作中';
        } else {
            statusElement.className = 'status';
            statusElement.style.backgroundColor = '#fff3cd';
            statusElement.style.color = '#856404';
            statusElement.innerHTML = '<span class="status-icon">ℹ️</span>対象ページではありません';
        }
    });
});