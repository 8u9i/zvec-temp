'use client'

import { useState, useCallback } from 'react'

// Types
interface Document {
  id: string
  vector: number[]
  metadata?: Record<string, unknown>
}

interface SearchResult {
  id: string
  score: number
  metadata?: Record<string, unknown>
}

interface CollectionInfo {
  name: string
  dimension: number
  document_count: number
  data_path: string
}

// API base URL - can be configured
const DEFAULT_API_URL = 'http://localhost:8000'

export default function Home() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [activeTab, setActiveTab] = useState<'insert' | 'search' | 'docs'>('insert')
  const [dimension, setDimension] = useState(128)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Insert form state
  const [insertVector, setInsertVector] = useState('')
  const [insertMetadata, setInsertMetadata] = useState('')

  // Search form state
  const [searchVector, setSearchVector] = useState('')
  const [searchTopK, setSearchTopK] = useState(10)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  // Collection info
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null)

  // Generic API call helper
  const apiCall = useCallback(async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> => {
    setLoading(true)
    setStatus(null)
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }
      return await response.json()
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' })
      return null
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  // Health check
  const checkHealth = useCallback(async () => {
    const result = await apiCall<{ status: string; collection: string; document_count: number }>('/health')
    if (result) {
      setStatus({ type: 'success', message: `Connected! Collection: ${result.collection}, Documents: ${result.document_count}` })
    }
  }, [apiCall])

  // Get collection info
  const fetchCollectionInfo = useCallback(async () => {
    const result = await apiCall<CollectionInfo>('/collection/info')
    if (result) {
      setCollectionInfo(result)
      setDimension(result.dimension)
    }
  }, [apiCall])

  // Insert document
  const handleInsert = useCallback(async () => {
    let vector: number[]
    try {
      vector = JSON.parse(insertVector)
      if (!Array.isArray(vector)) throw new Error('Vector must be an array')
    } catch {
      setStatus({ type: 'error', message: 'Invalid vector format. Use JSON array like [0.1, 0.2, ...]' })
      return
    }

    let metadata: Record<string, unknown> | undefined
    if (insertMetadata.trim()) {
      try {
        metadata = JSON.parse(insertMetadata)
      } catch {
        setStatus({ type: 'error', message: 'Invalid metadata format. Use JSON object' })
        return
      }
    }

    const result = await apiCall<{ id: string; status: string }>('/documents', {
      method: 'POST',
      body: JSON.stringify({ vector, metadata }),
    })
    if (result) {
      setStatus({ type: 'success', message: `Document inserted with ID: ${result.id}` })
      setInsertVector('')
      setInsertMetadata('')
      fetchCollectionInfo()
    }
  }, [apiCall, insertVector, insertMetadata, fetchCollectionInfo])

  // Generate random vector
  const generateRandomVector = useCallback(() => {
    const vector = Array.from({ length: dimension }, () => Math.random())
    setInsertVector(JSON.stringify(vector.map(v => parseFloat(v.toFixed(4)))))
  }, [dimension])

  // Search documents
  const handleSearch = useCallback(async () => {
    let vector: number[]
    try {
      vector = JSON.parse(searchVector)
      if (!Array.isArray(vector)) throw new Error('Vector must be an array')
    } catch {
      setStatus({ type: 'error', message: 'Invalid vector format. Use JSON array like [0.1, 0.2, ...]' })
      return
    }

    const result = await apiCall<SearchResult[]>('/search', {
      method: 'POST',
      body: JSON.stringify({ vector, top_k: searchTopK }),
    })
    if (result) {
      setSearchResults(result)
      setStatus({ type: 'info', message: `Found ${result.length} results` })
    }
  }, [apiCall, searchVector, searchTopK])

  // Delete document
  const handleDelete = useCallback(async (id: string) => {
    const result = await apiCall<{ status: string }>(`/documents/${id}`, { method: 'DELETE' })
    if (result) {
      setStatus({ type: 'success', message: `Document ${id} deleted` })
      fetchCollectionInfo()
    }
  }, [apiCall, fetchCollectionInfo])

  // Clear collection
  const handleClearCollection = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all documents?')) return
    const result = await apiCall<{ status: string }>('/collection', { method: 'DELETE' })
    if (result) {
      setStatus({ type: 'success', message: 'Collection cleared' })
      setCollectionInfo(null)
      setSearchResults([])
    }
  }, [apiCall])

  // Generate random search vector
  const generateRandomSearchVector = useCallback(() => {
    const vector = Array.from({ length: dimension }, () => Math.random())
    setSearchVector(JSON.stringify(vector.map(v => parseFloat(v.toFixed(4)))))
  }, [dimension])

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      flexWrap: 'wrap' as const,
      gap: '16px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 600,
      color: '#1a1a1a',
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      padding: '20px',
      marginBottom: '16px',
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#1a1a1a',
      marginBottom: '12px',
    },
    button: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#1a1a1a',
      backgroundColor: 'transparent',
      border: '2px solid #1a1a1a',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    buttonPrimary: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#ffffff',
      backgroundColor: '#1a1a1a',
      border: '2px solid #1a1a1a',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    buttonSmall: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: 500,
      color: '#1a1a1a',
      backgroundColor: 'transparent',
      border: '1px solid #1a1a1a',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    buttonDanger: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: 500,
      color: '#dc2626',
      backgroundColor: 'transparent',
      border: '1px solid #dc2626',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '1px solid #d0d0d0',
      borderRadius: '6px',
      backgroundColor: '#fafafa',
      outline: 'none',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      fontFamily: 'monospace',
      border: '1px solid #d0d0d0',
      borderRadius: '6px',
      backgroundColor: '#fafafa',
      outline: 'none',
      resize: 'vertical' as const,
      minHeight: '100px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: '#666',
      marginBottom: '6px',
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      marginBottom: '20px',
      borderBottom: '1px solid #e0e0e0',
      paddingBottom: '12px',
    },
    tab: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#666',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: '2px solid transparent',
      cursor: 'pointer',
    },
    tabActive: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#1a1a1a',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: '2px solid #1a1a1a',
      cursor: 'pointer',
    },
    status: {
      padding: '12px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      marginBottom: '16px',
    },
    statusSuccess: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    },
    statusError: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    },
    statusInfo: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      border: '1px solid #93c5fd',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
    },
    flexRow: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      fontSize: '12px',
      fontWeight: 500,
      backgroundColor: '#e5e5e5',
      borderRadius: '12px',
      color: '#333',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '14px',
    },
    th: {
      textAlign: 'left' as const,
      padding: '12px',
      borderBottom: '2px solid #e0e0e0',
      fontWeight: 600,
      color: '#333',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e0e0e0',
      color: '#555',
    },
    code: {
      fontFamily: 'monospace',
      fontSize: '13px',
      backgroundColor: '#f0f0f0',
      padding: '2px 6px',
      borderRadius: '3px',
    },
    spinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid #e0e0e0',
      borderTopColor: '#1a1a1a',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>⚡ Zvec Vector Database</h1>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            Lightweight, lightning-fast vector database
          </p>
        </div>
        <div style={styles.flexRow}>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="API URL"
            style={{ ...styles.input, width: '250px' }}
          />
          <button
            onClick={() => { checkHealth(); fetchCollectionInfo(); }}
            style={styles.button}
            disabled={loading}
          >
            {loading ? '...' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div style={{
          ...styles.status,
          ...(status.type === 'success' ? styles.statusSuccess : status.type === 'error' ? styles.statusError : styles.statusInfo)
        }}>
          {status.message}
        </div>
      )}

      {/* Collection Info */}
      {collectionInfo && (
        <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={styles.flexRow}>
            <span style={styles.badge}>Collection: {collectionInfo.name}</span>
            <span style={styles.badge}>Dimension: {collectionInfo.dimension}</span>
            <span style={styles.badge}>Documents: {collectionInfo.document_count}</span>
          </div>
          <button onClick={handleClearCollection} style={styles.buttonDanger}>
            Clear All
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('insert')}
          style={activeTab === 'insert' ? styles.tabActive : styles.tab}
        >
          Insert
        </button>
        <button
          onClick={() => setActiveTab('search')}
          style={activeTab === 'search' ? styles.tabActive : styles.tab}
        >
          Search
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          style={activeTab === 'docs' ? styles.tabActive : styles.tab}
        >
          Documents
        </button>
      </div>

      {/* Insert Tab */}
      {activeTab === 'insert' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Insert Document</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={styles.label}>
                Vector (JSON array, {dimension} dimensions)
              </label>
              <textarea
                value={insertVector}
                onChange={(e) => setInsertVector(e.target.value)}
                placeholder={`[${Array(dimension).fill(0).map(() => '0.0').join(', ')}]`}
                style={styles.textarea}
              />
              <div style={{ marginTop: '8px' }}>
                <button onClick={generateRandomVector} style={styles.buttonSmall}>
                  Generate Random
                </button>
              </div>
            </div>
            <div>
              <label style={styles.label}>Metadata (JSON object, optional)</label>
              <textarea
                value={insertMetadata}
                onChange={(e) => setInsertMetadata(e.target.value)}
                placeholder='{"title": "Example", "category": "test"}'
                style={{ ...styles.textarea, minHeight: '60px' }}
              />
            </div>
            <div>
              <button
                onClick={handleInsert}
                style={styles.buttonPrimary}
                disabled={loading || !insertVector.trim()}
              >
                {loading ? 'Inserting...' : 'Insert Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Vector Search</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={styles.label}>
                Query Vector (JSON array, {dimension} dimensions)
              </label>
              <textarea
                value={searchVector}
                onChange={(e) => setSearchVector(e.target.value)}
                placeholder={`[${Array(dimension).fill(0).map(() => '0.0').join(', ')}]`}
                style={styles.textarea}
              />
              <div style={{ marginTop: '8px' }}>
                <button onClick={generateRandomSearchVector} style={styles.buttonSmall}>
                  Generate Random
                </button>
              </div>
            </div>
            <div style={styles.flexRow}>
              <div>
                <label style={styles.label}>Top K Results</label>
                <input
                  type="number"
                  value={searchTopK}
                  onChange={(e) => setSearchTopK(parseInt(e.target.value) || 10)}
                  min={1}
                  max={1000}
                  style={{ ...styles.input, width: '100px' }}
                />
              </div>
              <button
                onClick={handleSearch}
                style={styles.buttonPrimary}
                disabled={loading || !searchVector.trim()}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ ...styles.cardTitle, marginBottom: '12px' }}>Results ({searchResults.length})</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Rank</th>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Score</th>
                      <th style={styles.th}>Metadata</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((result, index) => (
                      <tr key={result.id}>
                        <td style={styles.td}>#{index + 1}</td>
                        <td style={styles.td}><code style={styles.code}>{result.id}</code></td>
                        <td style={styles.td}>{result.score.toFixed(6)}</td>
                        <td style={styles.td}>
                          {result.metadata ? (
                            <code style={styles.code}>{JSON.stringify(result.metadata)}</code>
                          ) : '-'}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleDelete(result.id)}
                            style={styles.buttonDanger}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'docs' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Document Management</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            Use the Search tab to find documents by vector similarity. For large collections,
            searching with a random vector will return the nearest neighbors.
          </p>
          <div style={styles.grid}>
            <div style={{ ...styles.card, backgroundColor: '#fafafa', margin: 0 }}>
              <h4 style={{ ...styles.cardTitle, fontSize: '14px' }}>Quick Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => { generateRandomSearchVector(); setActiveTab('search'); }}
                  style={styles.button}
                >
                  Search with Random Vector
                </button>
                <button
                  onClick={handleClearCollection}
                  style={styles.buttonDanger}
                >
                  Clear All Documents
                </button>
              </div>
            </div>
            <div style={{ ...styles.card, backgroundColor: '#fafafa', margin: 0 }}>
              <h4 style={{ ...styles.cardTitle, fontSize: '14px' }}>API Endpoints</h4>
              <div style={{ fontSize: '13px', color: '#555', fontFamily: 'monospace' }}>
                <p>POST /documents - Insert document</p>
                <p>POST /search - Search vectors</p>
                <p>GET /collection/info - Get stats</p>
                <p>DELETE /documents/:id - Delete doc</p>
                <p>GET /docs - API documentation</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '32px', color: '#999', fontSize: '13px' }}>
        <p>
          <a href="https://github.com/alibaba/zvec" target="_blank" rel="noopener noreferrer"
            style={{ color: '#666', textDecoration: 'none' }}>
            Zvec
          </a>
          {' '}by Alibaba • Powered by Proxima
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        button:hover:not(:disabled) {
          opacity: 0.85;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        input:focus, textarea:focus {
          border-color: #1a1a1a;
        }
      `}</style>
    </div>
  )
}
