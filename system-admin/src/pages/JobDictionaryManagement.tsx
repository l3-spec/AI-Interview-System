import React, { useEffect, useMemo, useState } from 'react';
import {
  JobDictionaryCategory,
  JobDictionaryPosition,
  jobDictionaryApi,
  PaginationResult,
} from '../services/api';

type CategoryFormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

type PositionFormState = {
  id?: string;
  categoryId: string;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  tags: string;
};

const emptyCategoryForm = (): CategoryFormState => ({
  code: '',
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true,
});

const emptyPositionForm = (categoryId: string): PositionFormState => ({
  categoryId,
  code: '',
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true,
  tags: '',
});

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

const JobDictionaryManagement: React.FC = () => {
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryKeyword, setCategoryKeyword] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize] = useState(10);
  const [categoryResult, setCategoryResult] = useState<PaginationResult<JobDictionaryCategory>>({
    list: [],
    total: 0,
    page: 1,
    pageSize: categoryPageSize,
  });

  const [positionKeyword, setPositionKeyword] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<JobDictionaryCategory | null>(null);
  const [positions, setPositions] = useState<JobDictionaryPosition[]>([]);
  const [positionLoading, setPositionLoading] = useState(false);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm());
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [positionForm, setPositionForm] = useState<PositionFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategories = async (page = categoryPage, keyword = categoryKeyword) => {
    setCategoryLoading(true);
    try {
      const response = await jobDictionaryApi.getCategories({
        page,
        pageSize: categoryPageSize,
        keyword: keyword || undefined,
        includeInactive: true,
      });
      if (response.success && response.data) {
        setCategoryResult(response.data);
        if (!selectedCategoryId && response.data.list.length > 0) {
          handleSelectCategory(response.data.list[0].id);
        }
      }
    } catch (error) {
      console.error('获取职岗分类失败', error);
    } finally {
      setCategoryLoading(false);
    }
  };

  const loadCategoryDetail = async (categoryId: string) => {
    setPositionLoading(true);
    try {
      const response = await jobDictionaryApi.getCategoryDetail(categoryId);
      if (response.success && response.data) {
        setSelectedCategory(response.data);
        setPositions(response.data.positions || []);
      }
    } catch (error) {
      console.error('获取职岗分类详情失败', error);
      setSelectedCategory(null);
      setPositions([]);
    } finally {
      setPositionLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryPage]);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    loadCategoryDetail(categoryId);
  };

  const handleOpenCategoryForm = (category?: JobDictionaryCategory) => {
    if (category) {
      setCategoryForm({
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description || '',
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      });
    } else {
      setCategoryForm(emptyCategoryForm());
    }
    setFormError(null);
    setShowCategoryForm(true);
  };

  const handleOpenPositionForm = (position?: JobDictionaryPosition) => {
    if (!selectedCategoryId && !position?.categoryId) {
      alert('请先选择一个分类');
      return;
    }

    if (position) {
      setPositionForm({
        id: position.id,
        categoryId: position.categoryId,
        code: position.code,
        name: position.name,
        description: position.description || '',
        sortOrder: position.sortOrder,
        isActive: position.isActive,
        tags: position.tags.join(', '),
      });
    } else {
      setPositionForm(emptyPositionForm(position?.categoryId || selectedCategoryId!));
    }
    setFormError(null);
    setShowPositionForm(true);
  };

  const submitCategoryForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    try {
      const payload = {
        code: categoryForm.code.trim(),
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        sortOrder: Number.isFinite(categoryForm.sortOrder) ? categoryForm.sortOrder : 0,
        isActive: categoryForm.isActive,
      };

      if (!payload.code || !payload.name) {
        setFormError('请填写完整的编码和名称');
        return;
      }

      let response;
      if (categoryForm.id) {
        response = await jobDictionaryApi.updateCategory(categoryForm.id, payload);
      } else {
        response = await jobDictionaryApi.createCategory(payload);
      }

      if (response.success) {
        setShowCategoryForm(false);
        await loadCategories();
        if (categoryForm.id) {
          await loadCategoryDetail(categoryForm.id);
        }
        alert('分类保存成功');
      } else {
        setFormError(response.message || '保存失败');
      }
    } catch (error: any) {
      console.error('保存分类失败', error);
      setFormError(error?.response?.data?.message || '保存分类失败，请稍后再试');
    }
  };

  const submitPositionForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!positionForm) {
      return;
    }
    setFormError(null);

    const tags = positionForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      const payload = {
        categoryId: positionForm.categoryId,
        code: positionForm.code.trim(),
        name: positionForm.name.trim(),
        description: positionForm.description.trim() || null,
        sortOrder: Number.isFinite(positionForm.sortOrder) ? positionForm.sortOrder : 0,
        isActive: positionForm.isActive,
        tags,
      };

      if (!payload.categoryId || !payload.code || !payload.name) {
        setFormError('请填写完整的分类、编码和名称');
        return;
      }

      let response;
      if (positionForm.id) {
        response = await jobDictionaryApi.updatePosition(positionForm.id, payload);
      } else {
        response = await jobDictionaryApi.createPosition(payload);
      }

      if (response.success) {
        setShowPositionForm(false);
        if (payload.categoryId === selectedCategoryId) {
          await loadCategoryDetail(payload.categoryId);
        } else if (selectedCategoryId) {
          await loadCategoryDetail(selectedCategoryId);
        }
        await loadCategories(categoryPage);
        alert('职岗保存成功');
      } else {
        setFormError(response.message || '保存失败');
      }
    } catch (error: any) {
      console.error('保存职岗失败', error);
      setFormError(error?.response?.data?.message || '保存职岗失败，请稍后再试');
    }
  };

  const handleDeleteCategory = async (category: JobDictionaryCategory) => {
    if (!window.confirm(`确认删除分类「${category.name}」？该操作会移除该分类下的所有职岗。`)) {
      return;
    }
    try {
      const response = await jobDictionaryApi.deleteCategory(category.id);
      if (response.success) {
        alert('分类删除成功');
        if (selectedCategoryId === category.id) {
          setSelectedCategoryId(null);
          setSelectedCategory(null);
          setPositions([]);
        }
        await loadCategories();
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error: any) {
      console.error('删除分类失败', error);
      alert(error?.response?.data?.message || '删除分类失败，请稍后再试');
    }
  };

  const handleToggleCategoryStatus = async (category: JobDictionaryCategory) => {
    try {
      const response = await jobDictionaryApi.updateCategory(category.id, {
        isActive: !category.isActive,
      });
      if (response.success) {
        await loadCategories(categoryPage);
        if (selectedCategoryId === category.id) {
          await loadCategoryDetail(category.id);
        }
      } else {
        alert(response.message || '更新状态失败');
      }
    } catch (error: any) {
      console.error('更新分类状态失败', error);
      alert(error?.response?.data?.message || '更新状态失败，请稍后再试');
    }
  };

  const handleDeletePosition = async (position: JobDictionaryPosition) => {
    if (!window.confirm(`确认删除职岗「${position.name}」吗？`)) {
      return;
    }
    try {
      const response = await jobDictionaryApi.deletePosition(position.id);
      if (response.success) {
        alert('职岗删除成功');
        if (selectedCategoryId) {
          await loadCategoryDetail(selectedCategoryId);
        }
        await loadCategories(categoryPage);
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error: any) {
      console.error('删除职岗失败', error);
      alert(error?.response?.data?.message || '删除职岗失败，请稍后再试');
    }
  };

  const handleTogglePositionStatus = async (position: JobDictionaryPosition) => {
    try {
      const response = await jobDictionaryApi.updatePosition(position.id, {
        isActive: !position.isActive,
      });
      if (response.success) {
        if (selectedCategoryId) {
          await loadCategoryDetail(selectedCategoryId);
        }
        await loadCategories(categoryPage);
      } else {
        alert(response.message || '更新状态失败');
      }
    } catch (error: any) {
      console.error('更新职岗状态失败', error);
      alert(error?.response?.data?.message || '更新状态失败，请稍后再试');
    }
  };

  const filteredPositions = useMemo(() => {
    if (!positionKeyword.trim()) {
      return positions;
    }
    const keyword = positionKeyword.trim().toLowerCase();
    return positions.filter((position) => {
      return (
        position.name.toLowerCase().includes(keyword) ||
        position.code.toLowerCase().includes(keyword) ||
        position.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    });
  }, [positions, positionKeyword]);

  const renderPagination = (total: number, page: number, pageSize: number, onChange: (target: number) => void) => {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) {
      return null;
    }
    return (
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>
          第 {page} / {totalPages} 页，共 {total} 条
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{ ...buttonStyle, background: '#f5f5f5', color: '#666' }}
            disabled={page <= 1}
            onClick={() => onChange(Math.max(1, page - 1))}
          >
            上一页
          </button>
          <button
            style={{ ...buttonStyle, background: '#1890ff', color: '#fff' }}
            disabled={page >= totalPages}
            onClick={() => onChange(Math.min(totalPages, page + 1))}
          >
            下一页
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <SectionCard
        title="职岗分类"
        action={
          <button
            style={{ ...buttonStyle, background: '#1890ff', color: '#fff' }}
            onClick={() => handleOpenCategoryForm()}
          >
            + 新建分类
          </button>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="搜索分类名称或编码"
            value={categoryKeyword}
            onChange={(event) => setCategoryKeyword(event.target.value)}
            style={{ ...inputStyle, maxWidth: '240px', marginTop: 0 }}
          />
          <button
            style={{ ...buttonStyle, background: '#1890ff', color: '#fff' }}
            onClick={() => loadCategories(1, categoryKeyword)}
            disabled={categoryLoading}
          >
            搜索
          </button>
          <button
            style={{ ...buttonStyle, background: '#f5f5f5', color: '#666' }}
            onClick={() => {
              setCategoryKeyword('');
              loadCategories(1, '');
            }}
            disabled={categoryLoading}
          >
            重置
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>名称</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>编码</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>状态</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>排序</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>职岗数</th>
                <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #f0f0f0' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {categoryLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    正在加载分类...
                  </td>
                </tr>
              ) : categoryResult.list.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无分类数据
                  </td>
                </tr>
              ) : (
                categoryResult.list.map((category) => {
                  const isActive = category.id === selectedCategoryId;
                  return (
                    <tr
                      key={category.id}
                      style={{
                        background: isActive ? '#e6f7ff' : '#fff',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSelectCategory(category.id)}
                    >
                      <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>{category.name}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>{category.code}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            background: category.isActive ? 'rgba(82, 196, 26, 0.15)' : 'rgba(0,0,0,0.08)',
                            color: category.isActive ? '#52c41a' : '#8c8c8c',
                          }}
                        >
                          {category.isActive ? '启用' : '停用'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>{category.sortOrder}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                        {Array.isArray(category.positions) ? category.positions.length : '-'}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                        <button
                          style={{ ...buttonStyle, background: '#fff', color: '#1890ff', border: '1px solid #1890ff', marginRight: '8px' }}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenCategoryForm(category);
                          }}
                        >
                          编辑
                        </button>
                        <button
                          style={{ ...buttonStyle, background: '#fff', color: '#fa8c16', border: '1px solid #fa8c16', marginRight: '8px' }}
                          onClick={async (event) => {
                            event.stopPropagation();
                            await handleToggleCategoryStatus(category);
                          }}
                        >
                          {category.isActive ? '停用' : '启用'}
                        </button>
                        <button
                          style={{ ...buttonStyle, background: '#fff', color: '#ff4d4f', border: '1px solid #ff4d4f' }}
                          onClick={async (event) => {
                            event.stopPropagation();
                            await handleDeleteCategory(category);
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(categoryResult.total, categoryResult.page, categoryResult.pageSize, (target) => {
          setCategoryPage(target);
          loadCategories(target);
        })}
      </SectionCard>

      <SectionCard
        title={`职岗列表${selectedCategory ? ` · ${selectedCategory.name}` : ''}`}
        action={
          <button
            style={{ ...buttonStyle, background: '#52c41a', color: '#fff' }}
            onClick={() => handleOpenPositionForm()}
            disabled={!selectedCategoryId}
          >
            + 新建职岗
          </button>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="搜索职岗名称、编码或标签"
            value={positionKeyword}
            onChange={(event) => setPositionKeyword(event.target.value)}
            style={{ ...inputStyle, maxWidth: '300px', marginTop: 0 }}
            disabled={!selectedCategoryId}
          />
          <button
            style={{ ...buttonStyle, background: '#f5f5f5', color: '#666' }}
            onClick={() => setPositionKeyword('')}
            disabled={!selectedCategoryId}
          >
            重置
          </button>
        </div>

        {!selectedCategoryId ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>请先选择一个分类以查看职岗</div>
        ) : positionLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>正在加载职岗...</div>
        ) : filteredPositions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>暂无职岗数据</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {filteredPositions.map((position) => (
              <div
                key={position.id}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f1f1f', marginBottom: '4px' }}>{position.name}</div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{position.code}</div>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: position.isActive ? 'rgba(82, 196, 26, 0.15)' : 'rgba(0,0,0,0.08)',
                      color: position.isActive ? '#52c41a' : '#8c8c8c',
                    }}
                  >
                    {position.isActive ? '启用' : '停用'}
                  </span>
                </div>
                {position.description && (
                  <p style={{ fontSize: '13px', color: '#595959', lineHeight: 1.5 }}>{position.description}</p>
                )}
                {position.tags.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {position.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: '#f0f5ff',
                          color: '#2f54eb',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...buttonStyle, flex: 1, background: '#fff', color: '#1890ff', border: '1px solid #1890ff' }}
                    onClick={() => handleOpenPositionForm(position)}
                  >
                    编辑
                  </button>
                  <button
                    style={{ ...buttonStyle, flex: 1, background: '#fff', color: '#fa8c16', border: '1px solid #fa8c16' }}
                    onClick={() => handleTogglePositionStatus(position)}
                  >
                    {position.isActive ? '停用' : '启用'}
                  </button>
                  <button
                    style={{ ...buttonStyle, flex: 1, background: '#fff', color: '#ff4d4f', border: '1px solid #ff4d4f' }}
                    onClick={() => handleDeletePosition(position)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showCategoryForm && (
        <div style={formContainerStyle} onClick={() => setShowCategoryForm(false)}>
          <div
            style={modalStyle}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{categoryForm.id ? '编辑分类' : '新建分类'}</h3>
            <form onSubmit={submitCategoryForm}>
              <label style={labelStyle}>
                名称
                <input
                  style={inputStyle}
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                />
              </label>
              <label style={labelStyle}>
                编码
                <input
                  style={inputStyle}
                  value={categoryForm.code}
                  onChange={(event) => setCategoryForm({ ...categoryForm, code: event.target.value })}
                />
              </label>
              <label style={labelStyle}>
                描述
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  value={categoryForm.description}
                  onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
                />
              </label>
              <label style={labelStyle}>
                排序
                <input
                  type="number"
                  style={inputStyle}
                  value={categoryForm.sortOrder}
                  onChange={(event) =>
                    setCategoryForm({ ...categoryForm, sortOrder: Number(event.target.value) || 0 })
                  }
                />
              </label>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.checked })}
                />
                启用该分类
              </label>
              {formError && <div style={{ color: '#ff4d4f', marginBottom: '12px', fontSize: '13px' }}>{formError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  style={{ ...buttonStyle, background: '#f5f5f5', color: '#666' }}
                  onClick={() => setShowCategoryForm(false)}
                >
                  取消
                </button>
                <button type="submit" style={{ ...buttonStyle, background: '#1890ff', color: '#fff' }}>
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPositionForm && positionForm && (
        <div style={formContainerStyle} onClick={() => setShowPositionForm(false)}>
          <div
            style={modalStyle}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{positionForm.id ? '编辑职岗' : '新建职岗'}</h3>
            <form onSubmit={submitPositionForm}>
              <label style={labelStyle}>
                所属分类
                <select
                  style={inputStyle}
                  value={positionForm.categoryId}
                  onChange={(event) =>
                    setPositionForm({
                      ...positionForm,
                      categoryId: event.target.value,
                    })
                  }
                >
                  {categoryResult.list.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                名称
                <input
                  style={inputStyle}
                  value={positionForm.name}
                  onChange={(event) => setPositionForm({ ...positionForm, name: event.target.value })}
                />
              </label>
              <label style={labelStyle}>
                编码
                <input
                  style={inputStyle}
                  value={positionForm.code}
                  onChange={(event) => setPositionForm({ ...positionForm, code: event.target.value })}
                />
              </label>
              <label style={labelStyle}>
                描述
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  value={positionForm.description}
                  onChange={(event) => setPositionForm({ ...positionForm, description: event.target.value })}
                />
              </label>
              <label style={labelStyle}>
                排序
                <input
                  type="number"
                  style={inputStyle}
                  value={positionForm.sortOrder}
                  onChange={(event) =>
                    setPositionForm({ ...positionForm, sortOrder: Number(event.target.value) || 0 })
                  }
                />
              </label>
              <label style={labelStyle}>
                标签（用逗号分隔）
                <input
                  style={inputStyle}
                  value={positionForm.tags}
                  onChange={(event) => setPositionForm({ ...positionForm, tags: event.target.value })}
                />
              </label>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={positionForm.isActive}
                  onChange={(event) => setPositionForm({ ...positionForm, isActive: event.target.checked })}
                />
                启用该职岗
              </label>
              {formError && <div style={{ color: '#ff4d4f', marginBottom: '12px', fontSize: '13px' }}>{formError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  style={{ ...buttonStyle, background: '#f5f5f5', color: '#666' }}
                  onClick={() => setShowPositionForm(false)}
                >
                  取消
                </button>
                <button type="submit" style={{ ...buttonStyle, background: '#52c41a', color: '#fff' }}>
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDictionaryManagement;
