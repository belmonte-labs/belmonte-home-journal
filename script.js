const API_URL =
    "https://belmonte-home-journal-api.stafochervictoria.workers.dev/";


//==================================================
// LOAD HOME DATA
//==================================================

async function LoadHomeData()
{

    try
    {

        const response =
            await fetch(API_URL);

        const data =
            await response.json();


        const visitor =
            document.getElementById("visitor");


        visitor.textContent =
            data.visitor;


        console.log(
            "Home Journal data:",
            data
        );

    }

    catch(error)
    {

        console.error(
            "Connection error:",
            error
        );

        document.getElementById(
            "visitor"
        ).textContent =
            "Connection error";

    }

}


//==================================================
// START
//==================================================

LoadHomeData();
