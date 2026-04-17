import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { List, Check, Search, Inbox, Folder } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const API_URL = '/api';

const ProjectSelectorDropdown = ({ isOpen, onClose, anchorRef, onSelect, selectedChecklistId, selectedProject, selectedChecklist }) => {
    const { user, authFetch } = useUser();
    const [projects, setProjects] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = React.useRef(null);

    useEffect(() => {
        if (!isOpen || !user) return;
        const fetchData = async () => {
            try {
                const [projRes, checkRes] = await Promise.all([
                    authFetch(`${API_URL}/users/current/projects`),
                    authFetch(`${API_URL}/users/current/checklists`)
                ]);
                if (projRes.ok) setProjects(await projRes.json());
                if (checkRes.ok) setChecklists(await checkRes.json());
            } catch (error) {
                console.error('Failed to fetch projects/checklists for selector:', error);
            }
        };
        fetchData();
    }, [isOpen, user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                anchorRef.current && !anchorRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, anchorRef]);

    if (!isOpen) return null;

    const filteredInboxChecklists = checklists.filter(c => !c.project_id && (c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 'תיבת המשימות'.includes(searchQuery) || 'הפרויקט הראשון שלי'.includes(searchQuery)));

    // Group lists by project
    const getProjectChecklists = (project) => {
        // We only want to show NAMED lists here. Empty-titled lists are represented by the project header.
        const allProjectLists = checklists.filter(c => c.project_id === project.id && c.title && c.title.trim() !== '');

        const projectMatches = project.title.toLowerCase().includes(searchQuery.toLowerCase());
        if (projectMatches) {
            return allProjectLists;
        }
        // Otherwise, show only the lists that match the search
        return allProjectLists.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()));
    };

    const handleSelect = (checklist, project) => {
        onSelect(checklist, project);
        onClose();
    };

    const handleSelectProjectDirectly = (project) => {
        // If the user clicks the project, find its inbox list or create a "signal" for a new inbox
        const projectInbox = checklists.find(c => c.project_id === project.id && (!c.title || c.title === ''));
        if (projectInbox) {
            handleSelect(projectInbox, project);
        } else {
            handleSelect({ id: `NEW_INBOX_${project.id}`, title: '', project_id: project.id }, project);
        }
    };

    const renderItem = (checklist, project, isInbox = false) => {
        const isSelected = selectedChecklistId === checklist.id;
        // Use CSS variable for standard list icons to adapt to light/dark mode
        const iconColor = 'var(--text-secondary)';
        return (
            <div
                key={checklist.id}
                onClick={() => handleSelect(checklist, project)}
                style={{
                    padding: '0.4rem 0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--dropdown-selected)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    margin: '0 0.25rem',
                    transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'var(--dropdown-selected)' : 'transparent'}
            >
                <List size={14} color={iconColor} style={{ opacity: isInbox ? 0.9 : 0.6 }} />
                <span style={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isSelected ? 600 : 400 }}>
                    {checklist.title || (isInbox ? 'תיבת המשימות' : 'ללא שם')}
                </span>
                {isSelected && <Check size={14} color="var(--primary-color)" />}
            </div>
        );
    };

    const renderProjectSection = (project, depth = 0) => {
        const projectMatches = project.title.toLowerCase().includes(searchQuery.toLowerCase());
        const projectLists = getProjectChecklists(project);

        // Find sub-projects
        const subProjects = projects.filter(p => p.parent_id === project.id);
        const subProjectMatchCount = subProjects.reduce((acc, sp) => {
            const hasMatches = sp.title.toLowerCase().includes(searchQuery.toLowerCase()) || getProjectChecklists(sp).length > 0;
            return acc + (hasMatches ? 1 : 0);
        }, 0);

        if (projectLists.length === 0 && !projectMatches && subProjectMatchCount === 0) return null;

        // Is this the selected project/list?
        const isProjectSelected = selectedChecklistId === `NEW_INBOX_${project.id}` ||
            (selectedProject?.id === project.id && (!selectedChecklist || !selectedChecklist.title));

        return (
            <div key={project.id} style={{ marginBottom: '0.5rem', marginRight: depth > 0 ? `${depth * 1.5}rem` : '0', position: 'relative' }}>
                {depth > 0 && <div style={{ position: 'absolute', right: '-0.75rem', top: 0, bottom: 0, width: '1px', background: 'var(--border-color)' }} />}

                <div
                    onClick={() => handleSelectProjectDirectly(project)}
                    style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: isProjectSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: isProjectSelected ? 'var(--dropdown-selected)' : 'transparent',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'all 0.15s ease',
                        margin: '0 0.25rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = isProjectSelected ? 'var(--dropdown-selected)' : 'transparent'}
                >
                    <Folder size={14} color={project.color && project.color !== '#ffffff' ? project.color : 'var(--text-secondary)'} style={{ opacity: 1 }} />
                    <span style={{ flexGrow: 1 }}>{project.title}</span>
                </div>
                {projectLists.length > 0 && (
                    <div style={{ paddingRight: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        {projectLists.map(c => {
                            // If the list name is the same as project name and it's an inbox-like list, don't show it as a sub-item if we want project-only selection
                            // But usually, projects have "Lists" inside. If the user wants to NOT show the duplicate, we check here.
                            return renderItem(c, project);
                        })}
                    </div>
                )}
                {/* Render recursive sub-projects */}
                {subProjects.map(sp => renderProjectSection(sp, depth + 1))}
            </div>
        );
    };

    return createPortal(
        <div ref={dropdownRef} className="dropdown-menu slide-down fade-in" style={{
            position: 'absolute',
            top: anchorRef.current ? anchorRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
            left: anchorRef.current ? (
                (() => {
                    const rect = anchorRef.current.getBoundingClientRect();
                    const dropdownWidth = 275;
                    // Aligned more to the right side (where labels are in RTL) and shifted a bit left
                    let left = rect.right + window.scrollX - dropdownWidth - 20;
                    // Prevent going off screen left
                    if (left < 10) left = 10;
                    // Prevent going off screen right
                    if (left + dropdownWidth > window.innerWidth - 10) {
                        left = window.innerWidth - dropdownWidth - 10;
                    }
                    return left;
                })()
            ) : 0,
            width: '275px',
            maxHeight: '400px',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{ padding: '0.6rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)', zIndex: 2 }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-secondary)', zIndex: 1 }} />
                    <input
                        type="text"
                        placeholder="חיפוש פרויקט או רשימה..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.45rem 0.5rem 0.45rem 2.2rem',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                        }}
                        onFocus={e => { e.target.style.background = 'var(--bg-color)'; e.target.style.borderColor = 'var(--primary-color)'; e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary-rgb, 36, 111, 224), 0.15)'; }}
                        onBlur={e => { e.target.style.background = 'var(--bg-secondary)'; e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
                    />
                </div>
            </div>

            <div style={{ overflowY: 'auto', flexGrow: 1, padding: '0.25rem 0' }}>
                {/* Inbox Checklists */}
                {filteredInboxChecklists.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Inbox size={14} color="var(--text-secondary)" style={{ opacity: 0.8 }} />
                            תיבת המשימות
                        </div>
                        <div style={{ paddingRight: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            {filteredInboxChecklists.map(c => renderItem(c, null, true))}
                        </div>
                    </div>
                )}

                {/* Projects */}
                {projects.filter(p => !p.parent_id).map(p => renderProjectSection(p, 0))}

                {projects.filter(p => !p.parent_id).every(p => {
                    const projectMatches = p.title.toLowerCase().includes(searchQuery.toLowerCase());
                    const projectLists = getProjectChecklists(p);
                    // Also check subprojects
                    const subProjects = projects.filter(sp => sp.parent_id === p.id);
                    const subProjectMatch = subProjects.some(sp => sp.title.toLowerCase().includes(searchQuery.toLowerCase()) || getProjectChecklists(sp).length > 0);
                    return projectLists.length === 0 && !projectMatches && !subProjectMatch;
                    return projectLists.length === 0 && !projectMatches;
                }) && filteredInboxChecklists.length === 0 && (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            לא נמצאו פרויקטים תואמים
                        </div>
                    )}
            </div>
        </div>,
        document.body
    );
};

export default ProjectSelectorDropdown;
