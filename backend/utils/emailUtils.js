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

const generateResetPasswordEmailHtml = (resetLink) => `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;800&display=swap" rel="stylesheet">
    <title>איפוס סיסמה - Vee</title>
</head>
<body style="font-family: 'Assistant', sans-serif; background-color: #f8fafc; margin: 0; padding: 0; direction: rtl;">
    <div style="max-width: 500px; margin: 60px auto; background-color: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #f1f5f9;">
        <!-- Header with Sleek Gradient -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 60px 40px; text-align: center; position: relative;">
            <div style="background-color: rgba(255,255,255,0.15); width: 100px; height: 100px; border-radius: 35% 65% 65% 35% / 30% 30% 70% 70%; display: inline-flex; justify-content: center; align-items: center; margin-bottom: 25px; backdrop-filter: blur(10px);">
                <span style="font-size: 45px;">🔑</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 1.2;">זמן לרענן<br>את הסיסמה שלך</h1>
        </div>
        
        <!-- Premium Body Content -->
        <div style="padding: 50px 40px; text-align: center;">
            <p id="main-content" style="font-size: 19px; color: #1e293b; line-height: 1.6; margin-bottom: 35px; font-weight: 400;">
                קיבלנו בקשה לאיפוס הסיסמה עבור חשבון ה-<strong>Vee</strong> שלך. לחץ על הכפתור למטה כדי להמשיך בתהליך.
            </p>
            
            <div style="background-color: #f1f5f9; border-radius: 16px; padding: 15px 25px; margin-bottom: 40px; display: inline-block;">
                 <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 600;">⚠️ תקף ל-15 דקות בלבד</p>
            </div>

            <div style="margin-bottom: 45px;">
                <a href="${resetLink}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 20px 50px; border-radius: 20px; font-weight: 800; font-size: 18px; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3); transition: all 0.3s ease;">
                    איפוס סיסמה עכשיו
                </a>
            </div>
            
            <div style="padding-top: 30px; border-top: 1px solid #f1f5f9;">
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 10px;">
                    לא ביקשת את האיפוס? ניתן להתעלם בבטחה מהודעה זו.
                </p>
                <p style="font-size: 12px; color: #cbd5e1; word-break: break-all;">
                    ${resetLink}
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #fafafa; padding: 30px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #475569; font-weight: 600;">
                צוות Vee ✨
            </p>
        </div>
    </div>
</body>
</html>
`;

const parseTemplate = (template, variables) => {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    return result;
};

module.exports = {
    generateInvitationEmailHtml,
    generateResetPasswordEmailHtml,
    parseTemplate
};
