// 初期化
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showError();
        return;
    }

    loadRecord(token);
});

// レコードを読み込み
async function loadRecord(token) {
    try {
        // トークンでレコードを検索
        const result = await API.getRecords('maintenance_records', { search: token, limit: 1 });
        const records = result.data || [];

        if (records.length === 0) {
            showError();
            return;
        }

        const record = records[0];

        // ステータスが完了でない場合はエラー
        if (record.status !== 'completed') {
            showError();
            return;
        }

        // 写真を読み込み
        const photos = await loadPhotos(record.id);

        // コンテンツを描画
        renderContent(record, photos);

        // 表示を切り替え
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('content-area').style.display = 'block';
    } catch (error) {
        console.error('読み込みエラー:', error);
        showError();
    }
}

// 写真を読み込み
async function loadPhotos(recordId) {
    try {
        const result = await API.getRecords('inspection_photos', { search: recordId, limit: 1000 });
        return result.data || [];
    } catch (error) {
        console.error('写真読み込みエラー:', error);
        return [];
    }
}

// コンテンツを描画
function renderContent(record, photos) {
    const container = document.getElementById('content-area');

    // 車両情報
    const vehicleInfoHtml = `
        <div class="info-card">
            <div class="card-header">
                <i class="fas fa-car"></i>
                車両情報
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">車両番号</div>
                    <div class="info-value">${escapeHtml(record.registration_number)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">車名・型式</div>
                    <div class="info-value">${escapeHtml(record.car_model)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">点検日</div>
                    <div class="info-value">${formatDate(record.inspection_date)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">走行距離</div>
                    <div class="info-value">${record.mileage ? record.mileage.toLocaleString() + ' km' : '-'}</div>
                </div>
            </div>
        </div>
    `;

    // 点検結果
    const inspectionData = record.inspection_data ? JSON.parse(record.inspection_data) : {};
    const inspectionHtml = `
        <div class="info-card">
            <div class="card-header">
                <i class="fas fa-clipboard-check"></i>
                点検結果
            </div>
            <div class="inspection-results">
                ${renderInspectionResults(inspectionData)}
            </div>
        </div>
    `;

    // 交換部品
    const replacementParts = record.replacement_parts ? JSON.parse(record.replacement_parts) : {};
    const replacementHtml = Object.keys(replacementParts).length > 0 ? `
        <div class="info-card">
            <div class="card-header">
                <i class="fas fa-tools"></i>
                交換部品
            </div>
            <div class="replacement-list">
                ${Object.entries(replacementParts).map(([name, quantity]) => `
                    <div class="replacement-item">
                        <div class="replacement-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="replacement-info">
                            <div class="replacement-name">${escapeHtml(name)}</div>
                            <div class="replacement-quantity">数量: ${escapeHtml(quantity)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // 測定値
    const measurements = record.measurements ? JSON.parse(record.measurements) : {};
    const measurementsHtml = Object.keys(measurements).length > 0 ? `
        <div class="info-card">
            <div class="card-header">
                <i class="fas fa-ruler"></i>
                測定値
            </div>
            <div class="measurements-grid">
                ${Object.entries(measurements).map(([name, value]) => `
                    <div class="measurement-item">
                        <div class="measurement-label">${escapeHtml(name)}</div>
                        <div class="measurement-value">${escapeHtml(value)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // アドバイス
    const adviceHtml = record.advice ? `
        <div class="info-card">
            <div class="card-header">
                <i class="fas fa-lightbulb"></i>
                メンテナンスアドバイス
            </div>
            <div class="advice-box">
                <p>${escapeHtml(record.advice).replace(/\n/g, '<br>')}</p>
            </div>
        </div>
    ` : '';

    // 写真
    const photosHtml = photos.length > 0 ? `
        <div class="info-card">
            <div class="card-header">
                <i class="fas fa-camera"></i>
                整備・点検写真
            </div>
            <div class="photo-gallery">
                ${photos.map(photo => `
                    <div class="photo-item" onclick="openLightbox('${photo.photo_url}')">
                        <img src="${photo.photo_url}" alt="${escapeHtml(photo.item_name)}">
                        <span class="photo-badge ${photo.before_after}">${photo.before_after === 'before' ? '作業前' : '作業後'}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    container.innerHTML = vehicleInfoHtml + inspectionHtml + replacementHtml + measurementsHtml + adviceHtml + photosHtml;
}

// 点検結果を描画
function renderInspectionResults(inspectionData) {
    if (Object.keys(inspectionData).length === 0) {
        return '<p style="text-align: center; color: #999;">点検データがありません</p>';
    }

    // カテゴリごとにグループ化
    const categories = {
        'エンジンルーム': [],
        '室内': [],
        '足廻り': [],
        '下廻り': []
    };

    Object.entries(inspectionData).forEach(([itemId, data]) => {
        const category = getCategoryFromId(itemId);
        const itemName = getItemNameFromId(itemId);

        if (category && itemName) {
            categories[category].push({ name: itemName, code: data.code });
        }
    });

    return Object.entries(categories)
        .filter(([_, items]) => items.length > 0)
        .map(([category, items]) => `
            <div class="inspection-category">
                <div class="category-title">${category}</div>
                ${items.map(item => `
                    <div class="inspection-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-result ${getResultClass(item.code)}">${getResultText(item.code)}</span>
                    </div>
                `).join('')}
            </div>
        `).join('');
}

// カテゴリを取得
function getCategoryFromId(itemId) {
    if (itemId.startsWith('engine_')) return 'エンジンルーム';
    if (itemId.startsWith('interior_')) return '室内';
    if (itemId.startsWith('under_')) return '足廻り';
    if (itemId.startsWith('bottom_')) return '下廻り';
    return null;
}

// 項目名を取得（簡易版）
function getItemNameFromId(itemId) {
    const names = {
        'engine_ps_belt': 'パワステ・ベルトの緩み、損傷',
        'engine_cool_fan_belt': 'ファンベルトの緩み、損傷',
        'engine_cool_leak': '冷却水の漏れ',
        'engine_spark_plug': 'スパーク・プラグの状態',
        'engine_battery': 'バッテリ・ターミナル部',
        'engine_air_filter': 'エア・フィルタ',
        'interior_brake_pedal': 'ブレーキ・ペダル',
        'interior_brake_effect': 'ブレーキの効き具合',
        'interior_parking_brake': 'パーキング・ブレーキ',
        'interior_clutch': 'クラッチ・ペダル',
        'under_brake_pad': 'ブレーキ・パッドの摩耗',
        'under_tire_pressure': 'タイヤの空気圧',
        'under_tire_tread': 'タイヤの溝の深さ',
        'under_wheel_nut': 'ホイール・ナット',
        'bottom_oil_leak': 'エンジンオイルの漏れ',
        'bottom_trans_oil': 'トランスミッション・オイル'
    };
    return names[itemId] || itemId;
}

// 結果のクラスを取得
function getResultClass(code) {
    if (code === '✓') return 'result-ok';
    if (code === '×') return 'result-replace';
    if (code === 'A') return 'result-adjust';
    return '';
}

// 結果のテキストを取得
function getResultText(code) {
    const texts = {
        '✓': '良好',
        '×': '交換',
        'A': '調整',
        'C': '清掃',
        'P': '省略',
        '○': '特定整備',
        '△': '修理',
        'T': '締付',
        'L': '給油',
        '/': '該当なし'
    };
    return texts[code] || code;
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
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('show');
}

// エラーを表示
function showError() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
}

// ユーティリティ関数
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
