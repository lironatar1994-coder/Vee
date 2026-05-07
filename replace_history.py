import os

path = r'c:\Users\liron\Vee\frontend\src\pages\History.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { ChevronDown } from 'lucide-react';", "import { ChevronDown, Check } from 'lucide-react';\nimport TaskEditModal from '../components/TaskEditModal';")

# 2. State
target_state = "    const [selectedFilter, setSelectedFilter] = useState({"
new_state = """    const [selectedActivity, setSelectedActivity] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState({"""
content = content.replace(target_state, new_state)

# 3. handleToggleComplete
target_effect = "    useEffect(() => {"
new_effect = """    const handleToggleComplete = async (activity) => {
        try {
            const res = await authFetch(`/api/users/current/progress`, {
                method: 'POST',
                body: JSON.stringify({
                    checklist_item_id: activity.id,
                    date: activity.progress_date || activity.date,
                    completed: false
                })
            });
            if (res.ok) {
                setActivities(prev => prev.filter(a => a.id !== activity.id || a.date !== activity.date));
                if (selectedActivity && selectedActivity.id === activity.id) setSelectedActivity(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {"""
parts = content.split("    useEffect(() => {", 1)
if len(parts) == 2:
    content = parts[0] + new_effect + parts[1]

# 4. Article Replace
# We'll use a regex or string replacement on the article block.
# Let's find the index of "<article" and "</article>"
article_start = content.find("<article")
article_end = content.find("</article>", article_start) + len("</article>")

if article_start != -1 and article_end != -1:
    old_article = content[article_start:article_end]
    new_article = """<article
                                    key={`${activity.id}_${activity.date}`}
                                    onClick={() => setSelectedActivity(activity)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        marginBottom: '0.5rem',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--hover-bg)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-secondary)';
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {/* Check Circle (Completed) */}
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(activity); }}
                                        style={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: 'var(--primary-color)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, cursor: 'pointer'
                                        }}
                                    >
                                        <Check size={14} color="white" strokeWidth={3} />
                                    </div>

                                    {/* Text and meta */}
                                    <div
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.2rem'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '1rem',
                                                color: 'var(--text-primary)',
                                                fontWeight: 500,
                                                textDecoration: 'line-through',
                                                opacity: 0.8
                                            }}
                                        >
                                            {activity.content || (activity.message ? activity.message.replace('השלמת משימה: ', '') : '')}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem',
                                                fontSize: '0.85rem',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            {activity.project_name && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    {activity.project_name}
                                                </span>
                                            )}
                                            <span>•</span>
                                            <span>{formatTime(activity.date)}</span>
                                        </div>
                                    </div>
                                </article>"""
    content = content.replace(old_article, new_article)

# 5. Add Modal at the end
modal_code = """
            {/* Task Edit Modal */}
            {selectedActivity && (
                <TaskEditModal
                    item={selectedActivity}
                    projectTitle={selectedActivity.project_name || 'כללי'}
                    isOpen={!!selectedActivity}
                    onClose={() => setSelectedActivity(null)}
                    isCompleted={true}
                    onToggleComplete={() => handleToggleComplete(selectedActivity)}
                    onSave={() => {}}
                />
            )}
        </TaskPageLayout>
"""
content = content.replace("        </TaskPageLayout>", modal_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated History.jsx")
