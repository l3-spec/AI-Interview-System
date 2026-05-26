#!/bin/bash

# 客户端配置管理系统 - 快速测试脚本
# 用途：验证配置加载和更新流程

set -e

echo "======================================"
echo " 客户端配置管理系统 - 快速测试"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查后端配置
echo -e "${YELLOW}[1/5] 检查后端配置...${NC}"
if grep -q "CONFIG_VERSION=" backend-api/.env; then
    VERSION=$(grep "CONFIG_VERSION=" backend-api/.env | cut -d'=' -f2)
    echo -e "${GREEN}✅ 后端配置版本号: $VERSION${NC}"
else
    echo -e "${RED}❌ 后端未配置 CONFIG_VERSION${NC}"
    exit 1
fi
echo ""

# 2. 检查后端接口
echo -e "${YELLOW}[2/5] 测试后端配置接口...${NC}"
RESPONSE=$(curl -s http://localhost:3001/api/client-runtime-config 2>/dev/null || echo "FAILED")

if [ "$RESPONSE" != "FAILED" ]; then
    SERVER_VERSION=$(echo $RESPONSE | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ 后端接口返回版本号: $SERVER_VERSION${NC}"
    
    if [ "$VERSION" != "$SERVER_VERSION" ]; then
        echo -e "${YELLOW}⚠️  警告：.env 中的版本与接口返回不一致${NC}"
    fi
else
    echo -e "${RED}❌ 后端接口无法访问，请确保服务已启动${NC}"
    echo "   运行: cd backend-api && npm run dev"
    exit 1
fi
echo ""

# 3. 检查 Android 依赖
echo -e "${YELLOW}[3/5] 检查 Android 依赖...${NC}"
if grep -q "security-crypto" android-v0-compose/app/build.gradle.kts; then
    echo -e "${GREEN}✅ EncryptedSharedPreferences 依赖已添加${NC}"
else
    echo -e "${RED}❌ 缺少 security-crypto 依赖${NC}"
    exit 1
fi

if grep -q "lifecycle-runtime-ktx" android-v0-compose/app/build.gradle.kts; then
    echo -e "${GREEN}✅ Lifecycle 依赖已添加${NC}"
else
    echo -e "${RED}❌ 缺少 lifecycle 依赖${NC}"
    exit 1
fi
echo ""

# 4. 检查 Android 文件
echo -e "${YELLOW}[4/5] 检查 Android 文件...${NC}"

FILES=(
    "android-v0-compose/app/src/main/java/com/xlwl/AiMian/AiMianApplication.kt"
    "android-v0-compose/app/src/main/java/com/xlwl/AiMian/di/AppModule.kt"
    "android-v0-compose/app/src/main/java/com/xlwl/AiMian/data/local/EncryptedConfigStore.kt"
    "android-v0-compose/app/src/main/java/com/xlwl/AiMian/data/repository/ClientRuntimeConfigRepository.kt"
    "android-v0-compose/app/src/main/java/com/xlwl/AiMian/config/ConfigUpdateStrategy.kt"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        FILENAME=$(basename $file)
        echo -e "${GREEN}✅ $FILENAME${NC}"
    else
        echo -e "${RED}❌ 缺失: $file${NC}"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = false ]; then
    exit 1
fi
echo ""

# 5. 检查 AndroidManifest
echo -e "${YELLOW}[5/5] 检查 AndroidManifest.xml...${NC}"
if grep -q 'android:name=".AiMianApplication"' android-v0-compose/app/src/main/AndroidManifest.xml; then
    echo -e "${GREEN}✅ Application 已注册${NC}"
else
    echo -e "${RED}❌ AndroidManifest 中未注册 AiMianApplication${NC}"
    exit 1
fi
echo ""

# 总结
echo "======================================"
echo -e "${GREEN} ✅ 所有检查通过！${NC}"
echo "======================================"
echo ""
echo "下一步："
echo "  1. 编译 Android 项目: cd android-v0-compose && ./gradlew assembleDebug"
echo "  2. 安装到设备: adb install -r app/build/outputs/apk/debug/app-debug.apk"
echo "  3. 查看日志: adb logcat | grep -E 'AiMianApplication|ConfigRepository|EncryptedConfigStore'"
echo ""
echo "测试场景："
echo "  - 首次启动：应该看到从服务器获取配置"
echo "  - 二次启动：应该看到从本地缓存读取（< 50ms）"
echo "  - 修改版本号后：应该看到自动更新配置"
echo ""
