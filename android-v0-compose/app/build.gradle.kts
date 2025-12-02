import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.parcelize")
}

//val defaultApiHost = "192.168.1.7"
// val defaultApiHost = "192.168.1.4"
//val defaultApiHost = "192.168.120.14"
//val defaultApiHost = "192.168.10.20"
//val defaultApiHost = "192.168.1.9"
//val defaultApiHost = "192.168.101.14"
//val defaultApiHost = "10.10.1.73"
//val defaultApiHost = "192.168.120.124"
//val defaultApiHost = "192.168.199.150"
val defaultApiHost = "192.168.1.7"
//val defaultApiHost = "10.10.1.75"
//val defaultApiHost = "192.168.124.112"
//val defaultApiHost = "192.168.1.12"
//val defaultApiHost = "192.168.0.106"
//val defaultApiHost = "192.168.10.76"
val defaultApiPort = 3001
val defaultApiPath = "api"

val defaultDuixBaseConfigUrl = "https://github.com/GuijiAI/duix.ai/releases/download/v1.0.0/gj_dh_res.zip"
// 预置在 assets/duix/model/Oliver.zip；URL 仅用于标识模型名，实际会优先从本地 assets 解压
val defaultDuixModelUrl = "https://duix-local/Oliver.zip"

val apiBaseUrl: String = (project.findProperty("API_BASE_URL") as String?)
    ?.trim()
    ?.takeIf { it.isNotEmpty() }
    ?: "http://$defaultApiHost:$defaultApiPort/$defaultApiPath/"
val normalizedApiBaseUrl = if (apiBaseUrl.endsWith("/")) apiBaseUrl else "$apiBaseUrl/"
val apiHostFromUrl = runCatching { URI(normalizedApiBaseUrl).host }.getOrNull()
val resolvedApiHost = apiHostFromUrl?.takeIf { it.isNotBlank() } ?: defaultApiHost

val duixBaseConfigUrl: String = (project.findProperty("DUIX_BASE_CONFIG_URL") as String?)
    ?.trim()
    ?.takeIf { it.isNotEmpty() }
    ?: defaultDuixBaseConfigUrl
val duixModelUrl: String = (project.findProperty("DUIX_MODEL_URL") as String?)
    ?.trim()
    ?.takeIf { it.isNotEmpty() }
    ?: defaultDuixModelUrl

val airiWebUrl: String = (project.findProperty("AIRI_WEB_URL") as String?)
    ?.trim()
    ?.takeIf { it.isNotEmpty() }
    ?: "http://10.10.1.10:3000/avatar"

fun String.escapeForBuildConfig(): String = this.replace("\"", "\\\"")

// 可选：通过 -PLIVE2D_CORE_INCLUDE 传入 Live2D Core 头文件目录

android {
    namespace = "com.xlwl.AiMian"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.xlwl.AiMian"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"${normalizedApiBaseUrl.escapeForBuildConfig()}\""
        )
        buildConfigField(
            "String",
            "API_HOST",
            "\"${resolvedApiHost.escapeForBuildConfig()}\""
        )
        buildConfigField(
            "String",
            "AIRI_WEB_URL",
            "\"${airiWebUrl.escapeForBuildConfig()}\""
        )
        buildConfigField(
            "String",
            "DUIX_BASE_CONFIG_URL",
            "\"${duixBaseConfigUrl.escapeForBuildConfig()}\""
        )
        buildConfigField(
            "String",
            "DUIX_MODEL_URL",
            "\"${duixModelUrl.escapeForBuildConfig()}\""
        )

        resValue("string", "api_host", resolvedApiHost)
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/INDEX.LIST"
            excludes += "META-INF/io.netty.versions.properties"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.03")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("com.google.android.material:material:1.12.0")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.8.0")
    implementation("io.coil-kt:coil-compose:2.6.0")
    implementation("io.coil-kt:coil-gif:2.6.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.4")

    // Retrofit for networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.9.3")
    implementation("com.squareup.okhttp3:logging-interceptor:4.9.3") // For logging

    // DataStore for auth token persistence
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Socket.IO client for WebSocket
    implementation("io.socket:socket.io-client:2.0.1")

    val cameraXVersion = "1.3.4"
    implementation("androidx.camera:camera-core:$cameraXVersion")
    implementation("androidx.camera:camera-camera2:$cameraXVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraXVersion")
    implementation("androidx.camera:camera-view:$cameraXVersion")
    implementation("com.infobip:google-webrtc:1.0.45036")
    implementation(project(":duix-sdk"))

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
