const router = require('express').Router()
const { getUsers, toggleUser, getAllSurveys, getAuditLog } = require('../controllers/admin.controller')
const { auth, adminOnly } = require('../middleware/auth.middleware')
router.use(auth, adminOnly)
router.get('/users', getUsers)
router.patch('/users/:id/toggle', toggleUser)
router.get('/surveys', getAllSurveys)
router.get('/audit', getAuditLog)
module.exports = router
