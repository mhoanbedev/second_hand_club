const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware'); 

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'  
    });
};
 
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Email đã được sử dụng' });
        }
        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Tên đăng nhập đã được sử dụng' });
        }
        user = new User({ username, email, password, role });
        await user.save();
        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        
        res.status(201).json({ msg: 'Người dùng đã được đăng ký thành công', user: userResponse });


    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        res.status(500).send('Lỗi Server');
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        
        if (!email || !password) {
            return res.status(400).json({ msg: 'Vui lòng cung cấp email và mật khẩu' });
        }

       
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ msg: 'Email hoặc mật khẩu không đúng' });
        }

       
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ msg: 'Email hoặc mật khẩu không đúng' });
        }

        
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});


router.get('/me', protect, async (req, res) => {
    try {
        
        res.json(req.user); 
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Lỗi Server');
    }
});


module.exports = router;