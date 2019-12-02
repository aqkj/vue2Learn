/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// install platform specific utils
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
/**
 * 安装patch方法
 */
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
/**
 * $mount挂载放啊
 */
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 判断是否有el,并且是否是浏览器
  el = el && inBrowser ? query(el) : undefined
  // 调用挂载方法
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
/**
 * 如果为在浏览器环境
 */
if (inBrowser) {
  // 延迟
  setTimeout(() => {
    // 判断是否有devTools
    if (config.devtools) {
      // 如果获取到devtool的钩子
      if (devtools) {
        // 初始化devtools
        devtools.emit('init', Vue)
      } else if ( // 否则判断环境不为生产环境并且非测试环境
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        // 打印提示下载开发工具devtool
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    // 判断是否非生产环境，并且非测试，并且是否打开生产信息，并且有console
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      // 打印开发环境提醒
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}
// 导出vue
export default Vue
