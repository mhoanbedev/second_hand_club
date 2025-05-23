const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const borrowRequestRoutes = require('./routes/borrowRequestRoutes');
const setupScheduledJobs = require('./utils/cronJobs'); 
setupScheduledJobs();
dotenv.config();
connectDB();

const app = express();


app.use(express.json());
 
app.get('/', (req, res) => {
    res.send('API is running...');
});

 
app.use('/api/users', userRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/borrow', borrowRequestRoutes);


const { errorHandler, notFound } = require('./middleware/errorMiddleware');
app.use(notFound);     
app.use(errorHandler);  


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});