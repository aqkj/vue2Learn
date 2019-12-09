import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
/**
 * vue构造器
 * @param {object} options 配置
 */
function Vue (options) {
  // 判断是否使用new字段调用的vue
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 初始化options
  this._init(options)
}
// 初始化mixin
initMixin(Vue)
// 初始化state
stateMixin(Vue)
// 初始化event
eventsMixin(Vue)
// 初始化生命周期
lifecycleMixin(Vue)
// 初始化渲染
renderMixin(Vue)

export default Vue
