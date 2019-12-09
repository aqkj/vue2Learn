/* @flow */

import { mergeOptions } from '../util/index'
/**
 * 初始化mixin方法
 * @param {Vue} Vue Vue构造器
 */
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 将mixin和当前options合并
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
