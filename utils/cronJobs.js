const schedule = require('node-schedule');
const BorrowRequest = require('../models/BorrowRequest');
const User = require('../models/User'); 
const sendEmail = require('./emailSender');


const setupScheduledJobs = () => {
    console.log('Cron jobs setup initiated (using node-schedule)...');

    const rule = new schedule.RecurrenceRule();
    
    rule.minute = new schedule.Range(0, 59, 5); 
    rule.second = 0;
    rule.tz = 'Asia/Ho_Chi_Minh'; 

    const job = schedule.scheduleJob(rule, async function(fireDate) {
        const jobStartTime = new Date();
        console.log(`[${jobStartTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}] Running scheduled job at ${fireDate ? fireDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'N/A'}: Checking for due/overdue borrows...`);

        const today = new Date(); 
        today.setHours(0, 0, 0, 0);

        try {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(today.getDate() + 2);

            console.log(`[CRON DEBUG] Today: ${today.toISOString()}, Tomorrow: ${tomorrow.toISOString()}`);

            // --- SẮP ĐẾN HẠN ---
            const dueSoonRequests = await BorrowRequest.find({
                status: 'borrowed',
                expectedReturnDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
                dueSoonNotified: false 
            }).populate('user', 'username email phoneNumber avatarUrl')
              .populate('equipment', 'name imageUrl');

            if (dueSoonRequests.length > 0) {
                console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Found ${dueSoonRequests.length} item(s) due soon to notify.`);
                for (const request of dueSoonRequests) {
                    if (request.user && request.user.email && request.equipment) {
                        console.log(`  - Sending due soon reminder to ${request.user.email} for equipment "${request.equipment.name}" (Request ID: ${request._id})`);
                        await sendEmail({
                            to: request.user.email,
                            subject: `[Nhắc nhở] Thiết bị "${request.equipment.name}" sắp đến hạn trả`,
                            html: `<p>Chào ${request.user.username},</p>
                                   <p>Thiết bị <strong>${request.equipment.name}</strong> (số lượng: ${request.quantityBorrowed}) bạn mượn sẽ đến hạn trả vào ngày <strong>${new Date(request.expectedReturnDate).toLocaleDateString('vi-VN')}</strong>.</p>
                                   ${request.equipment.imageUrl ? `<p><img src="${request.equipment.imageUrl}" alt="${request.equipment.name}" style="max-width: 150px; height: auto;" /></p>` : ''}
                                   <p>Vui lòng sắp xếp thời gian để trả thiết bị đúng hạn tại phòng quản lý.</p>
                                   <p>Trân trọng,<br>${process.env.EMAIL_FROM_NAME || 'Ban Quản Lý CLB'}</p>`,
                            text: `Thiết bị "${request.equipment.name}" (số lượng: ${request.quantityBorrowed}) bạn mượn sắp đến hạn trả vào ngày ${new Date(request.expectedReturnDate).toLocaleDateString('vi-VN')}. Vui lòng trả đúng hạn.`
                        }).catch(err => console.error(`[ERROR] Failed to send due soon email for request ${request._id}:`, err.message));
                        
                        // ĐÁNH DẤU ĐÃ THÔNG BÁO
                        request.dueSoonNotified = true;
                        await request.save();
                        console.log(`  - Marked request ${request._id} as dueSoonNotified = true.`);
                    }
                }
            } else {
                console.log(`[${new Date().toLocaleTimeString('vi-VN')}] No new items due soon to notify.`);
            }

            // --- QUÁ HẠN ---
            const overdueItemsToUpdate = await BorrowRequest.find({
                status: 'borrowed', 
                expectedReturnDate: { $lt: today }
            }).populate('user', 'username email phoneNumber avatarUrl')
              .populate('equipment', 'name imageUrl');

            if (overdueItemsToUpdate.length > 0) {
                console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Found ${overdueItemsToUpdate.length} item(s) to process for overdue status.`);
                for (const request of overdueItemsToUpdate) {
                    const wasBorrowed = request.status === 'borrowed';
                    request.status = 'overdue'; 
            
                    if (wasBorrowed && !request.overdueNotified) {
                        if (request.user && request.user.email && request.equipment) {
                            console.log(`  - Sending FIRST overdue alert to ${request.user.email} for equipment "${request.equipment.name}" (Request ID: ${request._id})`);
                            await sendEmail({
                                to: request.user.email,
                                subject: `[CẢNH BÁO] Thiết bị "${request.equipment.name}" đã QUÁ HẠN TRẢ`,
                                html: `<p>Chào ${request.user.username},</p>
                                       <p>Thiết bị <strong>${request.equipment.name}</strong> (số lượng: ${request.quantityBorrowed}) bạn mượn đã <strong>QUÁ HẠN TRẢ</strong>. Ngày trả dự kiến của bạn là ${new Date(request.expectedReturnDate).toLocaleDateString('vi-VN')}.</p>
                                       ${request.equipment.imageUrl ? `<p><img src="${request.equipment.imageUrl}" alt="${request.equipment.name}" style="max-width: 150px; height: auto;" /></p>` : ''}
                                       <p>Vui lòng mang thiết bị đến trả tại phòng quản lý ngay lập tức để tránh các biện pháp xử lý tiếp theo.</p>
                                       <p>Trân trọng,<br>${process.env.EMAIL_FROM_NAME || 'Ban Quản Lý CLB'}</p>`,
                                text: `Thiết bị "${request.equipment.name}" (số lượng: ${request.quantityBorrowed}) bạn mượn đã QUÁ HẠN TRẢ. Ngày trả dự kiến: ${new Date(request.expectedReturnDate).toLocaleDateString('vi-VN')}. Vui lòng trả lại ngay.`
                            }).catch(err => console.error(`[ERROR] Failed to send overdue alert email for request ${request._id}:`, err.message));
                            
                            request.overdueNotified = true; // ĐÁNH DẤU ĐÃ THÔNG BÁO QUÁ HẠN LẦN ĐẦU
                        }
                    }
                    await request.save();
                    console.log(`  - Request ID ${request._id} updated. Status: ${request.status}, Overdue Notified: ${request.overdueNotified}`);
                }
            } else {
                console.log(`[${new Date().toLocaleTimeString('vi-VN')}] No items became overdue or needed first overdue notification.`);
            }
             
            const jobEndTime = new Date();
            console.log(`[${jobEndTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}] Scheduled job finished. Duration: ${(jobEndTime - jobStartTime) / 1000}s`);
        } catch (error) {
            console.error(`[${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}] [CRITICAL ERROR] Error running scheduled job:`, error);
        }
    });
    console.log(`Cron job scheduled. Rule: Every 5 minutes (at second 0), Timezone: Asia/Ho_Chi_Minh. Next invocations:`);
    // job.nextInvocations(5).forEach(function(d) { 
    //     console.log(' - ', d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
    // });
};

module.exports = setupScheduledJobs;