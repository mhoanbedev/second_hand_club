const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    if (process.env.NODE_ENV !== 'production') {
        console.error('--- ERROR MIDDLEWARE ---');
        console.error('Status Code:', statusCode);
        console.error('Message:', message);
        if (err.stack) {
            console.error('Stack:', err.stack);
        }
        if (err.name) {
            console.error('Error Name:', err.name);
        }
        if (err.code) {
            console.error('Error Code:', err.code);
        }
        if (err.keyValue) {
            console.error('Error KeyValue:', err.keyValue);
        }
        console.error('------------------------');
    }


 
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404; 
        message = `Không tìm thấy tài nguyên. ID không hợp lệ: ${err.value}`;
    } else if (err.name === 'ValidationError') {
        statusCode = 400; 
       
        const messages = Object.values(err.errors).map(val => val.message);
        message = `Lỗi dữ liệu: ${messages.join('. ')}`;
    } else if (err.code === 11000) { 
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message = `Giá trị cho trường '${field}' (${err.keyValue[field]}) đã tồn tại. Vui lòng sử dụng giá trị khác.`;
    }
    

    res.status(statusCode).json({
        msg: message, 
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
};


const notFound = (req, res, next) => {
    const error = new Error(`Không tìm thấy - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };