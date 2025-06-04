const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
    user: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  
        required: true
    },
    equipment: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Equipment',  
        required: true
    },
    quantityBorrowed: {
        type: Number,
        required: [true, 'Vui lòng nhập số lượng mượn'],
        min: [1, 'Số lượng mượn phải ít nhất là 1']
    },
    borrowDate: {
        type: Date,
        required: [true, 'Vui lòng nhập ngày mượn']
    },
    expectedReturnDate: {
        type: Date,
        required: [true, 'Vui lòng nhập ngày trả dự kiến']
    },
    actualReturnDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'borrowed', 'returned', 'overdue', 'cancelled'],
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    adminNotes: {
        type: String,
        trim: true,
        default: ''
    },
    dueSoonNotified: {
        type: Boolean,
        default: false  
    },
    overdueNotified: {
        type: Boolean,
        default: false  
    }
}, {
    timestamps: true
});

borrowRequestSchema.pre('save', function(next) {
    if (this.expectedReturnDate && this.borrowDate && this.expectedReturnDate <= this.borrowDate) {
        const err = new Error('Ngày trả dự kiến phải sau ngày mượn.');
        return next(err);
    }
    next();
});

const BorrowRequest = mongoose.model('BorrowRequest', borrowRequestSchema);
module.exports = BorrowRequest;