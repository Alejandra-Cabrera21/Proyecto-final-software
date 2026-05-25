const router = require('express').Router()
const { getSummary } = require('../controllers/analytics.controller')
const { auth } = require('../middleware/auth.middleware')
router.get('/:id', auth, getSummary)
module.exports = router
