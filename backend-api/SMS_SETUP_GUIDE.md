# 📱 登录验证码短信配置指南

本文档介绍如何在 `backend-api` 服务中启用短信验证码，包括使用腾讯云、阿里云短信服务以及本地调试用的固定验证码模式。

## 1. 基础配置

1. 复制环境模板：
   ```bash
   cp backend-api/env.example backend-api/.env
   ```
2. 根据需要设置下列通用变量：
   | 变量 | 说明 | 默认值 |
   | --- | --- | --- |
   | `SMS_PROVIDER` | 可选：设置为 `mock`、`aliyun`、`tencent`，或留空由系统根据配置自动检测 | 空 |
   | `SMS_DEFAULT_COUNTRY_CODE` | 未带国家码时的默认国家码 | `+86` |
   | `LOGIN_CODE_FIXED_CODE` | （可选）固定验证码，便于演示/联调 | 空 |
   | `LOGIN_CODE_SKIP_SMS` | （可选）设为 `true` 时跳过短信发送，仅返回验证码 | `false` |

> ⚠️ 当设置 `LOGIN_CODE_FIXED_CODE` 时，接口始终生成该验证码。请确保在测试环境使用，避免生产环境误用。

配置完成后，重启 `backend-api` 服务以加载最新变量：
```bash
cd backend-api
npm run dev
```

## 2. 腾讯云短信服务

1. 在 [腾讯云短信控制台](https://console.cloud.tencent.com/sms) 申请以下资源：
   - **短信签名**（如：`AI面试系统`）
   - **短信模板**（模板内容需包含变量 `${code}`）
   - **应用 SDK AppID**
2. 在“访问密钥”页面创建或获取 `SecretId` 与 `SecretKey`。
3. 在 `.env` 中填写：
   ```env
   # 也可以留空，服务会在检测到腾讯云配置后自动启用
   SMS_PROVIDER="tencent"
   TENCENT_SMS_SECRET_ID="AKIDxxxxxxxxxxxxxxxx"
   TENCENT_SMS_SECRET_KEY="xxxxxxxxxxxxxxxx"
   TENCENT_SMS_SIGN_NAME="AI面试系统"
   TENCENT_SMS_TEMPLATE_ID="1234567"
   TENCENT_SMS_SDK_APP_ID="1400xxxxxx"
   TENCENT_SMS_REGION="ap-guangzhou"  # 可按需调整
   ```
4. 安装依赖并重新构建（如果尚未执行）：
   ```bash
   cd backend-api
   npm install
   npm run build
   ```
5. 验证：调用 `/api/auth/send-code` 接口，短信应发送至目标号码。控制台若打印 `SendSms` 返回值，即表示调用成功。

## 3. 阿里云短信服务

1. 在 [阿里云短信服务控制台](https://dysms.console.aliyun.com/) 申请：
   - **短信签名**（如：`AI面试系统`）
   - **短信模板**（模板内容需包含 `${code}` 或自定义变量）
2. 在 RAM 控制台创建具有短信发送权限的子账号，并记录 `AccessKeyId` 与 `AccessKeySecret`。
3. 在 `.env` 中填写：
   ```env
   # 也可以留空，服务会在检测到阿里云配置后自动启用
   SMS_PROVIDER="aliyun"
   ALIYUN_SMS_ACCESS_KEY_ID="LTAIxxxxxxxxxxxxx"
   ALIYUN_SMS_ACCESS_KEY_SECRET="xxxxxxxxxxxxxxxx"
   ALIYUN_SMS_SIGN_NAME="AI面试系统"
   ALIYUN_SMS_TEMPLATE_CODE="SMS_123456789"
   ALIYUN_SMS_REGION="cn-hangzhou"
   ALIYUN_SMS_ENDPOINT="dysmsapi.aliyuncs.com"  # 可选：特殊地域可覆盖
   ALIYUN_SMS_CODE_PARAM="code"  # 若模板变量名不同，请同步修改
   ```
   > 🔐 **安全提示：** AccessKey ID/Secret 为敏感信息，仅写入 `.env` 或部署平台环境变量，切勿提交到版本仓库。
4. 安装依赖并重新构建（如果尚未执行）：
   ```bash
   cd backend-api
   npm install
   npm run build
   ```
5. 验证：触发验证码接口，短信应送达到配置的手机号。若失败，可在阿里云控制台查看错误码排查。
6. 当 `SMS_PROVIDER` 设置为 `aliyun` 且未开启 `LOGIN_CODE_SKIP_SMS` 时，接口响应将不再返回 `code` 字段，请在客户端输入短信中的验证码。

## 4. 本地联调 / 演示模式

若暂时无法接入真实短信服务，可使用以下两种方式：

1. **Mock 模式**（默认）：
   - 将 `SMS_PROVIDER` 保持为 `mock`。
   - 后端会在控制台打印短信内容，接口响应中也会附带验证码（仅在 `NODE_ENV !== 'production'` 时）。

2. **固定验证码**：
   ```env
   LOGIN_CODE_FIXED_CODE="123456"
   LOGIN_CODE_SKIP_SMS=true
   ```
   - 所有手机号均使用 `123456` 验证码。
   - 适用于演示或前端联调；此模式会在接口响应中返回验证码，方便调试。

完成配置后即可根据业务需要选择真实短信或模拟模式，切换无需改动代码。
