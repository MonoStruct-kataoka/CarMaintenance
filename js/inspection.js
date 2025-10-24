// グローバル変数
let currentTab = 'vehicle';
let currentRecordId = null;
let inspectionData = {};
let photosData = {};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // URLパラメータからレコードIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    currentRecordId = urlParams.get('id');

    // 日付を設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inspection-date').value = today;
    document.getElementById('completion-date').value = today;

    // 点検項目を描画
    renderInspectionItems();
    renderReplacementParts();
    renderMeasurements();

    // タブ切り替えイベント
    setupTabNavigation();

    // 写真アップロードイベント
    setupPhotoUpload();

    // 車両番号の自動更新
    document.getElementById('registration-number')?.addEventListener('input', function() {
        const value = this.value || '未登録';
        document.getElementById('vehicle-display').textContent = value;
    });

    // 既存レコードがある場合は読み込み
    if (currentRecordId) {
        loadRecord(currentRecordId);
    }
});

// タブナビゲーション設定
function setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

// タブ切り替え
function switchTab(tabName) {
    // タブボタンの状態更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');

    // コンテンツの表示切り替え
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector(`.tab-content[data-content="${tabName}"]`).classList.add('active');

    // タイトル更新
    const titles = {
        vehicle: '車両情報登録',
        engine: 'エンジン・ルーム点検',
        interior: '室内点検',
        undercarriage: '足廻り点検',
        bottom: '下廻り点検',
        additional: '追加項目'
    };
    document.getElementById('section-title').textContent = titles[tabName];

    currentTab = tabName;
}

// 点検項目を描画
function renderInspectionItems() {
    ['engine', 'interior', 'undercarriage', 'bottom'].forEach(section => {
        const container = document.getElementById(`${section}-items`);
        if (!container) return;

        const items = inspectionItems[section];
        let html = '';

        items.forEach(group => {
            html += `
                <div class="inspection-card">
                    <div class="card-header">■ ${group.category}</div>
                    <div class="card-content">
                        ${group.items.map(item => `
                            <div class="inspection-item" data-item-id="${item.id}">
                                <div class="item-row">
                                    <div class="item-name ${item.required ? 'required' : ''}">${item.name}</div>
                                    <div class="item-actions">
                                        <div class="check-buttons">
                                            ${item.codes.map(code => `
                                                <button class="check-btn" data-code="${code}" onclick="checkItem('${item.id}', '${code}')">${code}</button>
                                            `).join('')}
                                        </div>
                                        <button class="camera-btn" onclick="openPhotoModal('${item.id}', '${item.name}')">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    });
}

// 交換部品を描画
function renderReplacementParts() {
    const container = document.getElementById('replacement-parts');
    if (!container) return;

    const html = replacementParts.map(part => `
        <div class="replacement-item">
            <label for="${part.id}" class="replacement-label">${part.name}</label>
            <input type="number" class="replacement-quantity" id="${part.id}" placeholder="${part.unit}" min="0" step="0.1" data-part-id="${part.id}">
        </div>
    `).join('');

    container.innerHTML = html;
}

// 測定値を描画
function renderMeasurements() {
    const container = document.getElementById('measurements');
    if (!container) return;

    const html = measurements.map(m => `
        <div class="measurement-item">
            <label class="measurement-label">${m.name}</label>
            <input type="text" class="measurement-input" id="${m.id}" placeholder="${m.placeholder} ${m.unit}">
        </div>
    `).join('');

    container.innerHTML = html;
}

// 項目をチェック
function checkItem(itemId, code) {
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!itemElement) return;

    // 既存の選択を解除
    itemElement.querySelectorAll('.check-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // 新しい選択を追加
    const button = itemElement.querySelector(`[data-code="${code}"]`);
    button.classList.add('selected');

    // 項目をチェック済みにマーク
    itemElement.classList.add('checked');

    // データを保存
    inspectionData[itemId] = {
        code: code,
        timestamp: new Date().toISOString()
    };

    // 進捗を更新
    updateProgress();

    // 振動フィードバック
    if ('vibrate' in navigator) {
        navigator.vibrate(10);
    }
}

// 進捗を更新
function updateProgress() {
    const sections = {
        engine: { total: 5, checked: 0 },
        interior: { total: 3, checked: 0 },
        undercarriage: { total: 3, checked: 0 },
        bottom: { total: 2, checked: 0 }
    };

    // チェック済み項目をカウント
    Object.keys(inspectionData).forEach(itemId => {
        const section = itemId.split('_')[0];
        if (sections[section]) {
            sections[section].checked++;
        }
    });

    // 全体の進捗
    const totalItems = Object.values(sections).reduce((sum, s) => sum + s.total, 0);
    const checkedItems = Object.values(sections).reduce((sum, s) => sum + s.checked, 0);
    document.getElementById('progress-text').textContent = `${checkedItems} / ${totalItems} 完了`;

    // タブバッジを更新
    Object.keys(sections).forEach(section => {
        const badge = document.querySelector(`.tab-btn[data-tab="${section}"] .tab-badge`);
        if (badge) {
            badge.textContent = `${sections[section].checked}/${sections[section].total}`;
        }
    });
}

// QRコードスキャン
function scanQRCode() {
    showToast('📷 カメラを起動中...');

    setTimeout(() => {
        // デモ用：サンプルデータを自動入力
        document.getElementById('registration-number').value = '四谷 330 せ 6098';
        document.getElementById('car-model').value = 'GAA-SNT33';
        document.getElementById('chassis-number').value = 'SNT33-028686';
        document.getElementById('engine-model').value = 'MA03';
        document.getElementById('first-registration').value = '令和6年3月';
        document.getElementById('vehicle-display').textContent = '四谷 330 せ 6098';

        showToast('✅ 車検証情報を読み取りました');
    }, 1500);
}

// 写真モーダルを開く
let currentPhotoItemId = null;
let currentPhotoItemName = null;

function openPhotoModal(itemId, itemName) {
    currentPhotoItemId = itemId;
    currentPhotoItemName = itemName;

    document.getElementById('photoModalTitle').textContent = `写真管理 - ${itemName}`;
    document.getElementById('photoModal').classList.add('show');

    // 既存の写真を表示
    renderPhotoGallery();
}

function closePhotoModal() {
    document.getElementById('photoModal').classList.remove('show');
    currentPhotoItemId = null;
    currentPhotoItemName = null;
}

// 写真アップロード設定
function setupPhotoUpload() {
    const input = document.getElementById('photoInput');
    if (!input) return;

    input.addEventListener('change', function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                addPhoto(currentPhotoItemId, event.target.result);
            };
            reader.readAsDataURL(file);
        });

        // 入力をリセット
        e.target.value = '';
    });
}

// 写真を追加
function addPhoto(itemId, dataUrl) {
    if (!photosData[itemId]) {
        photosData[itemId] = [];
    }

    const photoId = generateUUID();
    photosData[itemId].push({
        id: photoId,
        url: dataUrl,
        beforeAfter: 'before',
        timestamp: new Date().toISOString(),
        isCover: photosData[itemId].length === 0
    });

    // カメラボタンにバッジを追加
    updateCameraButton(itemId);

    // ギャラリーを更新
    renderPhotoGallery();

    showToast('✅ 写真を追加しました');
}

// 写真ギャラリーを描画
function renderPhotoGallery() {
    const container = document.getElementById('photoGallery');
    if (!container || !currentPhotoItemId) return;

    const photos = photosData[currentPhotoItemId] || [];

    if (photos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">写真がまだありません</p>';
        return;
    }

    const html = photos.map(photo => `
        <div class="photo-item">
            <img src="${photo.url}" alt="点検写真">
            <span class="photo-badge ${photo.beforeAfter}">${photo.beforeAfter === 'before' ? '前' : '後'}</span>
            <button class="photo-delete" onclick="deletePhoto('${currentPhotoItemId}', '${photo.id}')">
                <i class="fas fa-times"></i>
            </button>
            <div class="photo-controls">
                <button class="photo-control-btn" onclick="toggleBeforeAfter('${currentPhotoItemId}', '${photo.id}')">
                    ${photo.beforeAfter === 'before' ? '後に変更' : '前に変更'}
                </button>
                ${!photo.isCover ? `<button class="photo-control-btn" onclick="setCover('${currentPhotoItemId}', '${photo.id}')">代表</button>` : ''}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// 写真を削除
function deletePhoto(itemId, photoId) {
    if (!photosData[itemId]) return;

    photosData[itemId] = photosData[itemId].filter(p => p.id !== photoId);

    // 代表写真がなくなった場合は最初の写真を代表にする
    if (photosData[itemId].length > 0 && !photosData[itemId].some(p => p.isCover)) {
        photosData[itemId][0].isCover = true;
    }

    updateCameraButton(itemId);
    renderPhotoGallery();
    showToast('🗑️ 写真を削除しました');
}

// Before/Afterを切り替え
function toggleBeforeAfter(itemId, photoId) {
    const photo = photosData[itemId]?.find(p => p.id === photoId);
    if (!photo) return;

    photo.beforeAfter = photo.beforeAfter === 'before' ? 'after' : 'before';
    renderPhotoGallery();
}

// 代表写真に設定
function setCover(itemId, photoId) {
    if (!photosData[itemId]) return;

    photosData[itemId].forEach(p => {
        p.isCover = (p.id === photoId);
    });

    renderPhotoGallery();
    showToast('✅ 代表写真に設定しました');
}

// カメラボタンを更新
function updateCameraButton(itemId) {
    const button = document.querySelector(`[data-item-id="${itemId}"] .camera-btn`);
    if (!button) return;

    const hasPhotos = photosData[itemId] && photosData[itemId].length > 0;
    if (hasPhotos) {
        button.classList.add('has-photos');
    } else {
        button.classList.remove('has-photos');
    }
}

// 下書き保存
async function saveAsDraft() {
    try {
        const data = collectFormData();
        data.status = 'draft';

        if (currentRecordId) {
            // 更新
            await updateRecord(currentRecordId, data);
            showToast('✅ 下書きを保存しました');
        } else {
            // 新規作成
            const record = await createRecord(data);
            currentRecordId = record.id;
            showToast('✅ 下書きを保存しました');
            // URLを更新
            history.replaceState(null, '', `?id=${currentRecordId}`);
        }
    } catch (error) {
        console.error('保存エラー:', error);
        showToast('❌ 保存に失敗しました');
    }
}

// 点検完了
async function completeInspection() {
    // 必須項目のバリデーション
    const requiredFields = [
        { id: 'client-name', name: '依頼者の氏名又は名称' },
        { id: 'registration-number', name: '自動車登録番号' },
        { id: 'mileage', name: '走行距離' },
        { id: 'inspection-date', name: '点検の年月日' }
    ];

    for (const field of requiredFields) {
        const value = document.getElementById(field.id)?.value;
        if (!value || value.trim() === '') {
            showToast(`❌ ${field.name}は必須項目です`);
            return;
        }
    }

    try {
        const data = collectFormData();
        data.status = 'completed';
        data.access_token = generateAccessToken();
        data.qr_code = `${window.location.origin}/customer.html?token=${data.access_token}`;

        if (currentRecordId) {
            await updateRecord(currentRecordId, data);
        } else {
            const record = await createRecord(data);
            currentRecordId = record.id;
        }

        // 写真を保存
        await savePhotos();

        showToast('✅ 整備記録を完了しました');

        // 確認ダイアログ
        if (confirm('整備記録を保存しました。\n帳票を出力しますか?')) {
            // PDF出力ページに遷移
            window.location.href = `pdf-output.html?id=${currentRecordId}`;
        } else {
            // 検索ページに戻る
            setTimeout(() => {
                window.location.href = 'search.html';
            }, 1000);
        }
    } catch (error) {
        console.error('保存エラー:', error);
        showToast('❌ 保存に失敗しました');
    }
}

// フォームデータを収集
function collectFormData() {
    // 車両情報
    const vehicleData = {
        client_name: document.getElementById('client-name')?.value || '',
        registration_number: document.getElementById('registration-number')?.value || '',
        car_model: document.getElementById('car-model')?.value || '',
        chassis_number: document.getElementById('chassis-number')?.value || '',
        engine_model: document.getElementById('engine-model')?.value || '',
        first_registration: document.getElementById('first-registration')?.value || '',
        mileage: parseFloat(document.getElementById('mileage')?.value) || 0,
        workshop_name: document.getElementById('workshop-name')?.value || '',
        inspection_date: document.getElementById('inspection-date')?.value || '',
        completion_date: document.getElementById('completion-date')?.value || '',
        mechanic_name: document.getElementById('mechanic-name')?.value || ''
    };

    // 点検データ
    vehicleData.inspection_data = JSON.stringify(inspectionData);

    // 交換部品（数量が入力されているもののみ）
    const parts = {};
    document.querySelectorAll('.replacement-quantity').forEach(input => {
        const partId = input.getAttribute('data-part-id');
        const quantity = input.value;
        if (quantity && parseFloat(quantity) > 0) {
            const partName = replacementParts.find(p => p.id === partId)?.name || '';
            const unit = replacementParts.find(p => p.id === partId)?.unit || '';
            parts[partName] = `${quantity} ${unit}`;
        }
    });
    vehicleData.replacement_parts = JSON.stringify(parts);

    // アドバイス
    vehicleData.advice = document.getElementById('advice')?.value || '';

    // 測定値
    const measurementData = {};
    measurements.forEach(m => {
        const value = document.getElementById(m.id)?.value;
        if (value) {
            measurementData[m.name] = value;
        }
    });
    vehicleData.measurements = JSON.stringify(measurementData);

    // タグ
    const tagsInput = document.getElementById('tags')?.value || '';
    vehicleData.tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

    return vehicleData;
}

// レコードを作成
async function createRecord(data) {
    return await API.createRecord('maintenance_records', data);
}

// レコードを更新
async function updateRecord(id, data) {
    return await API.updateRecord('maintenance_records', id, data);
}

// レコードを読み込み
async function loadRecord(id) {
    try {
        const record = await API.getRecord('maintenance_records', id);

        // フォームに値を設定
        document.getElementById('client-name').value = record.client_name || '';
        document.getElementById('registration-number').value = record.registration_number || '';
        document.getElementById('car-model').value = record.car_model || '';
        document.getElementById('chassis-number').value = record.chassis_number || '';
        document.getElementById('engine-model').value = record.engine_model || '';
        document.getElementById('first-registration').value = record.first_registration || '';
        document.getElementById('mileage').value = record.mileage || '';
        document.getElementById('workshop-name').value = record.workshop_name || '';
        document.getElementById('inspection-date').value = record.inspection_date || '';
        document.getElementById('completion-date').value = record.completion_date || '';
        document.getElementById('mechanic-name').value = record.mechanic_name || '';
        document.getElementById('tags').value = (record.tags || []).join(', ');
        document.getElementById('advice').value = record.advice || '';

        // 車両番号を表示
        document.getElementById('vehicle-display').textContent = record.registration_number || '未登録';

        // 点検データを復元
        if (record.inspection_data) {
            inspectionData = JSON.parse(record.inspection_data);
            Object.keys(inspectionData).forEach(itemId => {
                const data = inspectionData[itemId];
                const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
                if (itemElement) {
                    const button = itemElement.querySelector(`[data-code="${data.code}"]`);
                    if (button) {
                        button.classList.add('selected');
                        itemElement.classList.add('checked');
                    }
                }
            });
        }

        // 測定値を復元
        if (record.measurements) {
            const measurementData = JSON.parse(record.measurements);
            Object.keys(measurementData).forEach(name => {
                const m = measurements.find(m => m.name === name);
                if (m) {
                    document.getElementById(m.id).value = measurementData[name];
                }
            });
        }

        // 交換部品を復元
        if (record.replacement_parts) {
            const parts = JSON.parse(record.replacement_parts);
            Object.keys(parts).forEach(partName => {
                const part = replacementParts.find(p => p.name === partName);
                if (part) {
                    // "数量 単位" 形式から数量のみを抽出
                    const quantityStr = parts[partName].toString();
                    const quantity = quantityStr.split(' ')[0];
                    document.querySelector(`.replacement-quantity[data-part-id="${part.id}"]`).value = quantity;
                }
            });
        }

        // 写真を読み込み
        await loadPhotos(id);

        updateProgress();
        showToast('✅ レコードを読み込みました');
    } catch (error) {
        console.error('読み込みエラー:', error);
        showToast('❌ レコードの読み込みに失敗しました');
    }
}

// 写真を保存
async function savePhotos() {
    if (!currentRecordId) return;

    for (const itemId of Object.keys(photosData)) {
        const photos = photosData[itemId];
        for (const photo of photos) {
            const photoData = {
                record_id: currentRecordId,
                item_id: itemId,
                item_name: currentPhotoItemName,
                photo_url: photo.url,
                thumbnail_url: photo.url, // 実装では圧縮版を作成
                before_after: photo.beforeAfter,
                is_cover: photo.isCover,
                caption: '',
                photographer: document.getElementById('mechanic-name')?.value || '',
                photo_date: photo.timestamp,
                sort_order: photos.indexOf(photo)
            };

            await API.createRecord('inspection_photos', photoData);
        }
    }
}

// 写真を読み込み
async function loadPhotos(recordId) {
    try {
        const result = await API.getRecords('inspection_photos', { search: recordId, limit: 1000 });
        const photos = result.data || [];

        photosData = {};
        photos.forEach(photo => {
            if (!photosData[photo.item_id]) {
                photosData[photo.item_id] = [];
            }
            photosData[photo.item_id].push({
                id: photo.id,
                url: photo.photo_url,
                beforeAfter: photo.before_after,
                timestamp: photo.photo_date,
                isCover: photo.is_cover
            });

            // カメラボタンを更新
            updateCameraButton(photo.item_id);
        });
    } catch (error) {
        console.error('写真読み込みエラー:', error);
    }
}

// 記号説明パネルの開閉
function toggleLegend() {
    const panel = document.getElementById('legendPanel');
    panel.classList.toggle('show');
}

// トースト通知
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ユーティリティ関数
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateAccessToken() {
    return Array.from({length: 32}, () => Math.floor(Math.random() * 36).toString(36)).join('');
}
