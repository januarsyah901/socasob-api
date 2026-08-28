const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');
const setupSwagger = require('./config/swagger');

// Load environment variables
dotenv.config();

const app = express();

// Setup Swagger documentation
setupSwagger(app);

// Middleware
const allowedOrigin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

app.use(cors({
  origin: [allowedOrigin, 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/log', require('./routes/log.routes'));
app.use('/api/resume', require('./routes/resume.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/robot', require('./routes/robot.routes'));
app.use('/api/push', require('./routes/push.routes'));
app.use('/api/robots', require('./routes/robot.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/companion', require('./routes/companion.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Global error handler
app.use(errorHandler);

module.exports = app;
