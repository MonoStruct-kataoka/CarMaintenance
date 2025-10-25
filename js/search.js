// グローバル変数
let allRecords = [];
let filteredRecords = [];
let currentView = 'timeline'; // 'timeline' or 'table'

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
});

// レコードを読み込み
async function loadRecords() {
    showLoading(true);

    try {
        const result = await API.getRecords('maintenance_records', { limit: 1000, sort: '-created_at' });
        allRecords = result.data || [];
        filteredRecords = allRecords;

        renderResults();
    } catch (error) {
        console.error('読み込みエラー:', error);
        showEmpty('エラーが発生しました。再度お試しください。');
    } finally {
        showLoading(false);
    }
}

// 検索実行
function searchRecords() {
    const clientName = document.getElementById('search-client-name').value.trim().toLowerCase();
    const registration = document.getElementById('search-registration').value.trim().toLowerCase();
    const chassis = document.getElementById('search-chassis').value.trim().toLowerCase();
    const status = document.getElementById('search-status').value;

    filteredRecords = allRecords.filter(record => {
        // 顧客名フィルタ
        if (clientName && !record.client_name.toLowerCase().includes(clientName)) {
            return false;
        }

        // 車両番号フィルタ
        if (registration && !record.registration_number.toLowerCase().includes(registration)) {
            return false;
        }

        // 車台番号フィルタ
        if (chassis && !record.chassis_number.toLowerCase().includes(chassis)) {
            return false;
        }

        // ステータスフィルタ
        if (status && record.status !== status) {
            return false;
        }

        return true;
    });

    renderResults();
}

// 検索クリア
function clearSearch() {
    document.getElementById('search-client-name').value = '';
    document.getElementById('search-registration').value = '';
    document.getElementById('search-chassis').value = '';
    document.getElementById('search-status').value = '';

    filteredRecords = allRecords;
    renderResults();
}

// 表示切替
function switchView(view) {
    currentView = view;
    
    // タブの状態を更新
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.view-tab').classList.add('active');
    
    // 表示を切り替え
    renderResults();
}

// 結果を描画
function renderResults() {
    const timelineContainer = document.getElementById('timeline-container');
    const tableContainer = document.getElementById('results-container');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');

    // 件数を表示
    resultsCount.textContent = `${filteredRecords.length} 件`;

    if (filteredRecords.length === 0) {
        timelineContainer.style.display = 'none';
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    if (currentView === 'timeline') {
        timelineContainer.style.display = 'block';
        tableContainer.style.display = 'none';
        renderTimeline();
    } else {
        timelineContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        renderTable();
    }
}

// タイムライン表示
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    
    // 日付でグループ化
    const grouped = groupByPeriod(filteredRecords);
    
    let html = '';
    
    // 最近（3ヶ月以内）
    if (grouped.recent.length > 0) {
        html += renderPeriodSection('最近', '📅', grouped.recent, '#4CAF50');
    }
    
    // 今年
    if (grouped.thisYear.length > 0) {
        html += renderPeriodSection('今年', '📆', grouped.thisYear, '#2196F3');
    }
    
    // 1年前
    if (grouped.lastYear.length > 0) {
        html += renderPeriodSection('1年前', '📋', grouped.lastYear, '#FF9800');
    }
    
    // 2年前
    if (grouped.twoYearsAgo.length > 0) {
        html += renderPeriodSection('2年前', '📂', grouped.twoYearsAgo, '#9C27B0');
    }
    
    // それ以前
    if (grouped.older.length > 0) {
        html += renderPeriodSection('それ以前', '🗂️', grouped.older, '#757575');
    }
    
    container.innerHTML = html;
}

// 期間でグループ化
function groupByPeriod(records) {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    const twoYearsAgoStart = new Date(now.getFullYear() - 2, 0, 1);
    const twoYearsAgoEnd = new Date(now.getFullYear() - 2, 11, 31);
    
    const grouped = {
        recent: [],
        thisYear: [],
        lastYear: [],
        twoYearsAgo: [],
        older: []
    };
    
    records.forEach(record => {
        const date = new Date(record.inspection_date);
        
        if (date >= threeMonthsAgo) {
            grouped.recent.push(record);
        } else if (date >= thisYearStart) {
            grouped.thisYear.push(record);
        } else if (date >= lastYearStart && date <= lastYearEnd) {
            grouped.lastYear.push(record);
        } else if (date >= twoYearsAgoStart && date <= twoYearsAgoEnd) {
            grouped.twoYearsAgo.push(record);
        } else {
            grouped.older.push(record);
        }
    });
    
    return grouped;
}

// 期間セクションを描画
function renderPeriodSection(title, icon, records, color) {
    const items = records.map(record => {
        // タグを解析（JSON文字列または配列）
        let tags = [];
        if (record.tags) {
            try {
                tags = typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags;
            } catch (e) {
                tags = [];
            }
        }
        const statusText = {
            draft: '下書き',
            completed: '完了',
            archived: 'アーカイブ'
        }[record.status] || record.status;
        
        return `
            <div class="timeline-item" onclick="viewRecord('${record.id}')">
                <div class="timeline-item-header">
                    <span class="timeline-date">${formatDate(record.inspection_date)}</span>
                    <span class="status-badge status-${record.status}">${statusText}</span>
                </div>
                <div class="timeline-vehicle">${escapeHtml(record.registration_number)}</div>
                <div class="timeline-client">${escapeHtml(record.client_name)}</div>
                <div class="timeline-details">
                    <span class="timeline-mileage">
                        <i class="fas fa-tachometer-alt"></i>
                        ${record.mileage ? record.mileage.toLocaleString() + ' km' : '-'}
                    </span>
                    ${tags.slice(0, 2).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    ${tags.length > 2 ? `<span class="tag">+${tags.length - 2}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="timeline-period">
            <div class="period-header">
                <span class="period-icon">${icon}</span>
                <span class="period-title">${title}</span>
                <span class="period-count">${records.length}件</span>
            </div>
            <div class="timeline-items">
                ${items}
            </div>
        </div>
    `;
}

// テーブル表示
function renderTable() {
    const resultsBody = document.getElementById('results-body');
    
    // テーブルを描画
    const html = filteredRecords.map(record => {
        // タグを解析（JSON文字列または配列）
        let tags = [];
        if (record.tags) {
            try {
                tags = typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags;
            } catch (e) {
                tags = [];
            }
        }
        const statusText = {
            draft: '下書き',
            completed: '完了',
            archived: 'アーカイブ'
        }[record.status] || record.status;

        return `
            <tr onclick="viewRecord('${record.id}')">
                <td data-label="点検日">${formatDate(record.inspection_date)}</td>
                <td data-label="顧客名">${escapeHtml(record.client_name)}</td>
                <td data-label="車両番号">${escapeHtml(record.registration_number)}</td>
                <td data-label="車名">${escapeHtml(record.car_model)}</td>
                <td data-label="走行距離">${record.mileage ? record.mileage.toLocaleString() + ' km' : '-'}</td>
                <td data-label="ステータス"><span class="status-badge status-${record.status}">${statusText}</span></td>
                <td data-label="タグ">
                    ${tags.slice(0, 2).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    ${tags.length > 2 ? `<span class="tag">+${tags.length - 2}</span>` : ''}
                </td>
                <td data-label="操作" onclick="event.stopPropagation()">
                    <button class="action-btn" onclick="editRecord('${record.id}')" title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${record.status === 'completed' ? `
                        <button class="action-btn" onclick="generatePDF('${record.id}')" title="PDF出力">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="action-btn" onclick="viewCustomerPage('${record.access_token}')" title="顧客ページ">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    ` : ''}
                    <button class="action-btn delete" onclick="deleteRecord('${record.id}')" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    resultsBody.innerHTML = html;
}

// レコードを表示（詳細ページ）
function viewRecord(id) {
    window.location.href = `view.html?id=${id}`;
}

// レコードを編集
function editRecord(id) {
    window.location.href = `inspection.html?id=${id}`;
}

// PDF出力
function generatePDF(id) {
    window.location.href = `pdf-output.html?id=${id}`;
}

// 顧客ページを表示
function viewCustomerPage(token) {
    window.open(`customer.html?token=${token}`, '_blank');
}

// レコードを削除
async function deleteRecord(id) {
    if (!confirm('この整備記録を削除してもよろしいですか？\nこの操作は取り消せません。')) {
        return;
    }

    try {
        await API.deleteRecord('maintenance_records', id);

        // リストから削除
        allRecords = allRecords.filter(r => r.id !== id);
        filteredRecords = filteredRecords.filter(r => r.id !== id);

        renderResults();
        showToast('✅ 整備記録を削除しました');
    } catch (error) {
        console.error('削除エラー:', error);
        showToast('❌ 削除に失敗しました');
    }
}

// ローディング表示
function showLoading(show) {
    const loading = document.getElementById('loading-state');
    const empty = document.getElementById('empty-state');
    const results = document.getElementById('results-container');

    if (show) {
        loading.style.display = 'block';
        empty.style.display = 'none';
        results.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

// 空状態表示
function showEmpty(message) {
    const empty = document.getElementById('empty-state');
    empty.style.display = 'block';
    empty.querySelector('p').textContent = message;
}

// トースト通知
function showToast(message) {
    // 簡易トースト
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ユーティリティ関数
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
