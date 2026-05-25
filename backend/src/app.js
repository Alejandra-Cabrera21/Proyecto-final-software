require('dotenv').config()
const express = require('express')
const cors = require('cors')
const Sentry = require('@sentry/node')

const authRoutes = require('./routes/auth.routes')
const surveyRoutes = require('./routes/survey.routes')
const responseRoutes = require('./routes/response.routes')
const analyticsRoutes = require('./routes/analytics.routes')
const adminRoutes = require('./routes/admin.routes')

const app = express()

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  })
  app.use(Sentry.expressErrorHandler())
}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', authRoutes)
app.use('/api/surveys', surveyRoutes)
app.use('/api/responses', responseRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/admin', adminRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Error interno del servidor' })
})

module.exports = app
