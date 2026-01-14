const databaseConnectionString = process.env.DATABASE_URL

const jwtSecretKey = process.env.JWT_SECRET
const jwtExpTime = "30d";

const digitalOceanSecretAccessKey = process.env.DO_SPACE_KEY;
const digitalOceanAccessKeyId = process.env.DO_SPACE_ID;

GMapApiKey="AIzaSyDP2UHQRlcWCm-1VNOCJfXFUmLQM4bVJ0E"

module.exports = {
    GMapApiKey,
    digitalOceanAccessKeyId,
    digitalOceanSecretAccessKey,
    databaseConnectionString,
    jwtSecretKey,
    jwtExpTime,
};
