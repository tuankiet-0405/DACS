const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/car');
const bookingRoutes = require('./routes/booking');
const paymentRoutes = require('./routes/payment');
const reviewRoutes = require('./routes/review');
const adminBookingRoutes = require('./routes/bookingRoutes');
const adminCarRoutes = require('./routes/adminCarsRoutes_new');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const voucherRoutes = require('./routes/voucherRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Tăng giới hạn kích thước lên 50MB
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Tăng giới hạn kích thước lên 50MB
app.use(cookieParser());

// Static files configuration
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminBookingRoutes);
app.use('/api/admin', adminCarRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/admin', transactionRoutes);
app.use('/api/admin', voucherRoutes);

// Frontend routes
app.get('/', (req, res) => {
    res.redirect('/public/index.html');
});

// Add route to serve public/index.html directly
app.get('/public/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle HTML page routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'account.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Serve other HTML pages from views directory
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.endsWith('.html')) {
        res.sendFile(path.join(__dirname, 'views', page));
    } else {
        next();
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        message: 'Đã xảy ra lỗi server' 
    });
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});
