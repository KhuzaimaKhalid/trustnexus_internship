const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const pool = require('./config/connectdb')
const userRoutes = require('./routes/userRoutes')
const candidateRoutes = require('./routes/candidateRoutes')
const documentRoutes = require('./routes/documentRoutes')
const interviewRoutes = require('./routes/interviewRoutes')





app.use(cors({
    origin: 'https://tn-hrns.vercel.app',
    credentials: true
}));
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


if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT || 5000;

    app.listen(port, () => {
        console.log(`Server is running on ${port}`);
    });
}

module.exports = app;