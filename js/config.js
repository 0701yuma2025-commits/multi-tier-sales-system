// Supabase設定
// 実際の値は環境に応じて設定してください

// デモ用のSupabase設定（本番環境では実際の値に置き換えてください）
window.SUPABASE_URL = 'https://aroplwctmqwwkwmvgzzz.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyb3Bsd2N0bXF3d2t3bXZnenp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxOTg4MDksImV4cCI6MjA3MTc3NDgwOX0.uCJNvh6CRtgxmPP9bMvvbYV2YPNYBZYb3kktydFwCc4';

// ローカル開発用の設定例
// window.SUPABASE_URL = 'https://aroplwctmqwwkwmvgzzz.supabase.co';
// window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyb3Bsd2N0bXF3d2t3bXZnenp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxOTg4MDksImV4cCI6MjA3MTc3NDgwOX0.uCJNvh6CRtgxmPP9bMvvbYV2YPNYBZYb3kktydFwCc4';

// 設定の検証
if (!window.SUPABASE_URL || window.SUPABASE_URL === 'https://your-project.supabase.co') {
    console.warn('Supabase URLが設定されていません。config.jsファイルを編集して実際の値を設定してください。');
}

if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY === 'your-anon-key') {
    console.warn('Supabase Anon Keyが設定されていません。config.jsファイルを編集して実際の値を設定してください。');
}