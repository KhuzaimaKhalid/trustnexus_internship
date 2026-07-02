const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const pool = require('./config/connectdb')
const userRoutes = require('./routes/userRoutes')
const candidateRoutes = require('./routes/candidateRoutes')
const documentRoutes = require('./routes/documentRoutes')
const interviewRoutes = require('./routes/interviewRoutes')
const projectRoutes = require('./routes/projectRoutes');





// app.use(cors({
//     origin: 'https://tn-hrns.vercel.app',
//     credentials: true
// }));

app.use((req, res, next) => {
    const allowedOrigins = ['https://tn-hrns.vercel.app', 'http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Handle the browser preflight OPTIONS check immediately
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', userRoutes)
app.use('/api/candidate', candidateRoutes)
app.use('/uploads', express.static('uploads'))
app.use('/api/document', documentRoutes)
app.use('/api/interview', interviewRoutes)
app.use('/api/projects', projectRoutes);

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