/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * 获取el元素
 * Query an element selector if it's not an element already.
 */
export function query (el: string | Element): Element {
  // 判断是否为字符串
  if (typeof el === 'string') {
    // 获取对应选择器的元素
    const selected = document.querySelector(el)
    // 判断元素是否存在
    if (!selected) {
      // 不存在报错
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      // 返回一个创建的div
      return document.createElement('div')
    }
    // 返回获取的元素
    return selected
  } else {
    // el为元素的情况下返回本身
    return el
  }
}
