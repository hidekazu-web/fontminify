#!/bin/bash

# FontMinify - コード署名セットアップスクリプト
# macOS向けアプリケーションのコード署名準備

set -e

echo "🔐 FontMinify - コード署名セットアップ"
echo "=================================="

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. 開発者証明書の確認
echo ""
log_info "開発者証明書の確認中..."

# Apple Developer Program の証明書があるかチェック
DEVELOPER_CERTS=$(security find-identity -v -p codesigning | grep -c "Developer ID Application:" || echo "0")
DISTRIBUTION_CERTS=$(security find-identity -v -p codesigning | grep -c "Mac Developer:" || echo "0")

if [ "$DEVELOPER_CERTS" -gt 0 ]; then
    log_success "Developer ID Application証明書が見つかりました ($DEVELOPER_CERTS個)"
    security find-identity -v -p codesigning | grep "Developer ID Application:"
elif [ "$DISTRIBUTION_CERTS" -gt 0 ]; then
    log_success "Mac Developer証明書が見つかりました ($DISTRIBUTION_CERTS個)"
    security find-identity -v -p codesigning | grep "Mac Developer:"
else
    log_error "コード署名用の証明書が見つかりません"
    echo ""
    echo "必要な手順:"
    echo "1. Apple Developer Programに登録"
    echo "2. Xcode > Preferences > Accounts でApple IDを追加"
    echo "3. 証明書をダウンロード・インストール"
    echo ""
    echo "詳細: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution"
    exit 1
fi

# 2. 証明書の有効期限チェック
echo ""
log_info "証明書の有効期限を確認中..."

# 最初の証明書の詳細を取得
CERT_NAME=$(security find-identity -v -p codesigning | grep -E "(Developer ID Application|Mac Developer)" | head -1 | sed 's/.*) "//' | sed 's/".*//')

if [ -n "$CERT_NAME" ]; then
    CERT_DETAILS=$(security find-certificate -c "$CERT_NAME" -p | openssl x509 -text -noout)
    EXPIRY_DATE=$(echo "$CERT_DETAILS" | grep "Not After" | sed 's/.*Not After : //')
    
    log_success "使用する証明書: $CERT_NAME"
    log_info "有効期限: $EXPIRY_DATE"
    
    # 有効期限まで30日を切っている場合は警告
    EXPIRY_TIMESTAMP=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null || echo "0")
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
    
    if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ] && [ "$DAYS_UNTIL_EXPIRY" -gt 0 ]; then
        log_warning "証明書の有効期限まで ${DAYS_UNTIL_EXPIRY}日です。更新を検討してください。"
    elif [ "$DAYS_UNTIL_EXPIRY" -le 0 ]; then
        log_error "証明書が期限切れです。新しい証明書を取得してください。"
        exit 1
    else
        log_success "証明書は有効です（あと ${DAYS_UNTIL_EXPIRY}日）"
    fi
fi

# 3. キーチェーンアクセスの確認
echo ""
log_info "キーチェーンアクセスを確認中..."

KEYCHAIN_STATUS=$(security list-keychains | grep -c "login.keychain" || echo "0")
if [ "$KEYCHAIN_STATUS" -gt 0 ]; then
    log_success "ログインキーチェーンにアクセス可能です"
else
    log_warning "キーチェーンの設定に問題がある可能性があります"
fi

# 4. 環境変数設定ファイルの作成
echo ""
log_info "環境変数設定ファイルを作成中..."

ENV_FILE=".env.codesign"
cat > "$ENV_FILE" << EOF
# FontMinify - コード署名設定
# このファイルはgitignoreに追加されています

# コード署名用証明書名
CSC_NAME="$CERT_NAME"

# Apple ID（App Store Connect用）
# APPLE_ID="your-apple-id@example.com"

# App固有パスワード（App Store Connect用）
# APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"

# Team ID（開発者アカウント）
# APPLE_TEAM_ID="YOUR_TEAM_ID"

# Notarization（公証）の有効化
# CSC_NOTARIZE=true

# DMGファイル名
DMG_NAME="FontMinify-\${version}-macOS"

# 署名後の検証を有効化
VERIFY_SIGNATURE=true

EOF

log_success "環境変数設定ファイルを作成しました: $ENV_FILE"

# 5. package.jsonの更新確認
echo ""
log_info "package.jsonのelectron-builder設定を確認中..."

if ! grep -q '"mac":' package.json; then
    log_warning "package.jsonにmacOS用のelectron-builder設定が見つかりません"
    
    echo ""
    echo "package.jsonに以下の設定を追加することを推奨します:"
    echo ""
    cat << 'EOF'
"build": {
  "mac": {
    "category": "public.app-category.graphics-design",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist",
    "notarize": {
      "teamId": "YOUR_TEAM_ID"
    }
  },
  "dmg": {
    "background": "build/dmg-background.png",
    "iconSize": 100,
    "contents": [
      {
        "x": 380,
        "y": 280,
        "type": "link",
        "path": "/Applications"
      },
      {
        "x": 110,
        "y": 280,
        "type": "file"
      }
    ],
    "window": {
      "width": 540,
      "height": 380
    }
  }
}
EOF
else
    log_success "electron-builderのmacOS設定が見つかりました"
fi

# 6. entitlements.mac.plistの作成
echo ""
log_info "entitlements.mac.plistを作成中..."

mkdir -p build
cat > "build/entitlements.mac.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.debugger</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.files.downloads.read-write</key>
  <true/>
</dict>
</plist>
EOF

log_success "entitlements.mac.plistを作成しました"

# 7. .gitignoreの更新
echo ""
log_info ".gitignoreを更新中..."

if ! grep -q ".env.codesign" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# コード署名関連" >> .gitignore
    echo ".env.codesign" >> .gitignore
    echo "*.p12" >> .gitignore
    echo "*.mobileprovision" >> .gitignore
    log_success ".gitignoreにコード署名関連ファイルを追加しました"
else
    log_success ".gitignoreは既に適切に設定されています"
fi

# 8. セットアップ完了メッセージ
echo ""
echo "🎉 コード署名セットアップが完了しました！"
echo ""
echo "次の手順:"
echo "1. $ENV_FILE を編集してApple IDとチームIDを設定"
echo "2. npm run dist:mac でDMGファイルを作成"
echo "3. 必要に応じて公証（Notarization）を設定"
echo ""
echo "参考リンク:"
echo "- Apple Developer Program: https://developer.apple.com/programs/"
echo "- electron-builder: https://www.electron.build/configuration/mac"
echo "- Notarization Guide: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution"
echo ""

# 9. 次回実行用のスクリプト作成
cat > "scripts/codesign-verify.sh" << 'EOF'
#!/bin/bash
# コード署名の検証

echo "🔍 FontMinify - コード署名検証"

APP_PATH="dist/mac/FontMinify.app"
DMG_PATH="dist/FontMinify-*.dmg"

if [ -d "$APP_PATH" ]; then
    echo "アプリケーションの署名を検証中..."
    codesign --verify --verbose "$APP_PATH"
    spctl --assess --verbose "$APP_PATH"
else
    echo "⚠️ アプリケーションが見つかりません: $APP_PATH"
fi

if ls $DMG_PATH 1> /dev/null 2>&1; then
    echo "DMGファイルの署名を検証中..."
    for dmg in $DMG_PATH; do
        codesign --verify --verbose "$dmg"
        spctl --assess --type open --context context:primary-signature --verbose "$dmg"
    done
else
    echo "⚠️ DMGファイルが見つかりません"
fi
EOF

chmod +x "scripts/codesign-verify.sh"
log_success "検証スクリプトを作成しました: scripts/codesign-verify.sh"

log_success "セットアップスクリプトの実行が完了しました"