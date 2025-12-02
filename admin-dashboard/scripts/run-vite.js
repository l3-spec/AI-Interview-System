#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, chmodSync } = require('node:fs');
const { join, resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const viteBin = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

const args = process.argv.slice(2);

const run = (command, commandArgs) =>
  spawnSync(command, commandArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env
  });

const isMacArm = process.platform === 'darwin' && process.arch === 'arm64';
const armBinaryDir = join(projectRoot, 'node_modules', '@esbuild', 'darwin-arm64');
const x64BinaryDir = join(projectRoot, 'node_modules', '@esbuild', 'darwin-x64');

const ensureArmBinary = () => {
  if (!isMacArm) {
    return;
  }

  if (existsSync(armBinaryDir)) {
    return;
  }

  if (!existsSync(x64BinaryDir)) {
    console.warn('[esbuild] 未能找到 @esbuild/darwin-x64，无法自动修复。');
    return;
  }

  console.info('[esbuild] 未检测到 @esbuild/darwin-arm64，正在使用 x64 架构的二进制进行兼容修复...');

  mkdirSync(armBinaryDir, { recursive: true });
  const x64PkgJsonPath = join(x64BinaryDir, 'package.json');
  const armPkgJsonPath = join(armBinaryDir, 'package.json');

  try {
    const x64Package = JSON.parse(readFileSync(x64PkgJsonPath, 'utf8'));
    const armPackage = {
      ...x64Package,
      name: '@esbuild/darwin-arm64',
      cpu: ['arm64']
    };
    writeFileSync(armPkgJsonPath, JSON.stringify(armPackage, null, 2));
  } catch (error) {
    console.warn('[esbuild] 写入 arm64 package.json 失败:', error);
  }

  const binDir = join(armBinaryDir, 'bin');
  const srcBin = join(x64BinaryDir, 'bin', 'esbuild');
  const destBin = join(binDir, 'esbuild');
  try {
    mkdirSync(binDir, { recursive: true });
    copyFileSync(srcBin, destBin);
    try {
      chmodSync(destBin, 493);
    } catch (error) {
      console.warn('[esbuild] 设置执行权限失败:', error);
    }
  } catch (error) {
    console.warn('[esbuild] 复制 esbuild 可执行文件失败:', error);
  }
};

ensureArmBinary();

const result = run(process.execPath, [viteBin, ...args]);

if (result.error) {
  console.error('\n[Vite] 启动失败:', result.error);
  process.exit(result.status ?? 1);
}

process.exit(result.status ?? 0);
