// グローバル変数
let currentRecordId = null;
let currentRecord = null;
let photosData = {};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // URLパラメータからレコードIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    currentRecordId = urlParams.get('id');

    if (!currentRecordId) {
        alert('レコードIDが指定されていません');
        location.href = 'search.html';
        return;
    }

    loadRecord();
});

// レコードを読み込み
async function loadRecord() {
    try {
        currentRecord = await API.getRecord('maintenance_records', currentRecordId);
        
        // データを表示
        displayRecord(currentRecord);
        
        // 写真を読み込み
        await loadPhotos();
        
    } catch (error) {
        console.error('読み込みエラー:', error);
        alert('データの読み込みに失敗しました');
        location.href = 'search.html';
    }
}

// レコードを表示
function displayRecord(record) {
    // ステータス
    const statusTexts = {
        draft: '下書き',
        completed: '完了',
        archived: 'アーカイブ'
    };
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    
    statusBadge.textContent = statusTexts[record.status] || record.status;
    statusBadge.className = `status-badge status-${record.status}`;
    statusText.textContent = record.status === 'completed' ? '整備完了' : '編集中';
    
    // 作成日時
    const createdDate = new Date(record.created_at || Date.now());
    document.getElementById('created-date').textContent = formatDateTime(createdDate);
    
    // PDF出力ボタンの表示制御
    if (record.status === 'completed') {
        document.getElementById('pdf-btn').style.display = 'flex';
    }
    
    // 車両情報
    document.getElementById('client-name').textContent = record.client_name || '-';
    document.getElementById('registration-number').textContent = record.registration_number || '-';
    document.getElementById('car-model').textContent = record.car_model || '-';
    document.getElementById('chassis-number').textContent = record.chassis_number || '-';
    document.getElementById('engine-model').textContent = record.engine_model || '-';
    document.getElementById('first-registration').textContent = record.first_registration || '-';
    document.getElementById('mileage').textContent = record.mileage ? `${record.mileage.toLocaleString()} km` : '-';
    
    // 整備情報
    document.getElementById('workshop-name').textContent = record.workshop_name || '-';
    document.getElementById('inspection-date').textContent = formatDate(record.inspection_date);
    document.getElementById('completion-date').textContent = formatDate(record.completion_date);
    document.getElementById('mechanic-name').textContent = record.mechanic_name || '-';
    
    // 点検結果
    if (record.inspection_data) {
        const inspectionData = JSON.parse(record.inspection_data);
        displayInspectionResults(inspectionData);
    }
    
    // 交換部品
    if (record.replacement_parts) {
        const parts = JSON.parse(record.replacement_parts);
        if (Object.keys(parts).length > 0) {
            displayReplacementParts(parts);
            document.getElementById('replacement-parts-section').style.display = 'block';
        }
    }
    
    // 測定値
    if (record.measurements) {
        const measurements = JSON.parse(record.measurements);
        if (Object.keys(measurements).length > 0) {
            displayMeasurements(measurements);
            document.getElementById('measurements-section').style.display = 'block';
        }
    }
    
    // アドバイス
    if (record.advice && record.advice.trim()) {
        document.getElementById('advice').textContent = record.advice;
        document.getElementById('advice-section').style.display = 'block';
    }
    
    // タグ
    let tagsArray = [];
    if (record.tags) {
        try {
            tagsArray = typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags;
        } catch (e) {
            tagsArray = [];
        }
    }
    if (tagsArray.length > 0) {
        displayTags(tagsArray);
        document.getElementById('tags-section').style.display = 'block';
    }
}

// 点検結果を表示
function displayInspectionResults(inspectionData) {
    const sections = ['engine', 'interior', 'undercarriage', 'bottom'];
    
    sections.forEach(section => {
        const pane = document.getElementById(`${section}-pane`);
        const items = inspectionItems[section];
        
        if (!items) return;
        
        let hasData = false;
        let html = '';
        
        items.forEach(group => {
            const groupItems = group.items.filter(item => inspectionData[item.id]);
            
            if (groupItems.length > 0) {
                hasData = true;
                html += `
                    <div class="inspection-group">
                        <div class="group-title">${group.category}</div>
                        <div class="inspection-items">
                            ${groupItems.map(item => {
                                const data = inspectionData[item.id];
                                const codeClass = getCodeClass(data.code);
                                return `
                                    <div class="inspection-row">
                                        <span class="inspection-row-name">${item.name}</span>
                                        <span class="inspection-row-code ${codeClass}">${data.code}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        if (hasData) {
            pane.innerHTML = html;
        } else {
            pane.innerHTML = '<div class="inspection-empty">点検データがありません</div>';
        }
    });
}

// コードのクラスを取得
function getCodeClass(code) {
    const classMap = {
        '✓': 'code-check',
        '×': 'code-x',
        'A': 'code-a',
        'C': 'code-c',
        'P': 'code-p',
        '○': 'code-circle',
        '△': 'code-triangle',
        'T': 'code-t',
        'L': 'code-l',
        '/': 'code-slash'
    };
    return classMap[code] || '';
}

// 交換部品を表示
function displayReplacementParts(parts) {
    const container = document.getElementById('replacement-parts');
    
    const html = Object.entries(parts).map(([name, quantity]) => `
        <div class="part-item">
            <span class="part-name">${escapeHtml(name)}</span>
            <span class="part-quantity">${escapeHtml(quantity)}</span>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// 測定値を表示
function displayMeasurements(measurements) {
    const container = document.getElementById('measurements');
    
    const html = Object.entries(measurements).map(([name, value]) => `
        <div class="measurement-item">
            <span class="measurement-label">${escapeHtml(name)}</span>
            <span class="measurement-value">${escapeHtml(value)}</span>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// タグを表示
function displayTags(tags) {
    const container = document.getElementById('tags');
    
    const html = tags.map(tag => `
        <span class="tag">${escapeHtml(tag)}</span>
    `).join('');
    
    container.innerHTML = html;
}

// 写真を読み込み
async function loadPhotos() {
    try {
        const result = await API.getRecords('inspection_photos', { search: currentRecordId, limit: 1000 });
        const photos = result.data || [];
        
        if (photos.length === 0) return;
        
        // 項目IDでグループ化
        const photosByItem = {};
        photos.forEach(photo => {
            if (!photosByItem[photo.item_id]) {
                photosByItem[photo.item_id] = [];
            }
            photosByItem[photo.item_id].push(photo);
        });
        
        // 表示
        displayPhotos(photosByItem);
        document.getElementById('photos-section').style.display = 'block';
        
    } catch (error) {
        console.error('写真読み込みエラー:', error);
    }
}

// 写真を表示
function displayPhotos(photosByItem) {
    const container = document.getElementById('photo-groups');
    
    const html = Object.entries(photosByItem).map(([itemId, photos]) => {
        // ソート順でソート
        photos.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        
        return `
            <div class="photo-group">
                <div class="photo-group-title">
                    <i class="fas fa-camera"></i>
                    ${escapeHtml(photos[0].item_name || itemId)}
                </div>
                <div class="photo-gallery">
                    ${photos.map(photo => `
                        <div class="photo-item" onclick="openLightbox('${photo.photo_url}')">
                            <img src="${photo.photo_url}" alt="${escapeHtml(photo.item_name)}">
                            <span class="photo-badge ${photo.before_after}">${photo.before_after === 'before' ? '前' : '後'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// 点検タブ切替
function switchInspectionTab(section) {
    // タブの状態を更新
    document.querySelectorAll('.inspection-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // パネルの表示切替
    document.querySelectorAll('.inspection-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${section}-pane`).classList.add('active');
}

// ライトボックスを開く
function openLightbox(imageUrl) {
    const lightbox = document.getElementById('lightbox');
    const image = document.getElementById('lightbox-image');
    
    image.src = imageUrl;
    lightbox.classList.add('show');
}

// ライトボックスを閉じる
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('show');
}

// 編集画面に遷移
function editRecord() {
    if (confirm('この記録を編集しますか？')) {
        location.href = `inspection.html?id=${currentRecordId}`;
    }
}

// PDF出力
function generatePDF() {
    location.href = `pdf-output.html?id=${currentRecordId}`;
}

// レコードを削除
async function deleteRecord() {
    if (!confirm('この整備記録を削除してもよろしいですか？\nこの操作は取り消せません。')) {
        return;
    }

    try {
        await API.deleteRecord('maintenance_records', currentRecordId);
        alert('✅ 整備記録を削除しました');
        location.href = 'search.html';
    } catch (error) {
        console.error('削除エラー:', error);
        alert('❌ 削除に失敗しました');
    }
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

function formatDateTime(date) {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
