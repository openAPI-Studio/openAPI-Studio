import React, { useState, useRef, useEffect } from 'react';
import { useTabStore, Tab, TabGroup, GROUP_COLORS } from '../stores/tabStore';
import { useAppStore } from '../stores/appStore';
import { X, Plus, Zap, ChevronDown } from 'lucide-react';

const methodColor: Record<string, string> = {
  GET: '#61affe', POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7',
};

/* ── Context Menu ── */
interface MenuPos { x: number; y: number; tabId: string }

function ContextMenu({ pos, onClose }: { pos: MenuPos; onClose: () => void }) {
  const groups = useTabStore((s) => s.groups);
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === pos.tabId));
  const moveTabToGroup = useTabStore((s) => s.moveTabToGroup);
  const addTabToNewGroup = useTabStore((s) => s.addTabToNewGroup);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!tab) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded py-1 text-[11px] min-w-[160px]"
      style={{ left: pos.x, top: pos.y, background: 'var(--vsc-widget-bg)', border: '1px solid var(--vsc-border-visible)', boxShadow: '0 4px 12px var(--vsc-shadow)' }}
    >
      <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--vsc-list-hover)]" onClick={() => { addTabToNewGroup(pos.tabId); onClose(); }}>
        Add to new group
      </button>
      {groups.length > 0 && (
        <div style={{ borderTop: '1px solid var(--vsc-border-visible)', margin: '2px 0' }} />
      )}
      {groups.map((g) => (
        <button
          key={g.id}
          className="w-full text-left px-3 py-1.5 hover:bg-[var(--vsc-list-hover)] flex items-center gap-2"
          onClick={() => { moveTabToGroup(pos.tabId, g.id); onClose(); }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
          {tab.groupId === g.id ? <span className="opacity-40">✓ {g.name}</span> : g.name}
        </button>
      ))}
      {tab.groupId && (
        <>
          <div style={{ borderTop: '1px solid var(--vsc-border-visible)', margin: '2px 0' }} />
          <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--vsc-list-hover)]" onClick={() => { moveTabToGroup(pos.tabId, null); onClose(); }}>
            Remove from group
          </button>
        </>
      )}
    </div>
  );
}

/* ── Group Context Menu ── */
interface GroupMenuPos { x: number; y: number; groupId: string }

function GroupContextMenu({ pos, onClose, onRename }: { pos: GroupMenuPos; onClose: () => void; onRename: () => void }) {
  const group = useTabStore((s) => s.groups.find((g) => g.id === pos.groupId));
  const setGroupColor = useTabStore((s) => s.setGroupColor);
  const deleteGroup = useTabStore((s) => s.deleteGroup);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!group) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded py-1 text-[11px] min-w-[140px]"
      style={{ left: pos.x, top: pos.y, background: 'var(--vsc-widget-bg)', border: '1px solid var(--vsc-border-visible)', boxShadow: '0 4px 12px var(--vsc-shadow)' }}
    >
      <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--vsc-list-hover)]" onClick={() => { onRename(); onClose(); }}>
        Rename group
      </button>
      <div style={{ borderTop: '1px solid var(--vsc-border-visible)', margin: '2px 0' }} />
      <div className="px-3 py-1.5">
        <div className="text-[10px] opacity-50 mb-1">Color</div>
        <div className="flex gap-1.5 flex-wrap">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              className="w-4 h-4 rounded-full shrink-0 hover:scale-125 transition-transform"
              style={{ background: c, outline: group.color === c ? '2px solid var(--vsc-fg)' : 'none', outlineOffset: 1 }}
              onClick={() => { setGroupColor(group.id, c); onClose(); }}
            />
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--vsc-border-visible)', margin: '2px 0' }} />
      <button className="w-full text-left px-3 py-1.5 hover:bg-[var(--vsc-list-hover)]" onClick={() => { deleteGroup(group.id); onClose(); }}>
        Ungroup
      </button>
    </div>
  );
}

/* ── Group Header ── */
function GroupHeader({ group }: { group: TabGroup }) {
  const toggleGroupCollapsed = useTabStore((s) => s.toggleGroupCollapsed);
  const renameGroup = useTabStore((s) => s.renameGroup);
  const deleteGroup = useTabStore((s) => s.deleteGroup);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [groupMenu, setGroupMenu] = useState<GroupMenuPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    if (name.trim()) renameGroup(group.id, name.trim());
    else setName(group.name);
    setEditing(false);
  };

  return (
    <>
      <div
        className="flex items-center shrink-0 cursor-pointer select-none"
        style={{ borderBottom: `2px solid ${group.color}`, padding: '4px 6px', gap: 4 }}
        onContextMenu={(e) => { e.preventDefault(); setGroupMenu({ x: e.clientX, y: e.clientY, groupId: group.id }); }}
      >
        <span
          style={{ transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)', transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0)', display: 'inline-flex' }}
          onClick={() => toggleGroupCollapsed(group.id)}
        >
          <ChevronDown size={10} style={{ color: group.color }} />
        </span>
        {editing ? (
          <input
            ref={inputRef}
            className="bg-transparent border-none outline-none text-[10px] font-semibold"
            style={{ color: group.color, width: Math.max(30, name.length * 6.5) }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(group.name); setEditing(false); } }}
          />
        ) : (
          <span
            className="text-[10px] font-semibold"
            style={{ color: group.color }}
            onClick={() => toggleGroupCollapsed(group.id)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {group.name}
          </span>
        )}
        <button
          className="opacity-0 hover:opacity-100 shrink-0 p-0.5 rounded group-header-close"
          style={{ transition: 'opacity 0.15s ease' }}
          onClick={() => deleteGroup(group.id)}
          title="Ungroup tabs"
        >
          <X size={8} style={{ color: group.color }} />
        </button>
      </div>
      {groupMenu && <GroupContextMenu pos={groupMenu} onClose={() => setGroupMenu(null)} onRename={() => setEditing(true)} />}
    </>
  );
}

/* ── Tab Item ── */
function TabItem({ tab, active, collapsed, groupColor, tabIndex, onContextMenu }: {
  tab: Tab; active: boolean; collapsed: boolean; groupColor?: string; tabIndex: number; onContextMenu: (e: React.MouseEvent) => void;
}) {
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const reorderTab = useTabStore((s) => s.reorderTab);
  const label = tab.name || tab.url || 'New Request';
  const showCollapsed = collapsed && !active;
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const [dropSide, setDropSide] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (innerRef.current) setMeasuredWidth(innerRef.current.scrollWidth);
  }, [label, tab.method, active, showCollapsed]);

  const targetWidth = showCollapsed ? 28 : (measuredWidth ?? 150);

  const getDropSide = (e: React.DragEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 'right';
    return e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
  };

  return (
    <div
      ref={ref}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('tabId', tab.id); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={(e) => { e.preventDefault(); setDropSide(getDropSide(e)); }}
      onDragLeave={() => setDropSide(null)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropSide(null);
        const draggedId = e.dataTransfer.getData('tabId');
        if (!draggedId || draggedId === tab.id) return;
        const side = getDropSide(e);
        const insertIdx = side === 'left' ? tabIndex : tabIndex + 1;
        reorderTab(draggedId, insertIdx, tab.groupId);
      }}
      className={`group flex items-center cursor-pointer shrink-0 border-r ${active ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
      style={{
        background: groupColor
          ? (active ? `${groupColor}30` : `${groupColor}18`)
          : (active ? 'var(--vsc-bg)' : 'transparent'),
        borderColor: 'var(--vsc-border-visible)',
        borderBottom: active ? `2px solid ${groupColor || 'var(--vsc-btn-bg)'}` : '2px solid transparent',
        marginBottom: '-1px',
        width: targetWidth,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.15s ease',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: dropSide === 'left' ? 'inset 2px 0 0 var(--vsc-btn-bg)' : dropSide === 'right' ? 'inset -2px 0 0 var(--vsc-btn-bg)' : 'none',
      }}
      onClick={() => setActiveTab(tab.id)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e); }}
      title={showCollapsed ? label : undefined}
    >
      <div ref={innerRef} className="flex items-center gap-1.5 py-1.5 px-2.5 whitespace-nowrap" style={{ minWidth: 'max-content' }}>
        {showCollapsed ? (
          <Zap size={10} className="shrink-0" style={{ color: methodColor[tab.method] || 'var(--vsc-fg)' }} />
        ) : (
          <>
            <span className="font-mono text-[9px] font-bold uppercase shrink-0" style={{ color: methodColor[tab.method] || 'var(--vsc-fg)' }}>
              {tab.method}
            </span>
            <span className="text-[11px] truncate max-w-[120px]">{label}</span>
          </>
        )}
        {tab.loading && <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--vsc-warning)' }} />}
        <button
          className="opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0 p-0.5 rounded"
          style={{ transition: 'opacity 0.15s ease' }}
          onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
          title="Close tab"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}

/* ── TabBar ── */
export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const groups = useTabStore((s) => s.groups);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const reorderTab = useTabStore((s) => s.reorderTab);
  const tabViewCollapsed = useAppStore((s) => s.tabViewCollapsed);
  const tabGrouping = useAppStore((s) => s.tabGrouping);
  const [menu, setMenu] = useState<MenuPos | null>(null);

  const onCtx = (tabId: string) => (e: React.MouseEvent) => setMenu({ x: e.clientX, y: e.clientY, tabId });

  // Build ordered segments: [group+tabs, group+tabs, ..., ungrouped tabs]
  const segments: { group: TabGroup | null; tabs: Tab[] }[] = [];
  if (tabGrouping) {
    for (const g of groups) {
      const groupTabs = tabs.filter((t) => t.groupId === g.id);
      if (groupTabs.length) segments.push({ group: g, tabs: groupTabs });
    }
  }
  const ungrouped = tabGrouping ? tabs.filter((t) => !t.groupId) : tabs;
  if (ungrouped.length) segments.push({ group: null, tabs: ungrouped });

  return (
    <div className="flex items-center shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--vsc-border-visible)', background: 'var(--vsc-tab-inactive)' }}>
      {segments.map((seg, i) => (
        <React.Fragment key={seg.group?.id || '_ungrouped'}>
          {seg.group && <GroupHeader group={seg.group} />}
          <div
            className="flex items-center"
            style={seg.group ? {
              overflow: 'hidden',
              transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
              maxHeight: seg.group.collapsed ? 0 : 100,
            } : undefined}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const draggedId = e.dataTransfer.getData('tabId');
              if (draggedId) reorderTab(draggedId, tabs.length, seg.group?.id || null);
            }}
          >
            {(!seg.group?.collapsed || seg.tabs.some((t) => t.id === activeTabId)) &&
              seg.tabs
                .filter((t) => !seg.group?.collapsed || t.id === activeTabId)
                .map((tab) => (
                  <TabItem key={tab.id} tab={tab} active={tab.id === activeTabId} collapsed={tabViewCollapsed} groupColor={seg.group?.color} tabIndex={tabs.indexOf(tab)} onContextMenu={onCtx(tab.id)} />
                ))
            }
          </div>
        </React.Fragment>
      ))}
      <button
        className="shrink-0 p-1.5 opacity-30 hover:opacity-70"
        style={{ transition: 'opacity 0.15s ease' }}
        onClick={addTab}
        title="New tab"
      >
        <Plus size={12} />
      </button>
      {menu && <ContextMenu pos={menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
