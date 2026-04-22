import React, { useEffect, useState } from 'react';
import {
  RegionDictionaryItem,
  regionDictionaryApi,
} from '../services/api';

const formContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
};

const modalStyle: React.CSSProperties = {
  width: '520px',
  maxWidth: '90%',
  background: '#fff',
  borderRadius: '8px',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
  padding: '24px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '4px',
  border: '1px solid #d9d9d9',
  marginTop: '6px',
  fontSize: '14px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '12px',
  fontSize: '14px',
  color: '#333',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
};

const SectionCard: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  action,
  children,
}) => (
  <div
    style={{
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
      padding: '20px',
      marginBottom: '24px',
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <h2 style={{ margin: 0, fontSize: '18px', color: '#1f1f1f' }}>{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const RegionDictionaryManagement: React.FC = () => {
  const [regions, setRegions] = useState<RegionDictionaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<RegionDictionaryItem>>({});
  const [parentName, setParentName] = useState<string>('');

  const loadRegions = async () => {
    setLoading(true);
    try {
      const response = await regionDictionaryApi.getRegionTree();
      if (response.success && response.data) {
        setRegions(response.data);
      }
    } catch (error) {
      console.error('加载地区失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegions();
  }, []);

  const handleOpenForm = (region?: RegionDictionaryItem, parent?: RegionDictionaryItem) => {
    if (region) {
      setFormData({ ...region });
      setParentName(parent ? parent.name : '无');
    } else {
      setFormData({
        name: '',
        code: '',
        level: parent ? parent.level + 1 : 1,
        parentId: parent ? parent.id : null,
        sortOrder: 0,
        isActive: true,
      });
      setParentName(parent ? parent.name : '无');
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let response;
      if (formData.id) {
        response = await regionDictionaryApi.updateRegion(formData.id, formData);
      } else {
        response = await regionDictionaryApi.createRegion(formData);
      }
      if (response.success) {
        setShowForm(false);
        loadRegions();
      }
    } catch (error) {
      console.error('保存地区失败', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除个地区吗？如果有子地区也会受到影响。')) {
      try {
        const response = await regionDictionaryApi.deleteRegion(id);
        if (response.success) {
          loadRegions();
        }
      } catch (error) {
        console.error('删除地区失败', error);
      }
    }
  };

  const renderRegionRow = (region: RegionDictionaryItem, depth: number = 0) => {
    return (
      <React.Fragment key={region.id}>
        <tr>
          <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', paddingLeft: `${depth * 20 + 10}px` }}>
            {region.children && region.children.length > 0 ? '📂 ' : '📍 '}
            {region.name}
          </td>
          <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>{region.code}</td>
          <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>层级 {region.level}</td>
          <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>{region.sortOrder}</td>
          <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '12px',
              background: region.isActive ? '#e6f7ff' : '#f5f5f5',
              color: region.isActive ? '#1890ff' : '#999'
            }}>
              {region.isActive ? '启用' : '禁用'}
            </span>
          </td>
          <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
            {region.level < 3 && (
              <button 
                style={{ ...buttonStyle, background: 'none', color: '#1890ff', marginRight: '8px' }}
                onClick={() => handleOpenForm(undefined, region)}
              >
                添加子级
              </button>
            )}
            <button 
              style={{ ...buttonStyle, background: 'none', color: '#1890ff', marginRight: '8px' }}
              onClick={() => handleOpenForm(region)}
            >
              编辑
            </button>
            <button 
              style={{ ...buttonStyle, background: 'none', color: '#ff4d4f' }}
              onClick={() => handleDelete(region.id)}
            >
              删除
            </button>
          </td>
        </tr>
        {region.children?.map(child => renderRegionRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div>
      <SectionCard 
        title="地区字典管理" 
        action={
          <button 
            style={{ ...buttonStyle, background: '#1890ff', color: '#fff' }}
            onClick={() => handleOpenForm()}
          >
            + 新增一级地区
          </button>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>名称</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>编码</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>层级</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>排序</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>状态</th>
                <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>加载中...</td></tr>
              ) : regions.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>暂无数据</td></tr>
              ) : (
                regions.map(region => renderRegionRow(region))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {showForm && (
        <div style={formContainerStyle} onClick={() => setShowForm(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3>{formData.id ? '编辑地区' : '新增地区'}</h3>
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: '14px', color: '#666' }}>父级地区: {parentName}</p>
              <label style={labelStyle}>
                名称
                <input 
                  style={inputStyle} 
                  value={formData.name || ''} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required
                />
              </label>
              <label style={labelStyle}>
                编码
                <input 
                  style={inputStyle} 
                  value={formData.code || ''} 
                  onChange={e => setFormData({ ...formData, code: e.target.value })} 
                />
              </label>
              <label style={labelStyle}>
                排序
                <input 
                  type="number" 
                  style={inputStyle} 
                  value={formData.sortOrder || 0} 
                  onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })} 
                />
              </label>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })} 
                />
                启用
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" style={{ ...buttonStyle, background: '#f5f5f5' }} onClick={() => setShowForm(false)}>取消</button>
                <button type="submit" style={{ ...buttonStyle, background: '#1890ff', color: '#fff' }}>保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionDictionaryManagement;
