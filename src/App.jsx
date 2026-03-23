import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

const CATEGORIES = [
  { value: 'tilt', label: '俯仰 Tilt' },
  { value: 'lens', label: '镜头 Lens' },
  { value: 'filter', label: '滤镜 Filter' },
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

// Simple auth (client-side gate, not for high-security use)
const AUTH_USER = 'hjryan';
const AUTH_HASH = '7a3f8b2d'; // derived from password

function hashSimple(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('alpa_auth') === 'true');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = () => {
    if (loginUser === AUTH_USER && hashSimple(loginPass) === hashSimple('Hengji000@')) {
      sessionStorage.setItem('alpa_auth', 'true');
      setAuthed(true);
    } else {
      setLoginError('用户名或密码错误');
    }
  };

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

  // ---- Push Notification ----
  const [pushing, setPushing] = useState(false);

  const sendPush = async (tip) => {
    if (!confirm(`确认向所有用户推送通知？\n\n标题：${tip.title_zh}`)) return;
    setPushing(tip.id);
    try {
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'alpa-push-2026324￥%#@%……',
        },
        body: JSON.stringify({
          title: '大烤拉摄影学院',
          body: `新文章：${tip.title_zh}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`推送成功！发送 ${data.sent} 台设备，失败 ${data.failed} 台`);
      } else {
        alert('推送失败: ' + (data.error || '未知错误'));
      }
    } catch (err) {
      alert('推送失败: ' + err.message);
    }
    setPushing(false);
  };

  // ---- Styles ----
  const s = {
    page: { maxWidth: 1200, margin: '0 auto', padding: '24px 40px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#333' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '3px solid #B8A86F', paddingBottom: 16 },
    title: { fontSize: 22, fontWeight: 700, color: '#2D4A3F' },
    btn: { padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnPrimary: { background: '#2D4A3F', color: '#fff' },
    btnGold: { background: '#B8A86F', color: '#fff' },
    btnDanger: { background: '#c0392b', color: '#fff' },
    btnOutline: { background: '#fff', color: '#2D4A3F', border: '1px solid #2D4A3F' },
    card: { background: '#fff', border: '1px solid #e0ddd8', borderRadius: 8, padding: 24, marginBottom: 16 },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    badge: (pub) => ({
      display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: pub ? '#d4edda' : '#f8d7da', color: pub ? '#155724' : '#721c24',
    }),
    catBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#2D4A3F', color: '#B8A86F', marginLeft: 8 },
    label: { display: 'block', fontWeight: 600, marginBottom: 4, marginTop: 16, fontSize: 13, color: '#2D4A3F' },
    input: { width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '12px 14px', border: '1px solid #ccc', borderRadius: 6, fontSize: 15, minHeight: 320, boxSizing: 'border-box', fontFamily: 'ui-monospace, "SF Mono", Monaco, monospace', lineHeight: 1.7 },
    select: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    actions: { display: 'flex', gap: 8, marginTop: 8 },
    toolBtn: { padding: '4px 10px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#fff', color: '#2D4A3F' },
    previewBox: { border: '1px solid #e0ddd8', borderRadius: 8, padding: 20, minHeight: 200, background: '#fff', fontSize: 15, lineHeight: 1.75, color: '#333', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  };

  // ---- Markdown helpers ----
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const simpleMarkdownToHTML = (md) => {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="border-bottom:2px solid #B8A86F;padding-bottom:6px">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;margin:12px 0">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#B8A86F">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#2D4A3F">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:#F0EBE0;padding:2px 6px;border-radius:4px">$1</code>')
      .replace(/^---$/gm, '<hr style="border:none;height:1px;background:linear-gradient(to right,#B8A86F,transparent);margin:20px 0">')
      .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #B8A86F;padding:8px 16px;margin:12px 0;background:rgba(184,168,111,0.08);border-radius:0 8px 8px 0;color:#555">$1</blockquote>')
      .replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, m => '<ul style="padding-left:24px;margin:12px 0">' + m + '</ul>');
    html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
  };

  const handleImageUpload = async (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.gif';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `tips/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('tips-media').upload(path, file, { cacheControl: '31536000', upsert: false });
      if (error) {
        alert('上传失败: ' + error.message);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('tips-media').getPublicUrl(path);
      const mdImage = `![${file.name}](${urlData.publicUrl})`;
      setEditing(prev => ({ ...prev, [field]: (prev[field] || '') + '\n' + mdImage + '\n' }));
      setUploading(false);
    };
    input.click();
  };

  const insertMarkdown = (field, prefix, suffix = '') => {
    const textarea = document.querySelector(`textarea[data-field="${field}"]`);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editing[field] || '';
    const selected = text.substring(start, end) || '文字';
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    setEditing(prev => ({ ...prev, [field]: newText }));
  };

  // ---- Toolbar component ----
  const MarkdownToolbar = ({ field }) => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
      <button type="button" style={s.toolBtn} onClick={() => insertMarkdown(field, '## ', '')}>H2</button>
      <button type="button" style={s.toolBtn} onClick={() => insertMarkdown(field, '### ', '')}>H3</button>
      <button type="button" style={s.toolBtn} onClick={() => insertMarkdown(field, '**', '**')}>B</button>
      <button type="button" style={s.toolBtn} onClick={() => insertMarkdown(field, '*', '*')}>I</button>
      <button type="button" style={s.toolBtn} onClick={() => insertMarkdown(field, '> ', '')}>引用</button>
      <button type="button" style={s.toolBtn} onClick={() => insertMarkdown(field, '- ', '')}>列表</button>
      <button type="button" style={s.toolBtn} onClick={() => insertMarkdown(field, '[', '](https://)')}>链接</button>
      <button type="button" style={{ ...s.toolBtn, ...s.btnGold }} onClick={() => handleImageUpload(field)} disabled={uploading}>
        {uploading ? '上传中...' : '📷 图片/GIF'}
      </button>
    </div>
  );

  // ---- Form View ----
  if (editing) {
    const set = (k, v) => setEditing({ ...editing, [k]: v });
    const isNew = !editing.id;

    return (
      <div style={{ ...s.page, background: '#F5F3F0', minHeight: '100vh' }}>
        <div style={s.header}>
          <span style={s.title}>{isNew ? '➕ 新建教程' : '✏️ 编辑教程'}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...s.btn, ...(showPreview ? s.btnGold : s.btnOutline) }} onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? '📝 编辑' : '👁 预览'}
            </button>
            <button style={{ ...s.btn, ...s.btnOutline }} onClick={() => setEditing(null)}>← 返回列表</button>
          </div>
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

          {showPreview ? (
            <div style={s.row}>
              <div>
                <label style={s.label}>中文预览</label>
                <div style={s.previewBox} dangerouslySetInnerHTML={{ __html: simpleMarkdownToHTML(editing.content_zh) }} />
              </div>
              <div>
                <label style={s.label}>EN Preview</label>
                <div style={s.previewBox} dangerouslySetInnerHTML={{ __html: simpleMarkdownToHTML(editing.content_en) }} />
              </div>
            </div>
          ) : (
            <div style={s.row}>
              <div>
                <label style={s.label}>正文（中文 Markdown）</label>
                <MarkdownToolbar field="content_zh" />
                <textarea style={s.textarea} data-field="content_zh" value={editing.content_zh} onChange={e => set('content_zh', e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Content (EN Markdown)</label>
                <MarkdownToolbar field="content_en" />
                <textarea style={s.textarea} data-field="content_en" value={editing.content_en} onChange={e => set('content_en', e.target.value)} />
              </div>
            </div>
          )}

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

  // ---- Login View ----
  if (!authed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #2D4A3F 0%, #1a2e26 100%)' }}>
        <div style={{ width: 400, padding: '48px 40px', background: 'rgba(255,255,255,0.06)', borderRadius: 24, backdropFilter: 'blur(20px)', border: '1px solid rgba(184,168,111,0.15)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 6, color: 'rgba(184,168,111,0.5)', marginBottom: 12, textTransform: 'uppercase' }}>ALPA TIPS</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#B8A86F', letterSpacing: 2, fontFamily: 'Georgia, serif' }}>管理后台</div>
            <div style={{ width: 40, height: 2, background: 'linear-gradient(to right, transparent, #B8A86F, transparent)', margin: '16px auto 0' }}></div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(184,168,111,0.7)', marginBottom: 8, letterSpacing: 1 }}>用户名</label>
            <input
              style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(184,168,111,0.2)', borderRadius: 10, fontSize: 15, color: '#e8e4dc', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              onFocus={e => e.target.style.borderColor = '#B8A86F'}
              onBlur={e => e.target.style.borderColor = 'rgba(184,168,111,0.2)'}
              placeholder="请输入用户名"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(184,168,111,0.7)', marginBottom: 8, letterSpacing: 1 }}>密码</label>
            <input
              type="password"
              style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(184,168,111,0.2)', borderRadius: 10, fontSize: 15, color: '#e8e4dc', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              onFocus={e => e.target.style.borderColor = '#B8A86F'}
              onBlur={e => e.target.style.borderColor = 'rgba(184,168,111,0.2)'}
              placeholder="请输入密码"
            />
          </div>
          {loginError && <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 16, textAlign: 'center', background: 'rgba(231,76,60,0.1)', padding: '8px 12px', borderRadius: 8 }}>{loginError}</div>}
          <button
            style={{ width: '100%', padding: '14px 0', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg, #B8A86F, #9a8a55)', color: '#fff', letterSpacing: 2, transition: 'opacity 0.2s', boxShadow: '0 4px 16px rgba(184,168,111,0.3)' }}
            onClick={handleLogin}
            onMouseOver={e => e.target.style.opacity = '0.9'}
            onMouseOut={e => e.target.style.opacity = '1'}
          >
            登 录
          </button>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'rgba(184,168,111,0.3)' }}>© 2026 大烤拉 · ALPA Tips CMS</div>
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
            {tip.is_published && (
              <button
                style={{ ...s.btn, background: '#8B6B3D', color: '#fff' }}
                onClick={() => sendPush(tip)}
                disabled={pushing === tip.id}
              >
                {pushing === tip.id ? '推送中...' : '🔔 发送推送'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
