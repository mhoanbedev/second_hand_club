const express = require('express');
const router = express.Router();
const {
    createEquipment,
    getAllEquipment,
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
    getMostBorrowedEquipment
} = require('../controllers/equipmentController');
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');

 
router.route('/')
    .post(protect, authorizeAdmin, createEquipment)  
    .get(getAllEquipment);                           

router.route('/:id')
    .get(getEquipmentById)                           
    .put(protect, authorizeAdmin, updateEquipment)    
    .delete(protect, authorizeAdmin, deleteEquipment);  

router.get('/stats/most-borrowed', protect, authorizeAdmin, getMostBorrowedEquipment);  
module.exports = router;