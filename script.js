//==================================================
// BELMONTE HOME JOURNAL v6
// SUPREME UPDATE
// Interface + Live API
//==================================================


//==================================================
// API
//==================================================

const API_URL =
    "https://belmonte-home-journal-api.stafochervictoria.workers.dev/";


//==================================================
// PAGE DATA
//==================================================

const Pages =
{
    home:
    {
        title: "Home",
        eyebrow: "BELMONTE RESIDENCE"
    },

    journal:
    {
        title: "Journal",
        eyebrow: "RESIDENCE ACTIVITY LOG"
    },

    favorites:
    {
        title: "Favorites",
        eyebrow: "PRIORITY VISITORS"
    },

    settings:
    {
        title: "Settings",
        eyebrow: "SYSTEM CONTROL"
    }
};


//==================================================
// FETCH HOME DATA
//==================================================

async function FetchHomeData()
{
    try
    {
        console.log(
            "[Home Journal] Fetching live data..."
        );


        const response =
            await fetch(API_URL);


        if(!response.ok)
        {
            throw new Error(
                "API response: "
                +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "[Home Journal] API connected:"
        );

        console.log(data);


        // Render live data

        RenderCurrentlyHome(data);

        RenderFavorites(data);


        return data;
    }


    catch(error)
    {
        console.error(
            "[Home Journal] API error:",
            error
        );

        return null;
    }
}


//==================================================
// RENDER CURRENTLY HOME
//==================================================

function RenderCurrentlyHome(data)
{
    const container =
        document.getElementById(
            "presenceContainer"
        );


    const count =
        document.getElementById(
            "homeCount"
        );


    if(!container || !count)
    {
        console.warn(
            "[Home Journal] Presence elements not found"
        );

        return;
    }


    const visitors =
        data.currentlyHome || [];


    console.log(
        "[Home Journal] Currently home:",
        visitors.length
    );


    count.textContent =
        visitors.length;


    // Nobody home

    if(visitors.length === 0)
    {
        container.className =
            "presence-card empty";


        container.innerHTML = `

            <div class="empty-icon">
                ◌
            </div>

            <div>

                <h3>
                    Nobody is currently home
                </h3>

                <p>
                    The residence is quiet.
                </p>

            </div>

        `;

        return;
    }


    // Visitors home

    container.className =
        "presence-card";


    let html = "";


    for(const visitor of visitors)
    {
        const initial =
            visitor.name
                .charAt(0)
                .toUpperCase();


        html += `

            <div class="activity-card">

                <div class="visitor-avatar">
                    ${initial}
                </div>

                <div class="visitor-info">

                    <div class="visitor-name">
                        ${visitor.name}
                    </div>

                    <div class="visitor-user">
                        @${visitor.username}
                    </div>

                </div>

                <div class="visit-info">

                    <div class="visit-duration">
                        🟢 HOME
                    </div>

                </div>

            </div>

        `;
    }


    container.innerHTML =
        html;
}


//==================================================
// RENDER FAVORITES
//==================================================

function RenderFavorites(data)
{
    const container =
        document.getElementById(
            "favoritesContainer"
        );


    if(!container)
    {
        console.warn(
            "[Home Journal] Favorites container not found"
        );

        return;
    }


    const favorites =
        data.favorites || [];


    console.log(
        "[Home Journal] Favorites:",
        favorites.length
    );


    let html = "";


    for(const favorite of favorites)
    {
        html += `

            <div class="favorite-card">

                <div class="favorite-heart">
                    ♥
                </div>

                <h3>
                    ${favorite}
                </h3>

                <p>
                    Favorite visitor
                </p>

            </div>

        `;
    }


    html += `

        <button
            class="favorite-card add-favorite"
        >

            +

            <span>
                Add Favorite
            </span>

        </button>

    `;


    container.innerHTML =
        html;
}


//==================================================
// NAVIGATION
//==================================================

function Navigate(pageName)
{
    console.log(
        "[Home Journal] Navigating to:",
        pageName
    );


    const pages =
        document.querySelectorAll(
            ".page"
        );


    pages.forEach(
        function(page)
        {
            page.classList.remove(
                "active"
            );
        }
    );


    const targetPage =
        document.getElementById(
            "page-" + pageName
        );


    if(targetPage)
    {
        targetPage.classList.add(
            "active"
        );
    }


    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        function(item)
        {
            item.classList.remove(
                "active"
            );
        }
    );


    const activeButton =
        document.querySelector(
            `[onclick="Navigate('${pageName}')"]`
        );


    if(activeButton)
    {
        activeButton.classList.add(
            "active"
        );
    }


    if(Pages[pageName])
    {
        document.getElementById(
            "pageTitle"
        ).textContent =
            Pages[pageName].title;


        document.getElementById(
            "pageEyebrow"
        ).textContent =
            Pages[pageName].eyebrow;
    }


    const content =
        document.getElementById(
            "content"
        );


    if(content)
    {
        content.scrollTo(
            {
                top: 0,
                behavior: "smooth"
            }
        );
    }
}


//==================================================
// CLOCK
//==================================================

function UpdateClock()
{
    const clock =
        document.getElementById(
            "clock"
        );


    if(!clock)
        return;


    const now =
        new Date();


    clock.textContent =
        now.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


//==================================================
// MANUAL SYNC
//==================================================

async function ManualSync()
{
    console.log(
        "[Home Journal] Manual synchronization requested"
    );


    const button =
        event ?
        event.currentTarget :
        null;


    const originalText =
        button ?
        button.innerHTML :
        "";


    if(button)
    {
        button.innerHTML =
            "↻ Syncing...";

        button.disabled =
            true;
    }


    // Get fresh data

    await FetchHomeData();


    if(button)
    {
        button.innerHTML =
            "✓ Synced";


        setTimeout(
            function()
            {
                button.innerHTML =
                    originalText;

                button.disabled =
                    false;
            },
            1500
        );
    }
}


//==================================================
// INITIALIZE
//==================================================

function Initialize()
{
    console.log(
        "================================="
    );

    console.log(
        "BELMONTE HOME JOURNAL v6"
    );

    console.log(
        "SUPREME UPDATE INITIALIZED"
    );

    console.log(
        "================================="
    );


    // Fetch live data

    FetchHomeData();


    // Start clock

    UpdateClock();


    setInterval(
        UpdateClock,
        1000
    );
}


//==================================================
// START
//==================================================

document.addEventListener(
    "DOMContentLoaded",
    Initialize
);
