// グローバル変数
let allRecords = [];
let filteredRecords = [];

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

// 結果を描画
function renderResults() {
    const resultsContainer = document.getElementById('results-container');
    const emptyState = document.getElementById('empty-state');
    const resultsBody = document.getElementById('results-body');
    const resultsCount = document.getElementById('results-count');

    // 件数を表示
    resultsCount.textContent = `${filteredRecords.length} 件`;

    if (filteredRecords.length === 0) {
        resultsContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    resultsContainer.style.display = 'block';
    emptyState.style.display = 'none';

    // テーブルを描画
    const html = filteredRecords.map(record => {
        const tags = Array.isArray(record.tags) ? record.tags : [];
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

// レコードを表示
function viewRecord(id) {
    window.location.href = `inspection.html?id=${id}`;
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
