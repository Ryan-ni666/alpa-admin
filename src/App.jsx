import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const CATEGORIES = [
  { value: 'tilt', label: '俯仰 Tilt' },
  { value: 'lens', label: '镜头 Lens' },
  { value: 'workflow', label: '工作流 Workflow' },
  { value: 'post', label: '后期 Post' },
];

const emptyTip = {
  title_zh: '', title_en: '',
  summary_zh: '', summary_en: '',
  content_zh: '', content_en: '',
  cover_url: '',
  category: 'tilt',
  is_published: false,
  published_at: null,
};

export default function App() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setTips(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTips(); }, [fetchTips]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...editing };
    delete payload.created_at;
    delete payload.updated_at;

    if (payload.is_published && !payload.published_at) {
      payload.published_at = new Date().toISOString();
    }

    let error;
    if (payload.id) {
      ({ error } = await supabase.from('tips').update(payload).eq('id', payload.id));
    } else {
      delete payload.id;
      ({ error } = await supabase.from('tips').insert(payload));
    }

    if (error) {
      alert('保存失败: ' + error.message);
    } else {
      setEditing(null);
      fetchTips();
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除？此操作不可恢复。')) return;
    await supabase.from('tips').delete().eq('id', id);
    fetchTips();
  };

  const handleTogglePublish = async (tip) => {
    const newVal = !tip.is_published;
    await supabase.from('tips').update({
      is_published: newVal,
      published_at: newVal ? new Date().toISOString() : null,
    }).eq('id', tip.id);
    fetchTips();
  };

  // ---- Styles ----
  const s = {
    page: { maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#333' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '3px solid #B8A86F', paddingBottom: 16 },
    title: { fontSize: 22, fontWeight: 700, color: '#2D4A3F' },
    btn: { padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnPrimary: { background: '#2D4A3F', color: '#fff' },
    btnGold: { background: '#B8A86F', color: '#fff' },
    btnDanger: { background: '#c0392b', color: '#fff' },
    btnOutline: { background: '#fff', color: '#2D4A3F', border: '1px solid #2D4A3F' },
    card: { background: '#fff', border: '1px solid #e0ddd8', borderRadius: 8, padding: 16, marginBottom: 12 },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    badge: (pub) => ({
      display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: pub ? '#d4edda' : '#f8d7da', color: pub ? '#155724' : '#721c24',
    }),
    catBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#2D4A3F', color: '#B8A86F', marginLeft: 8 },
    label: { display: 'block', fontWeight: 600, marginBottom: 4, marginTop: 16, fontSize: 13, color: '#2D4A3F' },
    input: { width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, minHeight: 200, boxSizing: 'border-box', fontFamily: 'monospace' },
    select: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    actions: { display: 'flex', gap: 8, marginTop: 8 },
  };

  // ---- Form View ----
  if (editing) {
    const set = (k, v) => setEditing({ ...editing, [k]: v });
    const isNew = !editing.id;

    return (
      <div style={{ ...s.page, background: '#F5F3F0', minHeight: '100vh' }}>
        <div style={s.header}>
          <span style={s.title}>{isNew ? '➕ 新建教程' : '✏️ 编辑教程'}</span>
          <button style={{ ...s.btn, ...s.btnOutline }} onClick={() => setEditing(null)}>← 返回列表</button>
        </div>

        <div style={s.card}>
          <div style={s.row}>
            <div>
              <label style={s.label}>标题（中文）</label>
              <input style={s.input} value={editing.title_zh} onChange={e => set('title_zh', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Title (EN)</label>
              <input style={s.input} value={editing.title_en} onChange={e => set('title_en', e.target.value)} />
            </div>
          </div>

          <div style={s.row}>
            <div>
              <label style={s.label}>摘要（中文）</label>
              <input style={s.input} value={editing.summary_zh} onChange={e => set('summary_zh', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Summary (EN)</label>
              <input style={s.input} value={editing.summary_en} onChange={e => set('summary_en', e.target.value)} />
            </div>
          </div>

          <label style={s.label}>封面图片 URL</label>
          <input style={s.input} value={editing.cover_url || ''} onChange={e => set('cover_url', e.target.value)} placeholder="https://..." />

          <div style={s.row}>
            <div>
              <label style={s.label}>分类</label>
              <select style={s.select} value={editing.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>发布状态</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input type="checkbox" checked={editing.is_published} onChange={e => set('is_published', e.target.checked)} />
                {editing.is_published ? '已发布' : '草稿'}
              </label>
            </div>
          </div>

          <div style={s.row}>
            <div>
              <label style={s.label}>正文（中文 Markdown）</label>
              <textarea style={s.textarea} value={editing.content_zh} onChange={e => set('content_zh', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Content (EN Markdown)</label>
              <textarea style={s.textarea} value={editing.content_en} onChange={e => set('content_en', e.target.value)} />
            </div>
          </div>

          <div style={{ ...s.actions, marginTop: 24, justifyContent: 'flex-end' }}>
            <button style={{ ...s.btn, ...s.btnOutline }} onClick={() => setEditing(null)}>取消</button>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '💾 保存'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- List View ----
  return (
    <div style={{ ...s.page, background: '#F5F3F0', minHeight: '100vh' }}>
      <div style={s.header}>
        <span style={s.title}>ALPA Tips 管理后台</span>
        <button style={{ ...s.btn, ...s.btnGold }} onClick={() => setEditing({ ...emptyTip })}>
          ＋ 新建教程
        </button>
      </div>

      {loading && <p>加载中...</p>}

      {!loading && tips.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: 60 }}>暂无教程，点击右上角新建</p>
      )}

      {tips.map(tip => (
        <div key={tip.id} style={s.card}>
          <div style={s.cardHeader}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {tip.title_zh || tip.title_en}
                <span style={s.catBadge}>{CATEGORIES.find(c => c.value === tip.category)?.label || tip.category}</span>
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{tip.title_en}</div>
              <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{tip.summary_zh}</div>
            </div>
            <span style={s.badge(tip.is_published)}>
              {tip.is_published ? '已发布' : '草稿'}
            </span>
          </div>
          <div style={{ ...s.actions, marginTop: 12 }}>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={() => setEditing({ ...tip })}>编辑</button>
            <button style={{ ...s.btn, ...s.btnOutline }} onClick={() => handleTogglePublish(tip)}>
              {tip.is_published ? '取消发布' : '发布'}
            </button>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => handleDelete(tip.id)}>删除</button>
          </div>
        </div>
      ))}
    </div>
  );
}
