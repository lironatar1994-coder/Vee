const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      profile_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      FOREIGN KEY (template_id) REFERENCES templates (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      parent_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      title TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER NOT NULL,
      parent_item_id INTEGER,
      content TEXT NOT NULL,
      description TEXT,
      repeat_rule TEXT,
      time TEXT,
      duration INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      target_date TEXT,
      reminder_minutes INTEGER,
      priority INTEGER DEFAULT 4,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklist_id) REFERENCES checklists (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_item_id) REFERENCES checklist_items (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checklist_item_id INTEGER NOT NULL,
      date TEXT NOT NULL, -- Format: YYYY-MM-DD
      completed BOOLEAN DEFAULT 0,
      UNIQUE(user_id, checklist_item_id, date),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (checklist_item_id) REFERENCES checklist_items (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'accepted'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(requester_id, receiver_id),
      FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', -- 'owner' or 'member'
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checklist_item_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_item_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklist_item_id) REFERENCES checklist_items (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      admin_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      identifier_attempted TEXT NOT NULL,
      status TEXT NOT NULL, -- 'success' or 'failed'
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL, -- 'success' or 'failed'
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_checklists_project_id ON checklists(project_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
    CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date);
    CREATE INDEX IF NOT EXISTS idx_daily_progress_user_item ON daily_progress(user_id, checklist_item_id);
    CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends(requester_id);
    CREATE INDEX IF NOT EXISTS idx_friends_receiver ON friends(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);
  `);

  // Migration: Add profile_image to users if missing
  const tableInfoUsers = db.pragma('table_info(users)');
  const hasProfileImage = tableInfoUsers.some(col => col.name === 'profile_image');
  if (!hasProfileImage) {
    db.exec('ALTER TABLE users ADD COLUMN profile_image TEXT');
  }

  // Create default admin user if none exists
  const crypto = require('crypto');
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const hash = crypto.createHash('sha256').update('admin123').digest('hex');
    db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run('admin@100blessings.com', hash);
  }

  // Migration: Add email to users if missing
  const hasEmail = tableInfoUsers.some(col => col.name === 'email');
  if (!hasEmail) {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT');
  }

  // Migration: Add phone to users if missing
  const hasPhone = tableInfoUsers.some(col => col.name === 'phone');
  if (!hasPhone) {
    db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
  }

  // Migration: Add password_hash to users if missing
  const hasPasswordHash = tableInfoUsers.some(col => col.name === 'password_hash');
  if (!hasPasswordHash) {
    db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  }

  // Migration: Add is_active to users if missing
  const hasIsActive = tableInfoUsers.some(col => col.name === 'is_active');
  if (!hasIsActive) {
    db.exec('ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1');
  }

  // Migration: Add last_active_at to users if missing
  const hasLastActiveAt = tableInfoUsers.some(col => col.name === 'last_active_at');
  if (!hasLastActiveAt) {
    db.exec('ALTER TABLE users ADD COLUMN last_active_at DATETIME');
  }

  // Migration: Add project_id to checklists if missing
  const tableInfoChecklists = db.pragma('table_info(checklists)');
  const hasProjectId = tableInfoChecklists.some(col => col.name === 'project_id');
  if (!hasProjectId) {
    db.exec('ALTER TABLE checklists ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE');
  }

  // Migration: Add invited_by to users
  const hasInvitedBy = tableInfoUsers.some(col => col.name === 'invited_by');
  if (!hasInvitedBy) {
    db.exec('ALTER TABLE users ADD COLUMN invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
  }

  // Migration: Add order_index to checklists
  const hasChecklistOrderIndex = tableInfoChecklists.some(col => col.name === 'order_index');
  if (!hasChecklistOrderIndex) {
    db.exec('ALTER TABLE checklists ADD COLUMN order_index INTEGER DEFAULT 0');
  }

  // Seed default WhatsApp Template
  const defaultTemplate = "*_Vee Reminder_*\\nשלום {user_name},\\n\\nתזכורת למשימה: *{task_name}*\\nנקבע לשעה: {task_time}\\n\\nבהצלחה!";
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    .run('whatsapp_template', defaultTemplate);

  // Migration: Add parent_item_id to checklist_items if missing
  const tableInfoItems = db.pragma('table_info(checklist_items)');
  const hasParentId = tableInfoItems.some(col => col.name === 'parent_item_id');
  if (!hasParentId) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN parent_item_id INTEGER REFERENCES checklist_items(id) ON DELETE CASCADE');
  }

  // Migration: Add target_date to checklist_items if missing
  const hasTargetDate = tableInfoItems.some(col => col.name === 'target_date');
  if (!hasTargetDate) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN target_date TEXT');
  }

  // Migration: Add description to checklist_items if missing
  const hasDescription = tableInfoItems.some(col => col.name === 'description');
  if (!hasDescription) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN description TEXT');
  }

  // Migration: Add repeat_rule to checklist_items if missing
  const hasRepeatRule = tableInfoItems.some(col => col.name === 'repeat_rule');
  if (!hasRepeatRule) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN repeat_rule TEXT');
  }

  // Migration: Add time to checklist_items if missing
  const hasTime = tableInfoItems.some(col => col.name === 'time');
  if (!hasTime) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN time TEXT');
  }

  // Migration: Add duration to checklist_items if missing
  const hasDuration = tableInfoItems.some(col => col.name === 'duration');
  if (!hasDuration) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN duration INTEGER DEFAULT 0');
  }

  // Migration: Add priority to checklist_items if missing
  const hasPriority = tableInfoItems.some(col => col.name === 'priority');
  if (!hasPriority) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN priority INTEGER DEFAULT 4');
  }

  // Migration: Add reminder_minutes to checklist_items if missing
  const hasReminderMinutes = tableInfoItems.some(col => col.name === 'reminder_minutes');
  if (!hasReminderMinutes) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN reminder_minutes INTEGER');
  }

  // Migration: Add created_at to checklist_items if missing
  const hasCreatedAt = tableInfoItems.some(col => col.name === 'created_at');
  if (!hasCreatedAt) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN created_at DATETIME');
    db.exec('UPDATE checklist_items SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
  }

  // Migration: Drop active_days and is_routine (Cleanup requested by user)
  const tableInfoProjectsMigration = db.pragma('table_info(projects)');
  if (tableInfoProjectsMigration.some(col => col.name === 'active_days')) {
    try { db.exec('ALTER TABLE projects DROP COLUMN active_days'); } catch (e) { console.error(e); }
  }
  if (tableInfoProjectsMigration.some(col => col.name === 'is_routine')) {
    try { db.exec('ALTER TABLE projects DROP COLUMN is_routine'); } catch (e) { console.error(e); }
  }
  const tableInfoChecklistsMigration = db.pragma('table_info(checklists)');
  if (tableInfoChecklistsMigration.some(col => col.name === 'active_days')) {
    try { db.exec('ALTER TABLE checklists DROP COLUMN active_days'); } catch (e) { console.error(e); }
  }
  // Migration: Add whatsapp_enabled to users if missing
  const hasWhatsappEnabled = tableInfoUsers.some(col => col.name === 'whatsapp_enabled');
  if (!hasWhatsappEnabled) {
    db.exec('ALTER TABLE users ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT 0');
  }

  // Migration: Add whatsapp_last_sent_date to checklist_items if missing
  const hasWhatsappLastSentDate = tableInfoItems.some(col => col.name === 'whatsapp_last_sent_date');
  if (!hasWhatsappLastSentDate) {
    db.exec('ALTER TABLE checklist_items ADD COLUMN whatsapp_last_sent_date TEXT');
  }

  // Migration: Seed project_members for existing projects
  db.exec(`
    INSERT OR IGNORE INTO project_members (project_id, user_id, role)
    SELECT id, user_id, 'owner' FROM projects
  `);

  // Seed initial templates if none exist
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get();
  if (templateCount.count === 0) {
    const insertTemplate = db.prepare('INSERT INTO templates (title, description) VALUES (?, ?)');
    const insertTemplateItem = db.prepare('INSERT INTO template_items (template_id, content) VALUES (?, ?)');

    db.transaction(() => {
      const t1 = insertTemplate.run('100 ברכות', 'רשימת חובה - לברך מאה ברכות בכל יום');
      const blessings = [
        'על נטילת ידיים', 'אשר יצר', 'אלהי נשמה', 'הנותן לשכוי בינה', 'פוקח עיוורים',
        'מתיר אסורים', 'זוקף כפופים', 'מלביש ערומים', 'הנותן ליעף כח', 'רוקע הארץ על המים',
        'המכין מצעדי גבר', 'שעשה לי כל צרכי', 'אוזר ישראל בגבורה', 'עוטר ישראל בתפארה',
        'שלא עשני גוי', 'שלא עשני עבד', 'שלא עשני אישה', 'המעביר שנה מעיני',
        'ברכת התורה (1)', 'ברכת התורה (2)', 'ברכת התורה (3)', 'ברוך שאמר', 'ישתבח',
        'יוצר אור', 'אהבת עולם', 'גאל ישראל', 'תפילת עמידה - שחרית (19 ברכות)',
        'תפילת עמידה - מנחה (19 ברכות)', 'תפילת עמידה - ערבית (19 ברכות)',
        'ברכת המזון (4 ברכות)', 'ברכת אמת ואמונה', 'השכיבנו'
      ];
      blessings.forEach(b => insertTemplateItem.run(t1.lastInsertRowid, b));

      const t2 = insertTemplate.run('שגרת בוקר בריאה', 'התחלה בריאה וחיובית ליום שלך');
      ['שתיית כוס מים בהקיץ', 'מתיחות של 5 דקות', 'סידור המיטה', 'קריאת פרק בספר'].forEach(
        item => insertTemplateItem.run(t2.lastInsertRowid, item)
      );

      const t3 = insertTemplate.run('הכנה לשבת', 'משימות יום שישי לכבוד שבת קודש');
      ['קניות לשבת', 'ניקיון הבית', 'הכנת חלות', 'בישול תבשילים', 'מקלחת והתארגנות'].forEach(
        item => insertTemplateItem.run(t3.lastInsertRowid, item)
      );
    })();
  }
};

initDb();

module.exports = db;
