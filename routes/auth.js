const express = require('express')
const router = express.Router()
const {telegramAuth} = require('../controllers/auth')



router.post('/auth', telegramAuth)




module.exports = router