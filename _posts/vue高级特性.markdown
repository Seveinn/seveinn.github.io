---
layout: mypost
title:  "Vue 高级特性"
date:   2021-03-23 14:07:24 +0800
categories: ['前端', '面试', 'Vue']
---

## 组件生命周期
### 单个组件
挂载阶段
beforeCreated
created 实例初始化完成
beforeMount
mounted DOM渲染完成

更新阶段
beforeUpdate
updated
 
销毁阶段
beforeDestory 解除绑定，销毁子组件和事件监听器

### 父子组件
|-- Index
|-----  List
|-----  Input
 
#### 实例初始化       
- 父组件先实例化->子组件实例化

#### DOM渲染         
- 子组件渲染完成->父组件渲染完成

#### 组件更新
看事件和数据的处理逻辑，以$emit为例，
更新时，子组件抛出事件，父组件接收并更改自己的数据，
- 父组件先更新->子组件接收参数->子组件更新

数据更新后开始根据更新后的数据渲染更新，
- 子组件渲染更新->父组件渲染更新


## 高级特性
### 自定义v-model,如：颜色选择器
主要原理，在自定义的组件中，对 **input标签** 绑定动态属性，同时监听该属性，监听到的属性值通过$emit事件传参抛出，在父组件中进行接收

```html
<template>
    <!-- 例如：vue 颜色选择 -->
    <input type="text"
        :value="text1"
        @input="$emit('change1', $event.target.value)"
    >
    <!--
        1. 上面的 input 使用了 :value 而不是 v-model
        2. 上面的 change1 和 model.event1 要对应起来
        3. text1 属性对应起来
    -->
</template>

<script>
export default {
    model: {
        prop: 'text1', // 对应 props text1
        event: 'change1'
    },
    props: {
        text1: String,
        default() {
            return ''
        }
    }
}
</script>
```

### $nextTick（DOM渲染完成后被触发）
Vue是异步渲染的，即data改变后，DOM不会立即渲染，如果要获取到最新的节点信息，可在$nextTick中进行操作

```js
 addItem() {
        this.list.push(`${Date.now()}`)
        this.list.push(`${Date.now()}`)
        this.list.push(`${Date.now()}`)

        // 1. 异步渲染，$nextTick 待 DOM 渲染完再回调
        // 3. 页面渲染时会将 data 的修改做整合，多次 data 修改只会渲染一次
        this.$nextTick(() => {
          // 获取 DOM 元素
          const ulElem = this.$refs.ul1
          // eslint-disable-next-line
          console.log( ulElem.childNodes.length )
        })
    }
  }
```

### slot（父组件往子组件中插入内容）
#### 基本使用
父组件
```html
<SlotDemo :url="website.url">
    {{website.url}}
</SlotDemo>
```
子组件
```html
<template>
    <a :href="url">
        <slot>
            默认内容，即父组件没设置内容时，这里显示
        </slot>
    </a>
</template>
```

#### 作用域插槽
在父组件中插入内容到子组件，内容模板由子组件作用域中的数据来定
父组件
```html
 <ScopedSlotDemo :url="website.url">
    <template v-slot="slotProps">
        {{slotProps.slotData.title}}
    </template>
</ScopedSlotDemo>
```
子组件
```html
<template>
    <a :href="url">
        <slot :slotData="website">
            {{website.subTitle}} <!-- 默认值显示 subTitle ，即父组件不传内容时 -->
        </slot>
    </a>
</template>
```

#### 具名插槽
具体往子组件中插入什么内容根据名字来定


### 动态组件
:is="component-name"
需要根据数据来确定要渲染的组件的类型的情况,可遍历对象或数组循环生成动态组件
```html
<component :is="NextTickName"/>
```
```js
   return {
        NextTickName: "NextTick",
        }
    }
```

### 异步组件
import()函数
按需加载，异步加载大组件(在用到的时候才加载)
```html
<FormDemo v-if="showFormDemo"/>
```
```js
components: {
    FormDemo: () => import('../BaseUse/FormDemo'),
},
```

### keep-alive (Vue常见性能优化)
缓存组件
频繁切换，不需要重复渲染
如：TAB切换，在没有缓存的情况下，每次切换都会触发旧组件的销毁和新组建的挂载，有缓存就只会触发组件的第一次挂载

### mixin
多个组件有相同的逻辑，可以抽离出来
mixin不是完美的解决方案，会有一些问题，Vue3提出的CompositionAPI旨在解决这些问题
问题：
- 变量来源不明确
- 多个mixin可能造成命名冲突
- mixin和组件可能出现多对多关系，复杂度较高

### 总结


## Vuex
state
getters
action 可执行异步操作（读缓存，请求后端API）
mutation

dispatch
commit
mapState
mapGetters
mapActions
mapMutations

## Vue-router
路由相关参数 this.$route
### 路由模式 
hash 
H5 history 
- 需要后端server支持，无特殊需求，可选择hash模式
- 后端配置原理：无论访问什么路径，都默认返回index文件，问题：无法返回404页面，须单独配置

#### 路由配置 
动态路由 import函数
懒加载
