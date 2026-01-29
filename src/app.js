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


// CORS configuration - restrict to specific origins for security
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173']; // Default to common dev origins

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
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
// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        message: "Too many authentication attempts, please try again later",
        extensions: {
            code: "RATE_LIMIT_EXCEEDED"
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
        const duration = Date.now() - startTime;
        const logData = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
        };
        
        // Log errors
        if (res.statusCode >= 400) {
            console.error('[ERROR]', JSON.stringify(logData));
        } else {
            console.log('[REQUEST]', JSON.stringify(logData));
        }
        
        return originalSend.call(this, data);
    };
    
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

