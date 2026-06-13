import React, { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Input, Select, Tag, Button, Empty, Spin, Modal, Tabs, Pagination, message } from 'antd'
import { SearchOutlined, HeartOutlined, HeartFilled, BookOutlined } from '@ant-design/icons'
import type { Material } from '../../types'
import { materialService } from '../../services/materialService'

const categories = [
  { value: 'topic', label: '话题素材' },
  { value: 'sentence', label: '句型模板' },
  { value: 'transition', label: '过渡衔接' },
  { value: 'opening', label: '开头素材' },
  { value: 'closing', label: '结尾素材' },
]

const levels = [
  { value: 'cet4', label: '四级' },
  { value: 'cet6', label: '六级' },
]

const Material: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([])
  const [favoriteMaterials, setFavoriteMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [total, setTotal] = useState(0)
  const [favTotal, setFavTotal] = useState(0)

  const loadMaterials = useCallback(async (p?: number, ps?: number) => {
    const currentPage = p ?? page
    const currentPageSize = ps ?? pageSize
    setLoading(true)
    try {
      const [materialData, favData] = await Promise.all([
        materialService.getMaterials({
          category: categoryFilter || undefined,
          level: levelFilter || undefined,
          keyword: searchKeyword || undefined,
          page: currentPage,
          pageSize: currentPageSize,
        }),
        materialService.getFavorites().catch(() => []),
      ])
      const favIds = new Set((Array.isArray(favData) ? favData : []).map((m: Material) => m.id))
      const merged = (materialData.materials || []).map((m: Material) => ({
        ...m,
        isFavorite: favIds.has(m.id),
      }))
      setMaterials(merged)
      setTotal(materialData.total || 0)
    } catch {
      message.error('加载素材失败')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, levelFilter, searchKeyword, page, pageSize])

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true)
    try {
      const favData = await materialService.getFavorites()
      const favList = Array.isArray(favData) ? favData : []
      setFavoriteMaterials(favList.map((m: Material) => ({ ...m, isFavorite: true })))
      setFavTotal(favList.length)
    } catch {
      message.error('加载收藏失败')
    } finally {
      setFavoritesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMaterials(1)
    window.scrollTo(0, 0)
  }, [])

  const handleSearch = () => {
    setPage(1)
    loadMaterials(1)
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setPage(1)
    if (key === 'all') {
      setCategoryFilter('')
    } else if (key === 'favorite') {
      loadFavorites()
    } else {
      setCategoryFilter(key)
    }
  }

  useEffect(() => {
    if (activeTab === 'favorite') return
    setPage(1)
    loadMaterials(1)
  }, [categoryFilter, levelFilter])

  const toggleFavorite = async (materialId: string) => {
    const isCurrentFav = activeTab === 'favorite'
    const targetList = isCurrentFav ? favoriteMaterials : materials
    const setter = isCurrentFav ? setFavoriteMaterials : setMaterials
    const material = targetList.find((m) => m.id === materialId)
    if (!material) return
    const wasFavorite = material.isFavorite
    setter((prev: Material[]) =>
      prev.map((m) => (m.id === materialId ? { ...m, isFavorite: !wasFavorite } : m))
    )
    try {
      if (wasFavorite) {
        await materialService.removeFromFavorites(materialId)
      } else {
        await materialService.addToFavorites(materialId)
      }
      if (isCurrentFav) {
        setFavoriteMaterials((prev) => prev.filter((m) => m.id !== materialId))
        setFavTotal((prev) => prev - 1)
      }
    } catch {
      setter((prev: Material[]) =>
        prev.map((m) => (m.id === materialId ? { ...m, isFavorite: wasFavorite } : m))
      )
      message.error('操作失败')
    }
  }

  const handlePageChange = (p: number, ps: number) => {
    setPage(p)
    setPageSize(ps)
    if (activeTab === 'favorite') return
    loadMaterials(p, ps)
  }

  const displayMaterials = activeTab === 'favorite' ? favoriteMaterials : materials
  const displayTotal = activeTab === 'favorite' ? favTotal : total
  const displayLoading = activeTab === 'favorite' ? favoritesLoading : loading

  const renderMaterialCard = (material: Material) => (
    <Col xs={24} md={12} lg={8} xl={6} key={material.id}>
      <Card
        hoverable
        className="h-full border-0 card-shadow"
        styles={{ body: { padding: '1.5rem' } }}
        actions={[
          <Button
            key="favorite"
            type="text"
            icon={material.isFavorite ? <HeartFilled className="text-red-500" /> : <HeartOutlined />}
            onClick={() => toggleFavorite(material.id)}
          >
            {material.isFavorite ? '已收藏' : '收藏'}
          </Button>,
          <Button key="view" type="text" onClick={() => setSelectedMaterial(material)}>
            查看详情
          </Button>,
        ]}
      >
        <Tag color="blue" className="mb-3">
          {categories.find((c) => c.value === material.category)?.label || material.category}
        </Tag>
        <h3 className="text-lg font-semibold mb-3 line-clamp-2">{material.title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">{material.content}</p>
        <div className="flex flex-wrap gap-1">
          {(material.tags || []).slice(0, 3).map((tag) => (
            <Tag key={tag} className="text-xs">{tag}</Tag>
          ))}
        </div>
      </Card>
    </Col>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">素材学习</h1>
        <p className="text-gray-600">积累高分素材，告别模板化写作，提供可灵活拆解套用的优质素材</p>
      </div>

      <Card className="mb-6 border-0 card-shadow" styles={{ body: { padding: '1.5rem' } }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              size="large"
              placeholder="搜索素材关键词..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col>
            <Select
              size="large"
              placeholder="素材分类"
              style={{ width: 140 }}
              allowClear
              value={categoryFilter || undefined}
              onChange={(value) => setCategoryFilter(value || '')}
            >
              {categories.map((cat) => (
                <Select.Option key={cat.value} value={cat.value}>{cat.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              size="large"
              placeholder="级别筛选"
              style={{ width: 120 }}
              allowClear
              value={levelFilter || undefined}
              onChange={(value) => setLevelFilter(value || '')}
            >
              {levels.map((level) => (
                <Select.Option key={level.value} value={level.value}>{level.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button type="primary" size="large" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
          </Col>
        </Row>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className="mb-6"
        items={[
          { key: 'all', label: '全部素材', children: null },
          { key: 'favorite', label: '我的收藏', children: null },
          ...categories.map((cat) => ({ key: cat.value, label: cat.label, children: null })),
        ]}
      />

      <Spin spinning={displayLoading}>
        {displayMaterials.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>{displayMaterials.map(renderMaterialCard)}</Row>
            <div className="flex justify-center mt-8">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={displayTotal}
                onChange={handlePageChange}
                showSizeChanger
                showTotal={(t) => `共 ${t} 条`}
                pageSizeOptions={['8', '16', '24', '32']}
              />
            </div>
          </>
        ) : (
          <Empty
            image={<BookOutlined className="text-6xl text-gray-300" />}
            description={activeTab === 'favorite' ? '暂无收藏素材' : '未找到相关素材'}
          />
        )}
      </Spin>

      <Modal
        title={selectedMaterial?.title}
        open={!!selectedMaterial}
        onCancel={() => setSelectedMaterial(null)}
        footer={null}
        width={800}
      >
        {selectedMaterial && (
          <div className="space-y-4">
            <Tag color="blue">{categories.find((c) => c.value === selectedMaterial.category)?.label}</Tag>
            {selectedMaterial.level && <Tag>{selectedMaterial.level === 'cet4' ? '四级' : '六级'}</Tag>}
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedMaterial.content}</p>
            {selectedMaterial.translation && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-700">参考翻译</h4>
                <p className="text-gray-600">{selectedMaterial.translation}</p>
              </div>
            )}
            {selectedMaterial.usageScenario && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-700">适用场景</h4>
                <p className="text-gray-700">{selectedMaterial.usageScenario}</p>
              </div>
            )}
            {selectedMaterial.tips && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-yellow-700">使用提示</h4>
                <p className="text-gray-700">{selectedMaterial.tips}</p>
              </div>
            )}
            {selectedMaterial.tags && selectedMaterial.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedMaterial.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Material
