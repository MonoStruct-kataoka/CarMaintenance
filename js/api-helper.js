// API Helper - すべてのAPI呼び出しに使用
const API_BASE = '/api';

// APIリクエストのラッパー関数
async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/${endpoint}`;
    
    try {
        const response = await fetch(url, options);
        
        // レスポンスが204 No Contentの場合
        if (response.status === 204) {
            return null;
        }
        
        // エラーレスポンスの場合
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// GET リクエスト
async function apiGet(endpoint) {
    return apiRequest(endpoint, {
        method: 'GET'
    });
}

// POST リクエスト
async function apiPost(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

// PUT リクエスト
async function apiPut(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

// PATCH リクエスト
async function apiPatch(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

// DELETE リクエスト
async function apiDelete(endpoint) {
    return apiRequest(endpoint, {
        method: 'DELETE'
    });
}

// ローカルストレージを使用した簡易データ管理（開発用フォールバック）
const LocalStorage = {
    // レコード一覧取得
    getRecords: (tableName) => {
        const data = localStorage.getItem(`table_${tableName}`);
        return data ? JSON.parse(data) : [];
    },
    
    // レコード保存
    saveRecords: (tableName, records) => {
        localStorage.setItem(`table_${tableName}`, JSON.stringify(records));
    },
    
    // レコード追加
    addRecord: (tableName, record) => {
        const records = LocalStorage.getRecords(tableName);
        const newRecord = {
            ...record,
            id: record.id || generateUUID(),
            created_at: Date.now(),
            updated_at: Date.now()
        };
        records.push(newRecord);
        LocalStorage.saveRecords(tableName, records);
        return newRecord;
    },
    
    // レコード取得
    getRecord: (tableName, id) => {
        const records = LocalStorage.getRecords(tableName);
        return records.find(r => r.id === id);
    },
    
    // レコード更新
    updateRecord: (tableName, id, data) => {
        const records = LocalStorage.getRecords(tableName);
        const index = records.findIndex(r => r.id === id);
        if (index === -1) return null;
        
        records[index] = {
            ...records[index],
            ...data,
            updated_at: Date.now()
        };
        LocalStorage.saveRecords(tableName, records);
        return records[index];
    },
    
    // レコード削除
    deleteRecord: (tableName, id) => {
        const records = LocalStorage.getRecords(tableName);
        const filtered = records.filter(r => r.id !== id);
        LocalStorage.saveRecords(tableName, filtered);
        return true;
    },
    
    // 検索
    searchRecords: (tableName, searchTerm) => {
        const records = LocalStorage.getRecords(tableName);
        if (!searchTerm) return records;
        
        return records.filter(r => {
            return Object.values(r).some(val => {
                return String(val).toLowerCase().includes(searchTerm.toLowerCase());
            });
        });
    }
};

// API互換のローカルストレージラッパー
const API = {
    // 一覧取得
    getRecords: async (tableName, params = {}) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const endpoint = `tables/${tableName}${queryString ? '?' + queryString : ''}`;
            return await apiGet(endpoint);
        } catch (error) {
            console.warn('API not available, using localStorage:', error);
            const records = LocalStorage.getRecords(tableName);
            return {
                data: records,
                total: records.length,
                page: 1,
                limit: records.length
            };
        }
    },
    
    // 単一レコード取得
    getRecord: async (tableName, id) => {
        try {
            return await apiGet(`tables/${tableName}/${id}`);
        } catch (error) {
            console.warn('API not available, using localStorage:', error);
            return LocalStorage.getRecord(tableName, id);
        }
    },
    
    // レコード作成
    createRecord: async (tableName, data) => {
        try {
            return await apiPost(`tables/${tableName}`, data);
        } catch (error) {
            console.warn('API not available, using localStorage:', error);
            return LocalStorage.addRecord(tableName, data);
        }
    },
    
    // レコード更新
    updateRecord: async (tableName, id, data) => {
        try {
            return await apiPut(`tables/${tableName}/${id}`, data);
        } catch (error) {
            console.warn('API not available, using localStorage:', error);
            return LocalStorage.updateRecord(tableName, id, data);
        }
    },
    
    // レコード削除
    deleteRecord: async (tableName, id) => {
        try {
            return await apiDelete(`tables/${tableName}/${id}`);
        } catch (error) {
            console.warn('API not available, using localStorage:', error);
            return LocalStorage.deleteRecord(tableName, id);
        }
    }
};

// UUID生成
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
