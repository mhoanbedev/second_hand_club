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
 
router.post('/register', async (req, res, next) => { 

    const { username, email, password, role, phoneNumber, avatarUrl } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Email đã được sử dụng' });
        }
        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Tên đăng nhập đã được sử dụng' });
        }
        
        user = new User({
            username,
            email,
            password,
            role,
            phoneNumber: phoneNumber || '',
            avatarUrl: avatarUrl || ''  
        });
        await user.save();

        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber, 
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        
        res.status(201).json({ 
            msg: 'Người dùng đã được đăng ký thành công', 
            user: userResponse,
            token: generateToken(user._id) 
        });

    } catch (err) {
        next(err);
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


router.get('/me', protect, async (req, res, next) => {
    try {
        
        res.json(req.user); 
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Lỗi Server');
    }
});
router.put('/profile', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.username = req.body.username || user.username;
            user.phoneNumber = req.body.phoneNumber !== undefined ? req.body.phoneNumber : user.phoneNumber;
            user.avatarUrl = req.body.avatarUrl !== undefined ? req.body.avatarUrl : user.avatarUrl;

           
            if (req.body.password) {
                if (req.body.password.length < 6) {
                    return res.status(400).json({ msg: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
                }
                user.password = req.body.password; 
            }

            const updatedUser = await user.save();

   
            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                phoneNumber: updatedUser.phoneNumber,
                avatarUrl: updatedUser.avatarUrl,
                updatedAt: updatedUser.updatedAt
            });
        } else {
            res.status(404);  
            throw new Error('Người dùng không tìm thấy');
        }
    } catch (error) {
        next(error);  
    }
});


module.exports = router;