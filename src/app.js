const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const app = express()
var cors = require('cors');

require('dotenv').config();

var fireBaseAdmin = require("firebase-admin");

var serviceAccount = require("../eaxi-f8194-firebase-adminsdk-msl6w-83ecc93cc1.json");

fireBaseAdmin.initializeApp({
    credential: fireBaseAdmin.credential.cert(serviceAccount),
});


const server = http.createServer(app)
const io = socketio(server)

var indexRouter = require('./routes');
var customerRouter = require('./routes/customer');
var driverRouter = require('./routes/driver');
var fileUploadRouter = require('./routes/fileUpload');
var tripRouter = require('./routes/trip');
var transactionRouter = require('./routes/transaction');
var adminRouter = require('./routes/admin');


const stateManager = require("./utils/stateManager");


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    socket.on('driverLocation', (data) => {
        stateManager.drivers[data.driver.id] = {socketId: socket.id, ...data};
        io.emit('allDriverLocation', Object.values(stateManager.drivers));
    });

    socket.on('joinBookingRequest', (data) => {
        socket.join(data.driverId);
    });

    socket.on('joinTrip', (data) => {
        socket.join(data.bookingId);
    });

    socket.on('connectedTripUpdate', (data) => {
        const driver = stateManager.drivers[data.driverId]
        io.to(data.bookingId).emit('connectedTrip', {...data, ...driver});
    });


    // Handle socket client disconnection
    socket.on('disconnect', () => {
        const driverToRemove = Object.values(stateManager.drivers).find(driver => driver.socketId === socket.id);
        if (driverToRemove) {
            delete stateManager.drivers[driverToRemove.driver.id];
            // Broadcast the updated driverList to all connected clients after removal
            io.emit('allDriverLocation', Object.values(stateManager.drivers));
        }
    });
})
app.use(function(req,res,next){
    req.io = io;
    next();
});


app.use('/', indexRouter);
app.use('/customer', customerRouter);
app.use("/driver", driverRouter);
app.use("/trip", tripRouter);
app.use("/transaction", transactionRouter);
app.use("/admin", adminRouter);

app.use("/getFileUploadUrl", fileUploadRouter);

const PORT = process.env.PORT || 8001


server.listen(PORT, () => {
    console.log('Server is up at ' + PORT)
})

