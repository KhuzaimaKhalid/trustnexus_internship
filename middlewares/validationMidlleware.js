const validateEmailMiddleware = (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next();
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
        return res.status(400).json({ "status": "failed", "message": "Invalid email format" });
    }

    next();
};

module.exports = { validateEmailMiddleware };