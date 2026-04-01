/**
 * Toast 工具 - 基于 promptAction.showToast 封装
 */

import promptAction from '@ohos.promptAction';

/**
 * Toast 显示时长
 */
export enum ToastDuration {
  SHORT = 2000,
  LONG = 4000,
}

/**
 * Toast 位置
 */
export enum ToastPosition {
  TOP = 200,
  CENTER = 800,
  BOTTOM = 1200,
}

/**
 * Toast 配置选项
 */
export interface ToastOptions {
  message: string;
  duration?: number;
  position?: number;
}

/**
 * 显示 Toast（简短调用）
 */
export function showToast(message: string, duration: number = ToastDuration.SHORT): void {
  promptAction.showToast({
    message: message,
    duration: duration,
  });
}

/**
 * 显示 Toast（完整配置）
 */
export function showToastWithOptions(options: ToastOptions): void {
  promptAction.showToast({
    message: options.message,
    duration: options.duration ?? ToastDuration.SHORT,
    bottom: options.position ?? ToastPosition.BOTTOM,
  });
}

/**
 * 显示成功 Toast
 */
export function showSuccessToast(message: string): void {
  showToast('✅ ' + message, ToastDuration.SHORT);
}

/**
 * 显示错误 Toast
 */
export function showErrorToast(message: string): void {
  showToast('❌ ' + message, ToastDuration.LONG);
}

/**
 * 显示警告 Toast
 */
export function showWarningToast(message: string): void {
  showToast('⚠️ ' + message, ToastDuration.SHORT);
}

/**
 * 显示加载中 Toast
 */
export function showLoadingToast(message: string = '加载中...'): void {
  // 注意：HarmonyOS promptAction 不支持自定义 Loading Toast
  // 如需显示加载遮罩，请使用 LoadingDialog 组件
  showToast(message, ToastDuration.SHORT);
}

/**
 * 隐藏 Toast（promptAction 不支持主动隐藏，使用场景较少）
 */
export function hideToast(): void {
  // HarmonyOS 当前版本不支持主动隐藏 Toast
  // 此方法预留
}
