/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   * 创建资源注册方法
   */
  ASSET_TYPES.forEach(type => {
    // 设置对应资源方法
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 未设置definition属性则返回对应id的数据
      if (!definition) {
        return this.options[type + 's'][id]
      } else { // 如果设置了definition
        /* istanbul ignore if */
        /**
         * 判断是否为component方法
         * 则校验方法名称
         */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        /** 如果是方法并且判断是否是普通对象 */
        if (type === 'component' && isPlainObject(definition)) {
          // 获取组件名称，不存在则设置为id
          definition.name = definition.name || id
          // 返回继承组件构造器
          definition = this.options._base.extend(definition)
        }
        // 判断如果为指令并且传入的为方法
        if (type === 'directive' && typeof definition === 'function') {
          // 规范指令对象
          definition = { bind: definition, update: definition }
        }
        // 设置对应options属性的属性为传入
        this.options[type + 's'][id] = definition
        // 返回
        return definition
      }
    }
  })
}
