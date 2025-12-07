// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "AIInterviewSystemIOS",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "AIInterviewApp",
            targets: ["AIInterviewApp"]
        )
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "AIInterviewApp",
            path: "Sources",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
