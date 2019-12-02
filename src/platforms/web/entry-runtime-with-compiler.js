/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'
/**
 * 获取对应id的html模版
 */
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})
// 暂存定义的mount
const mount = Vue.prototype.$mount
/**
 * 重新定义$mount
 * @param {string|Element} el 元素选择器或者元素
 * @param hydrating
 */
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 如果有el则获取el元素
  el = el && query(el)
  // 判断el是否为body或者html
  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    // 警告不能为body或者html
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }
  // 获取当前配置
  const options = this.$options
  // resolve template/el and convert to render function
  // 判断是否没有render方法
  if (!options.render) {
    // 获取配置下的template属性
    let template = options.template
    // 判断是否存在template属性
    if (template) {
      // 如果template为字符串类型
      if (typeof template === 'string') {
        // 判断开头是否有#判断其是否为选择器
        if (template.charAt(0) === '#') {
          // 如果是选择器则获取对应元素下的html内容
          template = idToTemplate(template)
          /* istanbul ignore if */
          // 如果不是生产环境，并且template没获取成功，则报错
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) { // 如果template是个元素
        // 获取元素下的html结构赋值给template
        template = template.innerHTML
      } else {
        // 其他情况，如果非生产则报错，并终止执行
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) { // template不存在，则el存在的情况
      // 获取元素的的整体html结构outerhtml并赋值给template
      template = getOuterHTML(el)
    }
    // 判断template是否获取成功
    if (template) {
      // 成功调试
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 将html转换成render方法
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      // 设置render方法
      options.render = render
      // 设置静态render方法
      options.staticRenderFns = staticRenderFns
      // 编译成功调试
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 调用先前保存的框架mount方法
  return mount.call(this, el, hydrating)
}

/**
 * 获取outerhtml结构
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  // 判断是否支持outerHTML属性
  if (el.outerHTML) {
    // 支持则直接返回
    return el.outerHTML
  } else { // 不支持
    // 创建div元素
    const container = document.createElement('div')
    // 深度克隆当前元素并插入到div
    container.appendChild(el.cloneNode(true))
    // 获取div的innerHTML
    return container.innerHTML
  }
}
// 挂载vue模版解析方法
Vue.compile = compileToFunctions
// 导出vue
export default Vue
