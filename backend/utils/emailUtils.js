/**
 * Email template and utility functions
 */

const generateInvitationEmailHtml = (inviterName, inviteLink) => `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הזמנה ל-Vee</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; direction: rtl;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">✨</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">הוזמנת להצטרף ל-Vee!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; text-align: center;">
            <p style="font-size: 18px; color: #374151; line-height: 1.6; margin-bottom: 30px;">
                היי! <strong>${inviterName}</strong> שלח/ה לך הזמנה אישית להצטרף אליו למערכת ניהול המשימות והפרויקטים החברתית - Vee.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                 <p style="margin: 0; color: #64748b; font-size: 15px;">ההזמנה הזו תקפה ל-7 ימים בלבד.</p>
            </div>

            <a href="${inviteLink}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: transform 0.2s;">
                קבל/י את ההזמנה עכשיו
            </a>
            
            <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">
                אם הכפתור לא עובד, עותק/י את הקישור הבא לדפדפן שלך:<br>
                <a href="${inviteLink}" style="color: #6366f1; word-break: break-all;">${inviteLink}</a>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                נשלח ממערכת Vee.
            </p>
        </div>
    </div>
</body>
</html>
`;

module.exports = {
    generateInvitationEmailHtml
};
