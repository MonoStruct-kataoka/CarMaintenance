// グローバル変数
let currentRecord = null;
let currentPhotos = [];
let qrCodeDataUrl = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');

    if (!recordId) {
        alert('レコードIDが指定されていません');
        history.back();
        return;
    }

    loadData(recordId);
});

// データを読み込み
async function loadData(recordId) {
    try {
        // レコードを読み込み
        currentRecord = await API.getRecord('maintenance_records', recordId);

        // 写真を読み込み
        const result = await API.getRecords('inspection_photos', { search: recordId, limit: 1000 });
        currentPhotos = result.data || [];

        // QRコードを生成
        if (currentRecord.qr_code) {
            await generateQRCode(currentRecord.qr_code);
        }

        // 画面を更新
        updateDisplay();

        // ローディングを非表示
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('content-area').style.display = 'block';
    } catch (error) {
        console.error('読み込みエラー:', error);
        alert('データの読み込みに失敗しました');
        history.back();
    }
}

// 表示を更新
function updateDisplay() {
    document.getElementById('display-registration').textContent = currentRecord.registration_number || '-';
    document.getElementById('display-client').textContent = currentRecord.client_name || '-';
    document.getElementById('display-date').textContent = formatDate(currentRecord.inspection_date) || '-';
    document.getElementById('qr-url').textContent = currentRecord.qr_code || '-';
}

// QRコードを生成
async function generateQRCode(url) {
    return new Promise((resolve, reject) => {
        const canvas = document.getElementById('qr-canvas');
        QRCode.toCanvas(canvas, url, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, (error) => {
            if (error) {
                console.error('QRコード生成エラー:', error);
                reject(error);
            } else {
                qrCodeDataUrl = canvas.toDataURL();
                resolve();
            }
        });
    });
}

// PDFプレビュー
function previewPDF() {
    alert('プレビュー機能は現在開発中です。\n「PDF出力」ボタンでダウンロードできます。');
}

// PDF出力
async function downloadPDF() {
    try {
        showLoading('PDF生成中...');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a3'
        });

        // タイトル
        doc.setFontSize(18);
        doc.text('特定整備記録簿（1年定期点検整備用）', 210, 20, { align: 'center' });

        // 車両情報
        doc.setFontSize(12);
        let y = 40;
        doc.text(`依頼者: ${currentRecord.client_name}`, 20, y);
        y += 8;
        doc.text(`車両番号: ${currentRecord.registration_number}`, 20, y);
        y += 8;
        doc.text(`車名・型式: ${currentRecord.car_model}`, 20, y);
        y += 8;
        doc.text(`走行距離: ${currentRecord.mileage ? currentRecord.mileage.toLocaleString() + ' km' : '-'}`, 20, y);
        y += 8;
        doc.text(`点検日: ${formatDate(currentRecord.inspection_date)}`, 20, y);
        y += 15;

        // 点検結果
        doc.setFontSize(14);
        doc.text('点検結果', 20, y);
        y += 10;

        doc.setFontSize(10);
        const inspectionData = currentRecord.inspection_data ? JSON.parse(currentRecord.inspection_data) : {};
        
        if (Object.keys(inspectionData).length > 0) {
            Object.entries(inspectionData).forEach(([itemId, data]) => {
                const itemName = getItemNameFromId(itemId);
                doc.text(`${itemName}: ${data.code}`, 20, y);
                y += 6;
                
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
        } else {
            doc.text('点検データなし', 20, y);
            y += 6;
        }

        y += 10;

        // 交換部品
        const replacementParts = currentRecord.replacement_parts ? JSON.parse(currentRecord.replacement_parts) : {};
        if (Object.keys(replacementParts).length > 0 && document.getElementById('option-photos').checked) {
            doc.setFontSize(14);
            doc.text('交換部品', 20, y);
            y += 10;

            doc.setFontSize(10);
            Object.entries(replacementParts).forEach(([name, quantity]) => {
                doc.text(`${name}: ${quantity}`, 20, y);
                y += 6;
            });

            y += 10;
        }

        // 測定値
        const measurements = currentRecord.measurements ? JSON.parse(currentRecord.measurements) : {};
        if (Object.keys(measurements).length > 0 && document.getElementById('option-measurements').checked) {
            doc.setFontSize(14);
            doc.text('測定値', 20, y);
            y += 10;

            doc.setFontSize(10);
            Object.entries(measurements).forEach(([name, value]) => {
                doc.text(`${name}: ${value}`, 20, y);
                y += 6;
            });

            y += 10;
        }

        // QRコード
        if (qrCodeDataUrl && document.getElementById('option-qr').checked) {
            if (y > 220) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(12);
            doc.text('お客様専用ページ（詳細・全写真閲覧可）', 20, y);
            y += 10;
            doc.addImage(qrCodeDataUrl, 'PNG', 20, y, 40, 40);
            y += 45;
            doc.setFontSize(8);
            doc.text(currentRecord.qr_code, 20, y);
        }

        // 凡例
        if (document.getElementById('option-legend').checked) {
            if (y > 240) {
                doc.addPage();
                y = 20;
            }
            y += 10;
            doc.setFontSize(12);
            doc.text('【凡例】', 20, y);
            y += 8;
            doc.setFontSize(9);
            const legend = '✓:良好 ×:交換 A:調整 C:清掃 P:省略 ○:特定整備 △:修理 T:締付 L:給油(水) /:該当なし';
            doc.text(legend, 20, y);
        }

        // ファイル名を生成
        const filename = `整備記録_${currentRecord.registration_number.replace(/\s/g, '')}_${formatDateForFilename(currentRecord.inspection_date)}.pdf`;

        // PDFを保存
        doc.save(filename);

        hideLoading();
        showToast('✅ PDFを出力しました');
    } catch (error) {
        console.error('PDF生成エラー:', error);
        hideLoading();
        alert('PDF生成に失敗しました');
    }
}

// 項目名を取得
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

// ローディング表示
function showLoading(message) {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 15px;
        text-align: center;
    `;
    content.innerHTML = `
        <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;"></i>
        <p style="font-size: 16px; color: #333;">${message}</p>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// ローディング非表示
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// トースト通知
function showToast(message) {
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

function formatDateForFilename(dateString) {
    if (!dateString) return 'unknown';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0].replace(/-/g, '');
}
