const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    cv: { type: String },          
    cnicFront: { type: String },   
    cnicBack: { type: String },     
}, { timestamps: true })

module.exports = mongoose.model('Document', documentSchema)