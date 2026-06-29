const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const connectdb = require('./config/connectdb')
const userRoutes = require('../TN_HRMS/routes/userRoutes')
const candidateRoutes = require('./routes/candidateRoutes')
const documentRoutes = require('./routes/documentRoutes')
const interviewRoutes = require('./routes/interviewRoutes')





app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/user', userRoutes)
app.use('/api/candidate', candidateRoutes)
app.use('/uploads', express.static('uploads'))
app.use('/api/document', documentRoutes)
app.use('/api/interview', interviewRoutes)


//connectdb(process.env.DATABASE_URL)


app.get('/', (req,res)=>{
    res.send("server is running")
    console.log("server is running")
})

const port = process.env.PORT
app.listen(port,()=>{
    console.log(`app is running on ${port}`)
})