// 点検項目データ定義
const inspectionItems = {
    engine: [
        {
            category: 'パワー・ステアリング',
            items: [
                {
                    id: 'engine_ps_belt',
                    name: 'ベルトの緩み、損傷',
                    codes: ['✓', '×', 'A', 'P', '/'],
                    required: false
                }
            ]
        },
        {
            category: '冷却装置',
            items: [
                {
                    id: 'engine_cool_fan_belt',
                    name: 'ファンベルトの緩み、損傷',
                    codes: ['✓', '×', 'A', 'P', '/'],
                    required: false
                },
                {
                    id: 'engine_cool_leak',
                    name: '冷却水の漏れ',
                    codes: ['✓', '×', 'L', '△', '/'],
                    required: false
                }
            ]
        },
        {
            category: '点火装置',
            items: [
                {
                    id: 'engine_spark_plug',
                    name: 'スパーク・プラグの状態',
                    codes: ['✓', '×', 'C', 'P', '/'],
                    required: true
                }
            ]
        },
        {
            category: 'バッテリ',
            items: [
                {
                    id: 'engine_battery',
                    name: 'ターミナル部の緩み、腐食',
                    codes: ['✓', '×', 'C', 'T', '/'],
                    required: false
                }
            ]
        },
        {
            category: 'エア・クリーナ',
            items: [
                {
                    id: 'engine_air_filter',
                    name: 'エレメントの状態',
                    codes: ['✓', '×', 'C', 'P', '/'],
                    required: false
                }
            ]
        }
    ],
    interior: [
        {
            category: 'ブレーキ・ペダル',
            items: [
                {
                    id: 'interior_brake_pedal',
                    name: '遊び、踏み込んだときの床板とのすき間',
                    codes: ['✓', '×', 'A', '△', '/'],
                    required: false
                },
                {
                    id: 'interior_brake_effect',
                    name: 'ブレーキの効き具合',
                    codes: ['✓', 'A', '△', 'P'],
                    required: true
                }
            ]
        },
        {
            category: 'パーキング・ブレーキ',
            items: [
                {
                    id: 'interior_parking_brake',
                    name: '引きしろ（踏みしろ）',
                    codes: ['✓', '×', 'A', '△', '/'],
                    required: false
                }
            ]
        },
        {
            category: 'クラッチ・ペダル',
            items: [
                {
                    id: 'interior_clutch',
                    name: '遊び、切れたときの床板とのすき間',
                    codes: ['✓', '×', 'A', '△', '/'],
                    required: false
                }
            ]
        }
    ],
    undercarriage: [
        {
            category: 'ブレーキ・ディスク、ドラム',
            items: [
                {
                    id: 'under_brake_pad',
                    name: 'ブレーキ・パッドの摩耗',
                    codes: ['✓', '×', 'C', '○', '/'],
                    required: true
                }
            ]
        },
        {
            category: 'タイヤ',
            items: [
                {
                    id: 'under_tire_pressure',
                    name: 'タイヤの空気圧',
                    codes: ['✓', 'A', 'L', 'P'],
                    required: true
                },
                {
                    id: 'under_tire_tread',
                    name: 'タイヤの溝の深さ、異常な摩耗',
                    codes: ['✓', '×', '△', 'P'],
                    required: true
                }
            ]
        },
        {
            category: 'ホイール',
            items: [
                {
                    id: 'under_wheel_nut',
                    name: 'ナット、ボルトの緩み',
                    codes: ['✓', '×', 'T', 'P', '/'],
                    required: false
                }
            ]
        }
    ],
    bottom: [
        {
            category: 'エンジンオイル',
            items: [
                {
                    id: 'bottom_oil_leak',
                    name: 'オイルの漏れ',
                    codes: ['✓', '×', 'L', '△', '/'],
                    required: true
                }
            ]
        },
        {
            category: 'トランスミッション',
            items: [
                {
                    id: 'bottom_trans_oil',
                    name: 'オイルの漏れ、量',
                    codes: ['✓', '×', 'L', '△', '/'],
                    required: false
                }
            ]
        }
    ]
};

// 交換部品データ
const replacementParts = [
    { id: 'engine_oil', name: 'エンジン・オイル', unit: 'L' },
    { id: 'oil_filter', name: 'オイル・フィルタ', unit: '個' },
    { id: 'llc', name: 'LLC (ロング・ライフ・クーラント)', unit: 'L' },
    { id: 'brake_fluid', name: 'ブレーキ・フルード', unit: 'L' },
    { id: 'air_filter', name: 'エア・フィルタ', unit: '個' },
    { id: 'spark_plug', name: 'スパーク・プラグ', unit: '本' },
    { id: 'wiper_blade', name: 'ワイパー・ブレード', unit: '本' },
    { id: 'battery', name: 'バッテリ', unit: '個' }
];

// 測定値データ
const measurements = [
    { id: 'co_idle', name: 'CO濃度（アイドリング時）', unit: '%', placeholder: '0.0' },
    { id: 'hc', name: 'HC濃度', unit: 'ppm', placeholder: '0' },
    { id: 'tire_fl', name: 'タイヤ溝の深さ（前輪左）', unit: 'mm', placeholder: '10.0' },
    { id: 'tire_fr', name: 'タイヤ溝の深さ（前輪右）', unit: 'mm', placeholder: '10.0' },
    { id: 'tire_rl', name: 'タイヤ溝の深さ（後輪左）', unit: 'mm', placeholder: '10.0' },
    { id: 'tire_rr', name: 'タイヤ溝の深さ（後輪右）', unit: 'mm', placeholder: '10.0' },
    { id: 'brake_pad_fl', name: 'ブレーキ・パッド厚さ（前輪左）', unit: 'mm', placeholder: '4.4' },
    { id: 'brake_pad_fr', name: 'ブレーキ・パッド厚さ（前輪右）', unit: 'mm', placeholder: '4.4' },
    { id: 'brake_pad_rl', name: 'ブレーキ・パッド厚さ（後輪左）', unit: 'mm', placeholder: '8.4' },
    { id: 'brake_pad_rr', name: 'ブレーキ・パッド厚さ（後輪右）', unit: 'mm', placeholder: '8.7' }
];
