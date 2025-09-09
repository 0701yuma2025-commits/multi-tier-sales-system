// 代理店一括登録のSupabase対応機能

// 一括登録処理（Supabase対応版）
async function processBulkImportSupabase() {
    const activeTab = document.getElementById('csvImportContent').style.display === 'block' ? 'csv' : 'manual';
    let dataToImport = [];
    
    if (activeTab === 'csv') {
        // CSV データの処理
        dataToImport = csvData.filter(d => d.isValid);
        if (dataToImport.length === 0) {
            showError('有効なデータがありません');
            return;
        }
    } else {
        // 手動入力データの処理
        const entries = document.querySelectorAll('.manual-agency-entry');
        let hasError = false;
        
        for (const entry of entries) {
            const companyName = entry.querySelector('.manual-company-name').value.trim();
            const email = entry.querySelector('.manual-email').value.trim();
            const tier = parseInt(entry.querySelector('.manual-tier').value);
            const parentId = entry.querySelector('.manual-parent').value;
            
            if (!companyName || !email) {
                hasError = true;
                showError(`会社名とメールアドレスは必須です`);
                continue;
            }
            
            // Supabaseで重複チェック
            if (agenciesDb) {
                const { data: existing } = await agenciesDb.client
                    .from('agencies')
                    .select('id')
                    .eq('representative->>email', email)
                    .single();
                
                if (existing) {
                    hasError = true;
                    showError(`${email} は既に登録されています`);
                    continue;
                }
            }
            
            dataToImport.push({
                companyName,
                email,
                tier,
                parentId: parentId || null
            });
        }
        
        if (hasError || dataToImport.length === 0) {
            return;
        }
    }
    
    // 登録処理
    if (!confirm(`${dataToImport.length}件の代理店を登録しますか？`)) {
        return;
    }
    
    // プログレス表示
    const progressDiv = document.createElement('div');
    progressDiv.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <h4>登録処理中...</h4>
            <div style="margin: 20px 0;">
                <progress id="importProgress" max="${dataToImport.length}" value="0"></progress>
                <p id="importStatus">0 / ${dataToImport.length} 件処理済み</p>
            </div>
        </div>
    `;
    document.querySelector('#bulkImportModal .modal-content').appendChild(progressDiv);
    
    let successCount = 0;
    let errors = [];
    const progress = document.getElementById('importProgress');
    const status = document.getElementById('importStatus');
    
    // Supabaseに登録
    if (agenciesDb) {
        for (let i = 0; i < dataToImport.length; i++) {
            const data = dataToImport[i];
            
            try {
                // 代理店データを準備
                const agencyData = {
                    companyName: data.companyName,
                    companyType: data.companyType || 'corporation',
                    representativeName: data.representativeName || data.companyName + ' 代表',
                    email: data.email,
                    phone: data.phone || '',
                    tierLevel: data.tier,
                    parentAgencyId: data.parentId,
                    // CSVから追加フィールドがある場合
                    bankName: data.bankName || '',
                    branchName: data.branchName || '',
                    accountType: data.accountType || '',
                    accountNumber: data.accountNumber || '',
                    accountHolder: data.accountHolder || '',
                    invoiceRegistered: data.invoiceRegistered === 'true' || data.invoiceRegistered === true,
                    invoiceNumber: data.invoiceNumber || ''
                };
                
                await agenciesDb.createAgency(agencyData);
                successCount++;
            } catch (error) {
                // console.error(`登録エラー (${data.email}):`, error);
                errors.push(`${data.companyName} (${data.email}): ${error.message}`);
            }
            
            // プログレス更新
            progress.value = i + 1;
            status.textContent = `${i + 1} / ${dataToImport.length} 件処理済み`;
        }
        
        // リストを更新
        await loadAgenciesData();
    } else {
        // デモモード（既存の処理）
        dataToImport.forEach(data => {
            const newAgency = {
                id: String(agencies.length + 1).padStart(3, '0'),
                name: data.companyName,
                email: data.email,
                tier: data.tier,
                parentId: data.parentId,
                parentName: data.parentName || '-',
                sales: 0,
                commission: 0,
                status: 'pending',
                registeredDate: new Date().toISOString().split('T')[0],
                commissionRate: [0, 30, 25, 20, 15][data.tier]
            };
            
            agencies.push(newAgency);
            successCount++;
        });
        
        filterAgencies();
    }
    
    // 結果表示
    progressDiv.remove();
    closeModal('bulkImportModal');
    
    // フォームをリセット
    document.getElementById('csvFile').value = '';
    document.getElementById('csvPreview').style.display = 'none';
    csvData = [];
    
    // 結果メッセージ
    let message = `${successCount}件の代理店を登録しました`;
    if (errors.length > 0) {
        message += `\n\n【エラー】\n${errors.join('\n')}`;
    }
    
    if (errors.length > 0) {
        showError(message);
    } else {
        showSuccess(message);
    }
}

// CSVサンプルダウンロード関数の更新（windowに登録してoverride可能にする）
window.downloadCSVSample = function() {
    const csvContent = `会社名,メールアドレス,階層,親代理店ID,代表者名,電話番号,法人/個人,銀行名,支店名,口座種別,口座番号,口座名義,インボイス登録,インボイス番号
株式会社サンプル,sample@example.com,1,,山田太郎,03-1234-5678,corporation,みずほ銀行,東京支店,普通,1234567,株式会社サンプル,true,T1234567890123
個人事業主サンプル,kojin@example.com,2,,田中花子,090-1234-5678,individual,三菱UFJ銀行,渋谷支店,普通,7654321,田中花子,false,`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'agencies_import_sample.csv';
    link.click();
}

// CSVファイル処理の更新（windowに登録してoverride可能にする）
window.handleCSVFile = function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        csvData = [];
        const preview = document.getElementById('csvPreview');
        preview.innerHTML = '';
        preview.style.display = 'block';
        
        // ヘッダー確認
        const requiredHeaders = ['会社名', 'メールアドレス', '階層'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            preview.innerHTML = `<div class="error-message">必須列が不足しています: ${missingHeaders.join(', ')}</div>`;
            return;
        }
        
        // データ処理
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',').map(v => v.trim());
            const data = {};
            
            headers.forEach((header, index) => {
                data[header] = values[index] || '';
            });
            
            // データ検証とマッピング
            const rowData = {
                companyName: data['会社名'],
                email: data['メールアドレス'],
                tier: parseInt(data['階層']) || 1,
                parentId: data['親代理店ID'] || null,
                representativeName: data['代表者名'] || '',
                phone: data['電話番号'] || '',
                companyType: data['法人/個人'] === 'individual' ? 'individual' : 'corporation',
                bankName: data['銀行名'] || '',
                branchName: data['支店名'] || '',
                accountType: data['口座種別'] || '',
                accountNumber: data['口座番号'] || '',
                accountHolder: data['口座名義'] || '',
                invoiceRegistered: data['インボイス登録'] === 'true' || data['インボイス登録'] === '○',
                invoiceNumber: data['インボイス番号'] || '',
                isValid: true,
                errors: []
            };
            
            // バリデーション
            if (!rowData.companyName) {
                rowData.isValid = false;
                rowData.errors.push('会社名は必須です');
            }
            
            if (!rowData.email || !rowData.email.includes('@')) {
                rowData.isValid = false;
                rowData.errors.push('有効なメールアドレスを入力してください');
            }
            
            if (rowData.tier < 1 || rowData.tier > 4) {
                rowData.isValid = false;
                rowData.errors.push('階層は1〜4の範囲で入力してください');
            }
            
            csvData.push(rowData);
        }
        
        // プレビュー表示
        displayCSVPreview();
    };
    
    reader.readAsText(file, 'UTF-8');
};

// プレビュー表示関数（既存の関数が定義されていない場合のみ定義）
if (typeof displayCSVPreview === 'undefined') {
    window.displayCSVPreview = function() {
    const preview = document.getElementById('csvPreview');
    const validCount = csvData.filter(d => d.isValid).length;
    const invalidCount = csvData.filter(d => !d.isValid).length;
    
    let html = `
        <div style="margin-bottom: 16px;">
            <span style="color: #059669;">✓ 有効: ${validCount}件</span>
            ${invalidCount > 0 ? `<span style="color: #dc2626; margin-left: 16px;">✗ 無効: ${invalidCount}件</span>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">状態</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">会社名</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">メールアドレス</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">階層</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">エラー</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    csvData.forEach((data, index) => {
        if (index < 10) { // 最初の10件のみ表示
            html += `
                <tr style="background: ${data.isValid ? 'white' : '#fee2e2'};">
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">
                        ${data.isValid ? '✓' : '✗'}
                    </td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${data.companyName}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${data.email}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">Tier ${data.tier}</td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626;">
                        ${data.errors.join(', ')}
                    </td>
                </tr>
            `;
        }
    });
    
    if (csvData.length > 10) {
        html += `
            <tr>
                <td colspan="5" style="padding: 8px; text-align: center; color: #6b7280;">
                    他 ${csvData.length - 10} 件...
                </td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    preview.innerHTML = html;
    };
}