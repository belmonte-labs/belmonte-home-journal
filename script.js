//==================================================
// BELMONTE HOME JOURNAL v6.1
// Home live data: presence + recent visits + favorites
//==================================================

const API_URL =
    "https://belmonte-home-journal-api.stafochervictoria.workers.dev/";

const REFRESH_MS = 10000;
const TIME_ZONE = "America/Sao_Paulo";

const Pages = {
    home: { title: "Home", eyebrow: "BELMONTE RESIDENCE" },
    journal: { title: "Journal", eyebrow: "RESIDENCE ACTIVITY LOG" },
    favorites: { title: "Favorites", eyebrow: "PRIORITY VISITORS" },
    settings: { title: "Settings", eyebrow: "SYSTEM CONTROL" }
};

function EscapeHtml(value)
{
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function FormatDuration(seconds)
{
    seconds = Number(seconds) || 0;

    if (seconds < 60)
        return "< 1m";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0)
        return hours + "h " + minutes + "m";

    return minutes + "m";
}

function FormatDateTime(unix)
{
    if (!unix)
        return "";

    const date = new Date(Number(unix) * 1000);

    return date.toLocaleString("pt-BR", {
        timeZone: TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function FormatClock(date)
{
    return date.toLocaleTimeString("pt-BR", {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit"
    });
}

function GetGreeting(date)
{
    const hour = Number(
        new Intl.DateTimeFormat("pt-BR", {
            timeZone: TIME_ZONE,
            hour: "numeric",
            hour12: false
        }).format(date)
    );

    if (hour < 12)
        return "GOOD MORNING";

    if (hour < 18)
        return "GOOD AFTERNOON";

    return "GOOD EVENING";
}

function GetInitial(name)
{
    const clean = String(name || "").trim();
    return clean ? clean.charAt(0).toUpperCase() : "?";
}

async function FetchHomeData()
{
    try
    {
        console.log("[Home Journal] Fetching live data...");

        const response = await fetch(API_URL);

        if (!response.ok)
            throw new Error("API response: " + response.status);

        const data = await response.json();

        console.log("[Home Journal] API connected:", data);

        RenderCurrentlyHome(data);
        RenderRecentActivity(data);
        RenderFavorites(data);

        return data;
    }
    catch (error)
    {
        console.error("[Home Journal] API error:", error);
        return null;
    }
}

function RenderCurrentlyHome(data)
{
    const container = document.getElementById("presenceContainer");
    const count = document.getElementById("homeCount");

    if (!container || !count)
        return;

    const visitors = data.currentlyHome || [];
    count.textContent = visitors.length;

    if (visitors.length === 0)
    {
        container.className = "presence-card empty";
        container.innerHTML = `
            <div class="empty-icon">🌙</div>
            <div>
                <h3>Nobody is currently home</h3>
                <p>The residence is quiet.</p>
            </div>
        `;
        return;
    }

    container.className = "activity-list";

    let html = "";

    for (const visitor of visitors)
    {
        const name = EscapeHtml(visitor.name);
        const username = EscapeHtml(visitor.username);
        const since = FormatDateTime(visitor.enterTime);

        html += `
            <div class="activity-card">
                <div class="visitor-avatar">${EscapeHtml(GetInitial(visitor.name))}</div>
                <div class="visitor-info">
                    <div class="visitor-name">${name}</div>
                    <div class="visitor-user">@${username}</div>
                </div>
                <div class="visit-info">
                    <div class="visit-duration">HOME</div>
                    <div class="visit-date">${since}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function RenderRecentActivity(data)
{
    const container = document.getElementById("activityContainer");

    if (!container)
        return;

    const visits = (data.recentVisits || []).slice().reverse();

    if (visits.length === 0)
    {
        container.innerHTML = `
            <div class="presence-card empty">
                <div class="empty-icon">📝</div>
                <div>
                    <h3>No recent visits</h3>
                    <p>Waiting for the next recorded activity.</p>
                </div>
            </div>
        `;
        return;
    }

    let html = "";

    for (const visit of visits)
    {
        const name = EscapeHtml(visit.name);
        const username = EscapeHtml(visit.username);
        const duration = FormatDuration(visit.duration);
        const when = FormatDateTime(visit.leaveTime || visit.enterTime);

        html += `
            <div class="activity-card">
                <div class="visitor-avatar">${EscapeHtml(GetInitial(visit.name))}</div>
                <div class="visitor-info">
                    <div class="visitor-name">${name}</div>
                    <div class="visitor-user">@${username}</div>
                </div>
                <div class="visit-info">
                    <div class="visit-duration">${duration}</div>
                    <div class="visit-date">${when}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function RenderFavorites(data)
{
    const container = document.getElementById("favoritesContainer");

    if (!container)
        return;

    const favorites = data.favorites || [];
    let html = "";

    for (const favorite of favorites)
    {
        html += `
            <div class="favorite-card">
                <div class="favorite-heart">❤️</div>
                <h3>${EscapeHtml(favorite)}</h3>
                <p>Favorite visitor</p>
            </div>
        `;
    }

    html += `
        <button class="favorite-card add-favorite">
            +
            <span>Add Favorite</span>
        </button>
    `;

    container.innerHTML = html;
}

function Navigate(pageName)
{
    document.querySelectorAll(".page").forEach(function (page)
    {
        page.classList.remove("active");
    });

    const targetPage = document.getElementById("page-" + pageName);
    if (targetPage)
        targetPage.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(function (item)
    {
        item.classList.remove("active");
    });

    const activeButton = document.querySelector(`[onclick="Navigate('${pageName}')"]`);
    if (activeButton)
        activeButton.classList.add("active");

    if (Pages[pageName])
    {
        document.getElementById("pageTitle").textContent = Pages[pageName].title;
        document.getElementById("pageEyebrow").textContent = Pages[pageName].eyebrow;
    }

    const content = document.getElementById("content");
    if (content)
        content.scrollTo({ top: 0, behavior: "smooth" });
}

function UpdateClock()
{
    const now = new Date();
    const clock = document.getElementById("clock");
    const greeting = document.getElementById("welcomeSmall");

    if (clock)
        clock.textContent = FormatClock(now);

    if (greeting)
        greeting.textContent = GetGreeting(now);
}

async function ManualSync()
{
    const button = (typeof event !== "undefined" && event.currentTarget)
        ? event.currentTarget
        : null;

    const originalText = button ? button.innerHTML : "";

    if (button)
    {
        button.innerHTML = "🔄 Syncing...";
        button.disabled = true;
    }

    await FetchHomeData();

    if (button)
    {
        button.innerHTML = "✅ Synced";

        setTimeout(function ()
        {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1200);
    }
}

function Initialize()
{
    console.log("BELMONTE HOME JOURNAL v6.1");

    FetchHomeData();
    UpdateClock();

    setInterval(UpdateClock, 1000);
    setInterval(FetchHomeData, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", Initialize);
