const BorrowRequest = require('../models/BorrowRequest');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const sendEmail = require('../utils/emailSender'); 

const MAX_QUANTITY_PER_ITEM_TYPE_PER_USER = 1; // Ví dụ: 1 người mượn tối đa 2 cái của CÙNG 1 LOẠI thiết bị
const MAX_TOTAL_ITEMS_PER_USER_CONCURRENTLY = 2; // Ví dụ: 1 người mượn tối đa TỔNG CỘNG 5 MÓN thiết bị (bất kể loại) cùng lúc

const createBorrowRequest = async (req, res, next) => {  
    console.log('--- DEBUG: createBorrowRequest ---');
    console.log('req.body received by server:', JSON.stringify(req.body, null, 2));
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers Authorization:', req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'No Auth Header');
    console.log('req.user (from protect middleware):', JSON.stringify(req.user, null, 2));

    if (!req.user || !req.user.id) {
        console.error("CRITICAL: req.user or req.user.id is undefined in createBorrowRequest!");
        const err = new Error('Lỗi server: Không thể xác định người dùng.');
        err.statusCode = 500;
        return next(err);
    }
    const userId = req.user.id;

    const { equipmentId, quantityBorrowed, borrowDate, expectedReturnDate, notes } = req.body;

    try {
        if (!equipmentId || !quantityBorrowed || !borrowDate || !expectedReturnDate) {
            console.error('Validation Error (Controller Level): Missing required fields.');
            console.error({ equipmentId, quantityBorrowed, borrowDate, expectedReturnDate });
            return res.status(400).json({ msg: 'Vui lòng cung cấp đủ thông tin: ID thiết bị, số lượng, ngày mượn, ngày trả dự kiến.' });
        }

        const numQuantityBorrowed = Number(quantityBorrowed);
        if (isNaN(numQuantityBorrowed) || numQuantityBorrowed <= 0) {
            return res.status(400).json({ msg: 'Số lượng mượn phải là một số dương.' });
        }

        const parsedBorrowDate = new Date(borrowDate);
        const parsedExpectedReturnDate = new Date(expectedReturnDate);
        const today = new Date();
        today.setHours(0,0,0,0); 

        if (isNaN(parsedBorrowDate.getTime()) || isNaN(parsedExpectedReturnDate.getTime())) {
            console.error('Validation Error (Controller Level): Invalid date format.');
            console.error({ borrowDate, expectedReturnDate });
            return res.status(400).json({ msg: 'Định dạng ngày mượn hoặc ngày trả không hợp lệ.' });
        }
        
        if (parsedBorrowDate < today) { 
             return res.status(400).json({ msg: 'Ngày mượn không thể là một ngày trong quá khứ.' });
        }

        if (parsedExpectedReturnDate <= parsedBorrowDate) {
            console.error('Validation Error (Controller Level): Return date must be after borrow date.');
            return res.status(400).json({ msg: 'Ngày trả dự kiến phải sau ngày mượn.' });
        }


        const equipment = await Equipment.findById(equipmentId);
        if (!equipment) {
            return res.status(404).json({ msg: 'Thiết bị không tìm thấy' });
        }
       
        if (equipment.status !== 'available') { 
            return res.status(400).json({ msg: `Thiết bị '${equipment.name}' hiện không có sẵn để mượn (Trạng thái: ${equipment.status}).` });
        }

        if (equipment.availableQuantity < numQuantityBorrowed) {
            return res.status(400).json({ msg: `Số lượng yêu cầu (${numQuantityBorrowed}) vượt quá số lượng có sẵn (${equipment.availableQuantity}) của thiết bị "${equipment.name}"` });
        }
        


    
        const existingBorrowsOfThisItemType = await BorrowRequest.find({
            user: userId,
            equipment: equipmentId,
            status: { $in: ['approved', 'borrowed', 'overdue'] } 
        });

        let currentQuantityBorrowedOfThisItemType = 0;
        existingBorrowsOfThisItemType.forEach(borrow => {
            currentQuantityBorrowedOfThisItemType += borrow.quantityBorrowed;
        });

        if (currentQuantityBorrowedOfThisItemType + numQuantityBorrowed > MAX_QUANTITY_PER_ITEM_TYPE_PER_USER) {
            const canBorrowMore = MAX_QUANTITY_PER_ITEM_TYPE_PER_USER - currentQuantityBorrowedOfThisItemType;
            return res.status(400).json({
                msg: `Bạn đã mượn ${currentQuantityBorrowedOfThisItemType} cái '${equipment.name}'. Bạn chỉ được phép mượn tối đa ${MAX_QUANTITY_PER_ITEM_TYPE_PER_USER} cái của loại này cùng lúc. ${canBorrowMore > 0 ? `Bạn có thể yêu cầu thêm tối đa ${canBorrowMore} cái.` : 'Bạn đã đạt giới hạn cho loại thiết bị này.'}`
            });
        }
       
        const allCurrentUserActiveBorrows = await BorrowRequest.find({
            user: userId,
            status: { $in: ['approved', 'borrowed', 'overdue'] }
        });

        let totalItemsCurrentlyActiveForUser = 0;
        allCurrentUserActiveBorrows.forEach(borrow => {
            totalItemsCurrentlyActiveForUser += borrow.quantityBorrowed;
        });

        if (totalItemsCurrentlyActiveForUser + numQuantityBorrowed > MAX_TOTAL_ITEMS_PER_USER_CONCURRENTLY) {
            const canBorrowMoreTotal = MAX_TOTAL_ITEMS_PER_USER_CONCURRENTLY - totalItemsCurrentlyActiveForUser;
            return res.status(400).json({
                msg: `Bạn đang có ${totalItemsCurrentlyActiveForUser} thiết bị đang trong quá trình mượn (đã duyệt, đang mượn, hoặc quá hạn). Bạn chỉ được phép mượn tối đa tổng cộng ${MAX_TOTAL_ITEMS_PER_USER_CONCURRENTLY} thiết bị cùng lúc. ${canBorrowMoreTotal > 0 ? `Bạn có thể yêu cầu thêm tối đa ${canBorrowMoreTotal} thiết bị.` : 'Bạn đã đạt tổng giới hạn số lượng thiết bị được mượn.'}`
            });
        }
        const newRequestData = {
            user: userId,
            equipment: equipmentId,
            quantityBorrowed: numQuantityBorrowed,
            borrowDate: parsedBorrowDate,             
            expectedReturnDate: parsedExpectedReturnDate, 
            notes: notes || '',
            status: 'pending'  
        };

        console.log("Data to be saved to BorrowRequest:", JSON.stringify(newRequestData, null, 2));

        const newRequest = new BorrowRequest(newRequestData);
        const savedRequest = await newRequest.save();
        
     
        const populatedRequest = await BorrowRequest.findById(savedRequest._id)
            .populate('user', 'username email phoneNumber')
            .populate('equipment', 'name description imageUrl');

        res.status(201).json(populatedRequest);
        

    } catch (error) {
        next(error);  
    }
};


 

const getMyBorrowHistory = async (req, res) => {
    try {
        const borrowRequests = await BorrowRequest.find({ user: req.user.id }) 
            .populate('equipment', 'name description status imageUrl')
            .populate('user', 'username email phoneNumber')
            .sort({ createdAt: -1 });
        res.json(borrowRequests); 
    } catch (error) {
        console.error("Error in getMyBorrowHistory:", error.message, error.stack);
        res.status(500).json({ msg: 'Lỗi Server khi lấy lịch sử mượn' });
    }
};

 
const getAllBorrowRequests = async (req, res) => {
    const { status } = req.query;
    let query = {};
    if (status) {
        query.status = status;
    }
    try {
         const requestsData = await BorrowRequest.find(query)
            .populate('user', 'username email role phoneNumber') 
            .populate('equipment', 'name imageUrl')
            .sort({ createdAt: -1 });
        res.json(requestsData);
    } catch (error) {
        console.error("Error in getAllBorrowRequests:", error.message, error.stack);
        res.status(500).json({ msg: 'Lỗi Server khi lấy danh sách yêu cầu' });
    }
};

const getBorrowRequestDetailsById = async (req, res) => {
    try {
        const request = await BorrowRequest.findById(req.params.requestId)
            .populate('user', 'username email role phoneNumber') 
            .populate('equipment', 'name description totalQuantity availableQuantity status imageUrl');
        if (!request) {
            return res.status(404).json({ msg: 'Yêu cầu mượn không tìm thấy' });
        }
        res.json(request);
    } catch (error) {
        console.error("Error in getBorrowRequestDetailsById:", error.message, error.stack);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'ID yêu cầu không hợp lệ' });
        }
        res.status(500).json({ msg: 'Lỗi Server khi xem chi tiết yêu cầu' });
    }
};

const manageBorrowRequest = async (req, res) => {
    const { status, adminNotes } = req.body;
    const { requestId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ msg: 'Trạng thái không hợp lệ. Chỉ chấp nhận "approved" hoặc "rejected".' });
    }
    try {
        const request = await BorrowRequest.findById(requestId)
                            .populate('equipment', 'name availableQuantity imageUrl')  
                            .populate('user', 'username email phoneNumber'); 

        if (!request) {
            return res.status(404).json({ msg: 'Yêu cầu mượn không tìm thấy' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ msg: `Chỉ có thể xử lý yêu cầu đang ở trạng thái "pending". Trạng thái hiện tại: ${request.status}` });
        }

        const equipment = request.equipment;
        const studentUser = request.user;

        if (status === 'approved') {
            if (equipment.availableQuantity < request.quantityBorrowed) {
                return res.status(400).json({ msg: `Không đủ số lượng thiết bị "${equipment.name}". Yêu cầu: ${request.quantityBorrowed}, Có sẵn: ${equipment.availableQuantity}. Vui lòng từ chối hoặc đợi bổ sung.` });
            }
            request.status = 'approved';
            request.adminNotes = adminNotes || 'Yêu cầu đã được duyệt.';

            if (studentUser && studentUser.email) {
                sendEmail({
                    to: studentUser.email,
                    subject: `[Đã duyệt] Yêu cầu mượn thiết bị "${equipment.name}"`,
                    html: `<p>Chào ${studentUser.username},</p><p>Yêu cầu mượn thiết bị <strong>${equipment.name}</strong> (số lượng: ${request.quantityBorrowed}) của bạn đã được <strong>DUYỆT</strong>.</p><p>Ngày mượn dự kiến: ${new Date(request.borrowDate).toLocaleDateString('vi-VN')}</p><p>Ngày trả dự kiến: ${new Date(request.expectedReturnDate).toLocaleDateString('vi-VN')}</p>${adminNotes ? `<p>Ghi chú của Admin: ${adminNotes}</p>` : ''}<p>Vui lòng đến phòng quản lý để nhận thiết bị theo lịch hẹn.</p><p>Trân trọng,<br>${process.env.EMAIL_FROM_NAME || 'Ban Quản Lý CLB'}</p>`,
                    text: `Yêu cầu mượn thiết bị "${equipment.name}" (số lượng: ${request.quantityBorrowed}) của bạn đã được DUYỆT. Ngày mượn: ${new Date(request.borrowDate).toLocaleDateString('vi-VN')}, Ngày trả: ${new Date(request.expectedReturnDate).toLocaleDateString('vi-VN')}. ${adminNotes ? `Ghi chú: ${adminNotes}` : ''} Vui lòng đến nhận thiết bị.`
                }).catch(err => console.error("Failed to send approval email:", err)); 
            }
        } else if (status === 'rejected') {
            request.status = 'rejected';
            request.adminNotes = adminNotes || 'Yêu cầu đã bị từ chối.';
            if (studentUser && studentUser.email) {
                sendEmail({
                    to: studentUser.email,
                    subject: `[Từ chối] Yêu cầu mượn thiết bị "${equipment.name}"`,
                    html: `<p>Chào ${studentUser.username},</p><p>Rất tiếc phải thông báo, yêu cầu mượn thiết bị <strong>${equipment.name}</strong> (số lượng: ${request.quantityBorrowed}) của bạn đã bị <strong>TỪ CHỐI</strong>.</p><p>Lý do: ${request.adminNotes}</p><p>Nếu có thắc mắc, vui lòng liên hệ Ban Quản lý.</p><p>Trân trọng,<br>${process.env.EMAIL_FROM_NAME || 'Ban Quản Lý CLB'}</p>`,
                    text: `Yêu cầu mượn thiết bị "${equipment.name}" của bạn đã bị TỪ CHỐI. Lý do: ${request.adminNotes}.`
                }).catch(err => console.error("Failed to send rejection email:", err)); 
            }
        }
        const updatedRequest = await request.save();
        res.json(updatedRequest);
    } catch (error) {
        console.error("Error in manageBorrowRequest:", error.message, error.stack);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: messages.join(', ') });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'ID yêu cầu không hợp lệ' });
        }
        res.status(500).json({ msg: 'Lỗi Server khi xử lý yêu cầu' });
    }
};
const confirmBorrowedByAdmin = async (req, res, next) => { 
    const { requestId } = req.params;
    const { adminNotes } = req.body; 

    try {
        let request = await BorrowRequest.findById(requestId)
            .populate('equipment', 'name availableQuantity status imageUrl totalQuantity') 
            .populate('user', 'username email phoneNumber'); 

        if (!request) {
            return res.status(404).json({ msg: 'Yêu cầu mượn không tìm thấy' });
        }

        if (request.status !== 'approved') {
            return res.status(400).json({ msg: `Chỉ có thể xác nhận mượn cho yêu cầu đã được 'approved'. Trạng thái hiện tại: ${request.status}` });
        }

        const equipment = request.equipment;

        if (equipment.status !== 'available') {
             return res.status(400).json({ msg: `Thiết bị '${equipment.name}' hiện không có sẵn (${equipment.status}). Không thể cho mượn.` });
        }
        if (equipment.availableQuantity < request.quantityBorrowed) {
            console.error(`CRITICAL: Not enough available quantity for equipment ${equipment.name} (ID: ${equipment._id}) when confirming borrow for request ${request._id}. Available: ${equipment.availableQuantity}, Requested: ${request.quantityBorrowed}`);
            return res.status(400).json({ msg: `Không đủ số lượng thiết bị "${equipment.name}" khi xác nhận mượn. Yêu cầu ${request.quantityBorrowed}, còn lại ${equipment.availableQuantity}. Vui lòng kiểm tra lại.` });
        }

        equipment.availableQuantity -= request.quantityBorrowed;
        await equipment.save();

        request.status = 'borrowed';
        if (adminNotes) {
            request.adminNotes = request.adminNotes ? `${request.adminNotes}. ${adminNotes}` : adminNotes;
        }
        
        await request.save(); 

 
        const populatedUpdatedRequest = await BorrowRequest.findById(request._id)
            .populate('user', 'username email phoneNumber')
            .populate('equipment', 'name description imageUrl status totalQuantity availableQuantity');

        res.json(populatedUpdatedRequest);

    } catch (error) {
        next(error);
    }
};

const confirmReturnByAdmin = async (req, res, next) => {
    const { requestId } = req.params;
   
    const { adminNotes, newEquipmentStatus } = req.body;

    try {
        let request = await BorrowRequest.findById(requestId)
            .populate('equipment')
            .populate('user', 'username email phoneNumber');

        if (!request) {
            return res.status(404).json({ msg: 'Yêu cầu mượn không tìm thấy' });
        }

        if (request.status !== 'borrowed' && request.status !== 'overdue') {
            return res.status(400).json({ msg: `Thiết bị chưa được mượn, đã được trả, hoặc yêu cầu đã bị hủy/từ chối. Trạng thái hiện tại: ${request.status}` });
        }

        const equipment = request.equipment;

        equipment.availableQuantity += request.quantityBorrowed;

        if (equipment.availableQuantity > equipment.totalQuantity) {
            equipment.availableQuantity = equipment.totalQuantity;
            console.warn(`Warning: Available quantity for ${equipment.name} exceeded total quantity after return. Reset to total.`);
        }

     
        if (newEquipmentStatus && ['available', 'maintenance', 'broken', 'unavailable'].includes(newEquipmentStatus)) {
            equipment.status = newEquipmentStatus;
            console.log(`Equipment ${equipment.name} status updated to: ${newEquipmentStatus} upon return.`);
        } else if (newEquipmentStatus) {
            console.warn(`Invalid newEquipmentStatus '${newEquipmentStatus}' provided. Equipment status not changed.`);
           
        }
         
        await equipment.save();

        request.status = 'returned';
        request.actualReturnDate = new Date();
        if (adminNotes) {
            request.adminNotes = request.adminNotes ? `${request.adminNotes}. ${adminNotes}` : adminNotes;
        }
        
        await request.save();

        const populatedUpdatedRequest = await BorrowRequest.findById(request._id)
            .populate('user', 'username email phoneNumber')
            .populate('equipment', 'name description imageUrl status totalQuantity availableQuantity');


       
        const studentUser = populatedUpdatedRequest.user;
        if (studentUser && studentUser.email) {
            sendEmail({
                to: studentUser.email,
                subject: `Xác nhận đã trả thiết bị "${populatedUpdatedRequest.equipment.name}"`,
                html: `<p>Chào ${studentUser.username},</p>
                       <p>Chúng tôi xác nhận bạn đã trả lại thiết bị <strong>${populatedUpdatedRequest.equipment.name}</strong> (số lượng: ${populatedUpdatedRequest.quantityBorrowed}) vào ngày ${new Date(populatedUpdatedRequest.actualReturnDate).toLocaleDateString('vi-VN')}.</p>
                       ${populatedUpdatedRequest.equipment.imageUrl ? `<p><img src="${populatedUpdatedRequest.equipment.imageUrl}" alt="${populatedUpdatedRequest.equipment.name}" style="max-width:100px;"/></p>` : ''}
                       <p>Cảm ơn bạn đã sử dụng dịch vụ của CLB!</p>
                       <p>Trân trọng,<br>${process.env.EMAIL_FROM_NAME || 'Ban Quản Lý CLB'}</p>`,
                text: `Xác nhận bạn đã trả thiết bị "${populatedUpdatedRequest.equipment.name}" (số lượng: ${populatedUpdatedRequest.quantityBorrowed}) vào ngày ${new Date(populatedUpdatedRequest.actualReturnDate).toLocaleDateString('vi-VN')}. Cảm ơn bạn!`
            }).catch(err => console.error("Failed to send return confirmation email:", err));
        }

        res.json(populatedUpdatedRequest);

    } catch (error) {
        
        next(error);
    }
};

module.exports = {
    createBorrowRequest,
    getMyBorrowHistory,
    getAllBorrowRequests,
    getBorrowRequestDetailsById,
    manageBorrowRequest,
    confirmBorrowedByAdmin,
    confirmReturnByAdmin
};