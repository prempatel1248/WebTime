let activeTab = null;
let startTime = null;

checkDateChange();

async function getUrlAndSwitchTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    if (tab && tab.url) {
        let domain = getDomainName(tab.url);
        if (domain) {
            handleTabSwitch(domain);
        }
    }
    return tab?.url;
}


function getFormattedDate() {
    return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function checkDateChange() {
    const newDate = getFormattedDate();
    chrome.storage.local.get('todayDate', (result) => {
        let todayDate = result.todayDate || "";
        // console.log(todayDate, " ", newDate);
        if (todayDate !== newDate) {
            chrome.storage.local.get({ webpages: [] }, (data) => {
                chrome.storage.local.set({ webpages: [] });
            })
            todayDate = newDate;
            chrome.storage.local.set({ todayDate });
        }
    });
}


let isPopupOpen = false;


setInterval(() => {
    checkDateChange();
    chrome.windows.getLastFocused((window) => {
        if (window.focused) {
            getUrlAndSwitchTab();
        } else if (window.state === "minimized") {
            closeAllTabs();
        }
        else if (isPopupOpen) {
            getUrlAndSwitchTab();
        } else {
            closeAllTabs();
        }
    });
}, 1000);

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "popup") {
        isPopupOpen = true;
        port.onDisconnect.addListener(() => {
            isPopupOpen = false;
        });
    }
});



function closeAllTabs() {
    const currentTime = Date.now();
    if (startTime) {
        const timeSpent = Math.round((currentTime - startTime) / 1000);

        chrome.storage.local.get({ webpages: [] }, (data) => {
            let webpages = data.webpages;

            webpages.forEach(element => {
                if (element.isActive) {
                    element.timeSpent += timeSpent;
                    element.isActive = false;
                }
            });

            chrome.storage.local.set({ webpages });

            activeTab = null;
            startTime = null;

        })
    }

}

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        closeAllTabs();
    } else {
        getUrlAndSwitchTab();
    }
});


function handleTabSwitch(newUrl) {
    if (!newUrl) return;

    const currentTime = Date.now();
    const previousTab = activeTab;
    if (previousTab && startTime) {
        const timeSpent = Math.round((currentTime - startTime) / 1000);

        chrome.storage.local.get({ webpages: [] }, (data) => {
            let webpages = data.webpages;
            const existingEntry = webpages.find((entry) => entry.url === previousTab);

            if (existingEntry) {
                existingEntry.timeSpent += timeSpent;
                existingEntry.isActive = false;
            }
            else {
                if (activeTab) {
                    webpages.push({
                        url: activeTab,
                        timeSpent: timeSpent,
                        startTime: 0,
                        isActive: false,
                    });
                }
            }

            const existingEntryNewUrl = webpages.find((entry) => entry.url === newUrl);

            if (existingEntryNewUrl) {
                existingEntryNewUrl.isActive = true;
                existingEntryNewUrl.startTime = currentTime;
            }
            else {
                webpages.push({
                    url: newUrl,
                    timeSpent: 0,
                    startTime: currentTime,
                    isActive: true,
                });
            }

            chrome.storage.local.set({ webpages });
        });
    }

    activeTab = newUrl;
    chrome.storage.local.set({ activeTab });
    startTime = currentTime;
}


function getDomainName(url) {
    try {
        const { hostname } = new URL(url);
        return hostname.replace(/^www\./, "");
    } catch (e) {
        // console.log("invalid url");
        return;
    }
}
