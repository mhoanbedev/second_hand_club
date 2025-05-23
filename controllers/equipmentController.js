const Equipment = require('../models/Equipment');
const BorrowRequest = require('../models/BorrowRequest');

 
const createEquipment = async (req, res) => {
    const { name, description, totalQuantity, status } = req.body;

    try {
        const equipmentExists = await Equipment.findOne({ name });
        if (equipmentExists) {
            return res.status(400).json({ msg: 'Thiết bị với tên này đã tồn tại' });
        }

        const equipment = new Equipment({
            name,
            description,
            totalQuantity,
            
            status: status || 'available'
        });

        const createdEquipment = await equipment.save();
        res.status(201).json(createdEquipment);
    } catch (error) {
        console.error(error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        res.status(500).json({ msg: 'Lỗi Server' });
    }
};

const getAllEquipment = async (req, res) => {
    try {
        const equipmentList = await Equipment.find({});
        res.json(equipmentList);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Lỗi Server' });
    }
};

const getEquipmentById = async (req, res) => {
    try {
        const equipment = await Equipment.findById(req.params.id);
        if (!equipment) {
            return res.status(404).json({ msg: 'Thiết bị không tìm thấy' });
        }
        res.json(equipment);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') { 
            return res.status(404).json({ msg: 'Thiết bị không tìm thấy (ID không hợp lệ)' });
        }
        res.status(500).json({ msg: 'Lỗi Server' });
    }
};

const updateEquipment = async (req, res) => {
    const { name, description, totalQuantity, availableQuantity, status } = req.body;

    try {
        const equipment = await Equipment.findById(req.params.id);
        if (!equipment) {
            return res.status(404).json({ msg: 'Thiết bị không tìm thấy' });
        }

        
        if (name && name !== equipment.name) {
            const equipmentExists = await Equipment.findOne({ name });
            if (equipmentExists) {
                return res.status(400).json({ msg: 'Tên thiết bị này đã được sử dụng bởi một thiết bị khác' });
            }
        }

        equipment.name = name || equipment.name;
        equipment.description = description !== undefined ? description : equipment.description;  
        if (totalQuantity !== undefined) equipment.totalQuantity = totalQuantity;
        if (availableQuantity !== undefined) equipment.availableQuantity = availableQuantity;
        equipment.status = status || equipment.status;

        const updatedEquipment = await equipment.save();
        res.json(updatedEquipment);
    } catch (error) {
        console.error(error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Thiết bị không tìm thấy (ID không hợp lệ)' });
        }
        res.status(500).json({ msg: 'Lỗi Server' });
    }
};
const deleteEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.findById(req.params.id);
        if (!equipment) {
            return res.status(404).json({ msg: 'Thiết bị không tìm thấy' });
        }

       

        await equipment.remove(); 
        res.json({ msg: 'Thiết bị đã được xóa' });
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Thiết bị không tìm thấy (ID không hợp lệ)' });
        }
        res.status(500).json({ msg: 'Lỗi Server' });
    }
};

const getMostBorrowedEquipment = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || currentYear;
        const month = parseInt(req.query.month) || currentMonth;

        if (month < 1 || month > 12) {
            return res.status(400).json({ msg: 'Tháng không hợp lệ. Vui lòng nhập giá trị từ 1 đến 12.' });
        }

        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

        console.log('--- Aggregation Pipeline Start (Filtering by borrowDate) ---');
        console.log('Date Range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

        let pipeline = [
            {
                $match: {
                    status: { $in: ['approved', 'borrowed', 'returned', 'overdue'] },
                    borrowDate: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }
            }
        ];
        let intermediateResult = await BorrowRequest.aggregate(pipeline);
        console.log('1. After $match (by borrowDate):', JSON.stringify(intermediateResult, null, 2));
        if (intermediateResult.length === 0) {
            console.log("No documents matched the initial criteria (by borrowDate).");
            return res.json([]);
        }

        
        const equipmentIdsFromMatch = intermediateResult.map(item => item.equipment.toString());
        console.log("Equipment IDs found after $match:", [...new Set(equipmentIdsFromMatch)]);


        pipeline.push({
            $group: {
                _id: '$equipment', 
                totalTimesBorrowed: { $sum: 1 },
                totalQuantityItemsBorrowed: { $sum: '$quantityBorrowed' }
            }
        });
        intermediateResult = await BorrowRequest.aggregate(pipeline);
        console.log('2. After $group:', JSON.stringify(intermediateResult, null, 2));
        if (intermediateResult.length === 0) {
            console.log("Result became empty after $group.");
            return res.json([]);
        }

        
        const groupedEquipmentIds = intermediateResult.map(item => item._id.toString());
        console.log("Equipment IDs after $group (these are the localField for $lookup):", groupedEquipmentIds);

        pipeline.push({
            $lookup: {
                from: 'equipment',  
                localField: '_id',   
                foreignField: '_id',  
                as: 'equipmentDetails'
            }
        });
        intermediateResult = await BorrowRequest.aggregate(pipeline);
        console.log('3. After $lookup:', JSON.stringify(intermediateResult, null, 2));
         
        intermediateResult.forEach(item => {
            if (!item.equipmentDetails || item.equipmentDetails.length === 0) {
                console.log(`  WARNING: $lookup found no equipmentDetails for grouped _id: ${item._id}`);
            }
        });


        pipeline.push({
            $unwind: {
                path: '$equipmentDetails',
                preserveNullAndEmptyArrays: false 
            }
        });
        intermediateResult = await BorrowRequest.aggregate(pipeline);
        console.log('4. After $unwind:', JSON.stringify(intermediateResult, null, 2));
        if (intermediateResult.length === 0 ) {
             console.log("Warning: Result became empty after $unwind. This likely means $lookup did not find matching 'equipments' for the grouped IDs, or 'equipments' collection name is incorrect, or IDs don't match.");
             return res.json([]); 
        }

        pipeline.push({
            $project: {
                _id: 0,
                equipmentId: '$_id',
                equipmentName: '$equipmentDetails.name',
                description: '$equipmentDetails.description',
                totalTimesBorrowed: 1,
                totalQuantityItemsBorrowed: 1
            }
        });
        intermediateResult = await BorrowRequest.aggregate(pipeline);
        console.log('5. After $project:', JSON.stringify(intermediateResult, null, 2));

        pipeline.push({ $sort: { totalQuantityItemsBorrowed: -1, totalTimesBorrowed: -1 } });
        intermediateResult = await BorrowRequest.aggregate(pipeline);
        console.log('6. After $sort:', JSON.stringify(intermediateResult, null, 2));

        pipeline.push({ $limit: 10 });
        const finalStats = await BorrowRequest.aggregate(pipeline);
        console.log('7. Final Stats (After $limit):', JSON.stringify(finalStats, null, 2));
        console.log('--- Aggregation Pipeline End ---');

        res.json(finalStats);

    } catch (error) {
        console.error("Error in getMostBorrowedEquipment:", error.message, error.stack);
        res.status(500).json({ msg: 'Lỗi Server khi lấy thống kê' });
    }
};

module.exports = {
    createEquipment,
    getAllEquipment,
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
    getMostBorrowedEquipment
};