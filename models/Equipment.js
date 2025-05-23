 
const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên thiết bị'],
        trim: true,
        unique: true  
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    totalQuantity: { 
        type: Number,
        required: [true, 'Vui lòng nhập tổng số lượng'],
        min: [0, 'Số lượng không thể âm']
    },
    availableQuantity: {  
        type: Number,
        
        min: [0, 'Số lượng có sẵn không thể âm'],
        validate: {
            validator: function(value) {
                 
                return value <= this.totalQuantity;
            },
            message: 'Số lượng có sẵn không thể lớn hơn tổng số lượng.'
        }
    },
    status: {
        type: String,
        enum: ['available', 'maintenance', 'broken', 'unavailable'],
        default: 'available'
    },
}, { // Object thứ hai: options của schema
    timestamps: true // ĐÚNG: timestamps là một key trong object options này
});


equipmentSchema.pre('save', function(next) {
    if (this.isNew) {
        this.availableQuantity = (typeof this.availableQuantity !== 'undefined' && this.availableQuantity <= this.totalQuantity)
                                ? this.availableQuantity
                                : this.totalQuantity;
    }
    if (this.availableQuantity > this.totalQuantity) {
        this.availableQuantity = this.totalQuantity;  
    }
    next();
});


const Equipment = mongoose.model('Equipment', equipmentSchema);  

module.exports = Equipment;