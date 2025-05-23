const express = require('express');
const router = express.Router();
const {
    createBorrowRequest,
    getMyBorrowHistory,
    getAllBorrowRequests,
    getBorrowRequestDetailsById,
    manageBorrowRequest,
    confirmBorrowedByAdmin,
    confirmReturnByAdmin 
} = require('../controllers/borrowRequestController');
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');
 
router.post('/', protect, createBorrowRequest);
router.get('/my-history', protect, getMyBorrowHistory);

 
router.get('/admin/all', protect, authorizeAdmin, getAllBorrowRequests);
router.get('/admin/:requestId', protect, authorizeAdmin, getBorrowRequestDetailsById);
router.put('/admin/manage/:requestId', protect, authorizeAdmin, manageBorrowRequest);
router.put('/admin/confirm-borrow/:requestId', protect, authorizeAdmin, confirmBorrowedByAdmin);
router.put('/admin/confirm-return/:requestId', protect, authorizeAdmin, confirmReturnByAdmin); // THÊM ROUTE MỚI

module.exports = router;