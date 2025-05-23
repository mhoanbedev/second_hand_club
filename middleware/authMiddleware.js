const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                 return res.status(401).json({ msg: 'Không được phép, người dùng không tồn tại (token hợp lệ nhưng user không tìm thấy)' });
            }

            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ msg: 'Không được phép, token không hợp lệ' });
        }
    }

    if (!token) {
        return res.status(401).json({ msg: 'Không được phép, không tìm thấy token' });
    }
};

const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ msg: 'Không được phép, yêu cầu quyền Admin' });
    }
};

module.exports = { protect, authorizeAdmin };