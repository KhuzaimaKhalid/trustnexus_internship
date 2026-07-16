module.exports = (req, res, next) => {
    if (req.user.role !== 'CFO') {
        return res.status(403).json({ success: false, message: 'Access denied. CFO only.' })
    }
    next()
}