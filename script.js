const API_URL =
    "https://belmonte-home-journal-api.stafochervictoria.workers.dev/";

const REFRESH_MS = 10000;
const TIME_ZONE = "America/Sao_Paulo";
const HOME_ACTIVITY_LIMIT = 10;

const Pages = {
    home: { eyebrow: "BELMONTE RESIDENCE" },
    journal: { eyebrow: "JOURNAL" },
    favorites: { eyebrow: "FAVORITES" },
    settings: { eyebrow: "SETTINGS" }
};

let journalVisits = [];
let lastData = {
    currentlyHome: [],
    recentVisits: [],
    favorites: [],
    lastChecked: 0,
    logClearedAt: 0
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

function SetFavStatus(text)
{
    const el = document.getElementById("favStatus");
    if (el)
        el.textContent = text;
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
    return `
        <div class="activity-card">
            <div class="visitor-avatar">${EscapeHtml(GetInitial(visit.name))}</div>
            <div class="visitor-info">
                <div class="visitor-name">${EscapeHtml(visit.name)}</div>
                <div class="visitor-user">@${EscapeHtml(visit.username)}</div>
            </div>
            <div class="visit-info">
                <div class="visit-duration">${FormatDuration(visit.duration)}</div>
                <div class="visit-date">${FormatDateTime(visit.leaveTime || visit.enterTime)}</div>
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

        RenderWhileAway(data);
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
            lastChecked: lastData.lastChecked || 0,
            logClearedAt: lastData.logClearedAt || 0
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

function RenderWhileAway(data)
{
    const container = document.getElementById("whileAwayContainer");
    const subtitle = document.getElementById("awaySubtitle");

    if (!container)
        return;

    let lastChecked = Number(data.lastChecked) || 0;
    const visits = data.recentVisits || [];
    const current = data.currentlyHome || [];

    if (lastChecked === 0)
        lastChecked = Math.floor(Date.now() / 1000) - 86400;

    if (subtitle)
        subtitle.textContent = "Since " + FormatDateTime(lastChecked);

    const finished = visits.filter(function (visit)
    {
        return Number(visit.leaveTime) > lastChecked;
    });

    const stillHere = current.filter(function (visitor)
    {
        return Number(visitor.enterTime) > lastChecked;
    });

    if (finished.length === 0 && stillHere.length === 0)
    {
        container.className = "presence-card empty";

        if (current.length >= 3)
        {
            container.innerHTML = EmptyState(
                String(current.length),
                "The house is full.",
                "No new visitors since last check."
            );
        }
        else if (current.length > 0)
        {
            container.innerHTML = EmptyState(
                String(current.length),
                "People are home.",
                "No new visitors since last check."
            );
        }
        else
        {
            container.innerHTML = EmptyState(
                "·",
                "The house is still.",
                "No visitors while you were away."
            );
        }
        return;
    }

    const unique = [];
    let lastVisit = null;
    let people = "";
    const seen = [];
    let i;

    for (i = 0; i < finished.length; i++)
    {
        const visit = finished[i];
        const key = String(visit.username || visit.name);

        if (unique.indexOf(key) === -1)
            unique.push(key);

        if (!lastVisit || Number(visit.leaveTime) >= Number(lastVisit.leaveTime || lastVisit.enterTime))
            lastVisit = visit;
    }

    for (i = 0; i < stillHere.length; i++)
    {
        const visitor = stillHere[i];
        const key = String(visitor.username || visitor.name);

        if (unique.indexOf(key) === -1)
            unique.push(key);

        if (!lastVisit || Number(visitor.enterTime) >= Number(lastVisit.leaveTime || lastVisit.enterTime))
            lastVisit = visitor;
    }

    for (i = 0; i < stillHere.length; i++)
    {
        const visitor = stillHere[i];
        const key = String(visitor.username || visitor.name);
        if (seen.indexOf(key) !== -1)
            continue;
        seen.push(key);

        people += `
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

    for (i = 0; i < finished.length; i++)
    {
        const visit = finished[i];
        const key = String(visit.username || visit.name);
        if (seen.indexOf(key) !== -1)
            continue;
        seen.push(key);

        people += `
            <div class="activity-card">
                <div class="visitor-avatar">${EscapeHtml(GetInitial(visit.name))}</div>
                <div class="visitor-info">
                    <div class="visitor-name">${EscapeHtml(visit.name)}</div>
                    <div class="visitor-user">@${EscapeHtml(visit.username)}</div>
                </div>
            </div>
        `;
    }

    const lastName = lastVisit ? lastVisit.name : "";
    const lastUser = lastVisit ? lastVisit.username : "";

    container.className = "activity-list";
    container.innerHTML = `
        <div class="presence-card">
            <div class="empty-icon">!</div>
            <div>
                <h3>Updates: ${finished.length + stillHere.length} · Unique: ${unique.length}</h3>
                <p>Latest: ${EscapeHtml(lastName)} (@${EscapeHtml(lastUser)})</p>
            </div>
        </div>
        ${people}
    `;
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
            "·",
            "No one is home.",
            "The rooms are quiet."
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

    const visits = journalVisits.slice(0, HOME_ACTIVITY_LIMIT);

    if (visits.length === 0)
    {
        container.innerHTML = EmptyState(
            "·",
            "No recent footsteps.",
            "Waiting for the next visit."
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
            "·",
            "The book is empty.",
            "Visits will collect here."
        );
        return;
    }

    if (visits.length === 0)
    {
        container.innerHTML = EmptyState(
            "·",
            "No one by that name.",
            "Try another."
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

    if (favorites.length === 0)
    {
        container.innerHTML = EmptyState(
            "♥",
            "No favorites yet.",
            "Mark someone the house should recognize."
        );
        return;
    }

    let html = "";

    for (let i = 0; i < favorites.length; i++)
    {
        html += `
            <div class="activity-card">
                <div class="favorite-mark">♥</div>
                <div class="visitor-info">
                    <div class="visitor-name">${EscapeHtml(favorites[i])}</div>
                    <div class="visitor-user">Always welcome</div>
                </div>
                <button class="text-button" onclick="RemoveFavoriteAt(${i})">Remove</button>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function AddFavorite()
{
    const input = document.getElementById("favNameInput");
    const fav = input ? input.value.trim() : "";

    if (!fav)
    {
        SetFavStatus("Type a display name or username first.");
        return;
    }

    const current = lastData.favorites || [];
    const exists = current.some(function (item)
    {
        return String(item).trim().toLowerCase() === fav.toLowerCase();
    });

    if (exists)
    {
        SetFavStatus("Already saved: " + fav);
        return;
    }

    lastData.favorites = current.concat([fav]);
    RenderFavorites(lastData);
    SetFavStatus("Added: " + fav);

    if (input)
        input.value = "";

    try
    {
        await PushState();
        SetFavStatus("Saved: " + fav);
    }
    catch (error)
    {
        console.error("[Home Journal] Add Favorite error:", error);
        SetFavStatus("Could not save. Try again.");
    }
}

async function RemoveFavoriteAt(index)
{
    const current = lastData.favorites || [];

    if (index < 0 || index >= current.length)
        return;

    const removed = current[index];
    current.splice(index, 1);
    lastData.favorites = current;

    RenderFavorites(lastData);
    SetFavStatus("Removed: " + removed);

    try
    {
        await PushState();
        SetFavStatus("Removed: " + removed);
    }
    catch (error)
    {
        console.error("[Home Journal] Remove Favorite error:", error);
        SetFavStatus("Could not remove. Try again.");
    }
}

async function ResetCheck()
{
    lastData.lastChecked = Math.floor(Date.now() / 1000);
    RenderWhileAway(lastData);

    try
    {
        await PushState();
    }
    catch (error)
    {
        console.error("[Home Journal] Reset Check error:", error);
    }
}

async function ClearJournal()
{
    lastData.recentVisits = [];
    lastData.logClearedAt = Math.floor(Date.now() / 1000);
    journalVisits = [];

    RenderWhileAway(lastData);
    RenderRecentActivity();
    RenderJournal();

    try
    {
        await PushState();
        Navigate("journal");
    }
    catch (error)
    {
        console.error("[Home Journal] Clear Log error:", error);
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
        document.getElementById("pageEyebrow").textContent = Pages[pageName].eyebrow;

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
        button.innerHTML = "Syncing...";
        button.disabled = true;
    }

    await FetchHomeData();

    if (button)
    {
        button.innerHTML = "Synced";

        setTimeout(function ()
        {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1200);
    }
}

function Initialize()
{
    FetchHomeData();
    UpdateClock();
    setInterval(UpdateClock, 1000);
    setInterval(FetchHomeData, REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", Initialize);
