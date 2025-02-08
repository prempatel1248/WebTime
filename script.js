const port = chrome.runtime.connect({ name: "popup" });


document.addEventListener("DOMContentLoaded", () => {

    applySavedTheme();

    function saveThemePreference(theme) {
        chrome.storage.local.set({ theme });
    }

    function applySavedTheme() {
        chrome.storage.local.get('theme', (result) => {
            const theme = result.theme || 'light-mode';
            document.body.classList.add(theme);
        });
    }

    document.getElementById('reset-btn').addEventListener('click', () => {
        chrome.storage.local.get({ webpages: [] }, (data) => {
            chrome.storage.local.set({ webpages: [] });
        })
    })

    document.getElementById('changeMode-btn').addEventListener('click', () => {
        const body = document.body;

        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            saveThemePreference('light-mode');
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            saveThemePreference('dark-mode');
        }
    });


    const webpageList = document.getElementById("list");

    function removeDuplicateWebpages() {
        chrome.storage.local.get({ webpages: [] }, (data) => {
            let webpages = data.webpages;
            webpages.sort((a, b) => b.timeSpent - a.timeSpent);
            let uniqueMap = new Map();
            for (let item of webpages) {
                if (!uniqueMap.has(item.url)) {
                    uniqueMap.set(item.url, item);
                }
            }
            let uniqueWebpages = [...uniqueMap.values()];
            chrome.storage.local.set({ webpages: uniqueWebpages });
        });
    }


    let liveInterval;

    function updateList() {
        let activeTab;
        chrome.storage.local.get('activeTab', (result) => {
            activeTab = result.activeTab;
        });

        chrome.storage.local.get({ webpages: [] }, (data) => {
            const webpages = data.webpages;

            let str = "<hr>";

            webpages.sort((a, b) => b.timeSpent - a.timeSpent);

            webpages.forEach((entry) => {
                if (entry.url === activeTab) {
                    str += `<li class="activeTab"><span class="name">${entry.url}</span><span class="timeSpent">${formatTime(entry.timeSpent)}</span></li><hr>`;
                }
                else {
                    str += `<li><span class="name">${entry.url}</span><span class="timeSpent">${formatTime(entry.timeSpent)}</span></li><hr>`;
                }
            });
            webpageList.innerHTML = str;
        });
    }

    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const min = Math.floor((seconds % 3600) / 60);
        const sec = seconds % 60;

        return `${hrs.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }

    removeDuplicateWebpages();

    updateList();
    liveInterval = setInterval(updateList, 1000);
});