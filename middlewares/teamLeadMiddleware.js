module.exports = (req, res, next) => {
    if (req.user.role !== 'Team Lead') {
        return res.status(403).json({ success: false, message: 'Access denied. Team Lead only.' })
    }
    next()
}