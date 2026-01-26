const databaseConnectionString = process.env.DATABASE_URL

const jwtSecretKey = process.env.JWT_SECRET
const jwtExpTime = "30d";

const digitalOceanSecretAccessKey = process.env.DO_SPACE_KEY;
const digitalOceanAccessKeyId = process.env.DO_SPACE_ID;

// Google Maps API Key - moved to environment variable for security
const GMapApiKey = process.env.GMAP_API_KEY;

if (!GMapApiKey) {
    console.error("ERROR: GMAP_API_KEY environment variable is not set!");
    console.error("Please set GMAP_API_KEY in your .env file or environment variables.");
}

module.exports = {
    GMapApiKey,
    digitalOceanAccessKeyId,
    digitalOceanSecretAccessKey,
    databaseConnectionString,
    jwtSecretKey,
    jwtExpTime,
};
