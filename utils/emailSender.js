const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: parseInt(process.env.EMAIL_PORT, 10) === 465, 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        
    });

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: options.to,  
        subject: options.subject, 
        text: options.text,  
        html: options.html, 
    };
 
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email: ', error);
        return { success: false, error: error.message };
    }
};

module.exports = sendEmail;