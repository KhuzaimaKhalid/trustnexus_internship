require('dotenv').config()


const nodemailer = require('nodemailer')

let transporter = nodemailer.createTransport({
    secure: false,
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})


module.exports = transporter