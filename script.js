//==================================================
// BELMONTE HOME JOURNAL v6.3
// Home + Journal + Add Favorite
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

let journalVisits = [];
let lastData = {
    currentlyHome: [],
    recentVisits: [],
    favorites: [],
    lastChecked: 0
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

function VisitCard(visit)
{
    const name = EscapeHtml(visit.name);
    const username = EscapeHtml(visit.username);
    const duration = FormatDuration(visit.duration);
    const when = FormatDateTime(visit.leaveTime || visit.enterTime);

    return `
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

function EmptyState(icon, title, text)
{
    return `
        <div class="presence-card empty">
            <div class="empty-icon">${icon}</div>
            <div>
                <h3>${title}</h3>
                <p>${text}</p>
            </div>
        </div>
    `;
}

async function FetchHomeData()
{
    try
    {
        const response = await fetch(API_URL);

        if (!response.ok)
            throw new Error("API response: " + response.status);

        const data = await response.json();

        lastData = data;
        journalVisits = (data.recentVisits || []).slice().reverse();

        RenderCurrentlyHome(data);
        RenderRecentActivity();
        RenderJournal();
        RenderFavorites(data);

        return data;
    }
    catch (error)
    {
        console.error("[Home Journal] API error:", error);
        return null;
    }
}

async function PushState()
{
    const payload = {
        action: "sync",
        data: {
            currentlyHome: lastData.currentlyHome || [],
            recentVisits: lastData.recentVisits || [],
            favorites: lastData.favorites || [],
            lastChecked: lastData.lastChecked || 0
        }
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok)
        throw new Error("API response: " + response.status);
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
        container.innerHTML = EmptyState(
            "🌙",
            "Nobody is currently home",
            "The residence is quiet."
        );
        return;
    }

    container.className = "activity-list";

    let html = "";

    for (const visitor of visitors)
    {
        html += `
            <div class="activity-card">
                <div class="visitor-avatar">${EscapeHtml(GetInitial(visitor.name))}</div>
                <div class="visitor-info">
                    <div class="visitor-name">${EscapeHtml(visitor.name)}</div>
                    <div class="visitor-user">@${EscapeHtml(visitor.username)}</div>
                </div>
                <div class="visit-info">
                    <div class="visit-duration">HOME</div>
                    <div class="visit-date">${FormatDateTime(visitor.enterTime)}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function RenderRecentActivity()
{
    const container = document.getElementById("activityContainer");

    if (!container)
        return;

    const visits = journalVisits.slice(0, 10);

    if (visits.length === 0)
    {
        container.innerHTML = EmptyState(
            "📝",
            "No recent visits",
            "Waiting for the next recorded activity."
        );
        return;
    }

    container.innerHTML = visits.map(VisitCard).join("");
}

function GetJournalQuery()
{
    const input = document.getElementById("journalSearch");
    return input ? input.value.trim().toLowerCase() : "";
}

function FilterJournal()
{
    RenderJournal();
}

function RenderJournal()
{
    const container = document.getElementById("journalContainer");

    if (!container)
        return;

    const query = GetJournalQuery();

    const visits = journalVisits.filter(function (visit)
    {
        if (!query)
            return true;

        const name = String(visit.name || "").toLowerCase();
        const username = String(visit.username || "").toLowerCase();

        return name.includes(query) || username.includes(query);
    });

    if (journalVisits.length === 0)
    {
        container.innerHTML = EmptyState(
            "📖",
            "No visits recorded yet",
            "Your visit history will appear here."
        );
        return;
    }

    if (visits.length === 0)
    {
        container.innerHTML = EmptyState(
            "🔍",
            "No matching visitors",
            "Try another name or username."
        );
        return;
    }

    container.innerHTML = visits.map(VisitCard).join("");
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
        <button class="favorite-card add-favorite" onclick="AddFavorite()">
            +
            <span>Add Favorite</span>
        </button>
    `;

    container.innerHTML = html;
}

async function AddFavorite()
{
    const typed = prompt("Type the display name or username to add as favorite:");

    if (typed === null)
        return;

    const fav = typed.trim();

    if (!fav)
        return;

    const current = lastData.favorites || [];
    const exists = current.some(function (item)
    {
        return String(item).trim().toLowerCase() === fav.toLowerCase();
    });

    if (exists)
    {
        alert("Favorite already exists: " + fav);
        return;
    }

    lastData.favorites = current.concat([fav]);
    RenderFavorites(lastData);

    try
    {
        await PushState();
    }
    catch (error)
    {
        console.error("[Home Journal] Add Favorite error:", error);
        alert("Could not save favorite to the API.");
    }
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
    console.log("BELMONTE HOME JOURNAL v6.3");

    FetchHomeData();
    UpdateClock();

    setInterval(UpdateClock, 1000);
    setInterval(FetchHomeData, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", Initialize);
