---
layout: mypost
title:  "前端面试——Vue 真题"
date:   2021-03-26 15:07:24 +0800
categories: ['前端', '面试', 'Vue', '真题', ]
---

## v-show和v-if的区别
- v-show 通过控制css的display属性来控制节点的显示
- v-if 动态地插入和销毁节点

## v-for中为何要用key
- 必须使用key,不能使用random和Index
- diff算法中，用key和tag来判断是否是sameNode
- 减少渲染次数，提升渲染性能

## Vue组件生命周期（有父子组件的情况）
- 单组件生命周期
- 父子组件生命周期的关系，依据数据变化和调用逻辑

## 组件通讯
- 父子组件通信 props和this.$emit
- 无关组件通信 自定义事件event.$on event.$off event.$emit
- vuex

## 组件的渲染和更新过程
### 初次渲染
1. 解析模板为render函数（一般在开发环境下打包完成，少数demo在浏览器运行时完成）
2. 触发响应式（监听data的属性 getter setter——初次渲染暂未触发）
3. 执行render函数，生成vnode, patch(elem, vnode)

### 更新
1. 修改data，触发setter(之前初次渲染阶段getter已被监听)
2. 重新执行render函数，生成newVnode
3. patch(vnode, newVnode)

## 双向数据绑定 v-model的实现原理
- input元素绑定value到变量
- 监听value变化，实时更新变量值
- data变化触发re-render

## 对MVVM的理解
- view model ViewModel

## computed有何特点
- computed的变量会做缓存，data不变不会重新计算
- 提高性能

## 为何组件data必须是一个函数
- 组件导出的对象最后会被编译成class，使用组件必须进行实例化，实例化多次，为了不让数据互相影响，data必须返回函数，在每个实例中更改的数据就不是同一个对象

## ajax请求应该被放到哪个生命周期
？？
- 放到mounted
- JS单线程

个人感觉放到created里比较好，可以在模板编译之前就变更数据

## 如何将组件所有props传递给子组件
- v-bind = '$props'

## 自己实现v-model
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

## 多个组件有相同的逻辑，如何抽离
- mixin

## 何时使用异步组件
- 加载大组件
- 路由异步加载

## 何时使用keep-alive
- 缓存组件
- 多个静态tab页切换
- 优化性能

## 何时使用beforeDestory
- 解绑自定义事件
- 清除定时器
- 解绑自定义的DOM事件，如window scroll

## 什么是作用域插槽
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

## Vuex中action和mutation的区别
- action中处理异步,整合多个mutation
- mutation做原子操作

## Vue-router常用的路由模式
- hash默认
- H5 history(需要服务端支持)

## 如何配置Vue-router异步加载
```js
routes: [
    {
        path: '',
        component: import()=>{}
    }
]
```

## 请用vnode描述一个DOM结构
```html
<div id="div1" class="container">
    <p>vdom</p>
    <ul style="font-size: 20px">
        <li>a</li>
    </ul>
</div>
```
```js
 {
    tag: 'div',
    props: {
        className: 'container',
        id: 'div1',
    },
    children: [
        {
            tag: 'p',
            children: 'vdom',
        },
        {
            tag: 'ul',
            props: {
                style: 'font-size: 20px',
            },
            children: [
                {
                    tag: 'li',
                    children: 'a',
                },
            ]
        },
    ]

}
```
## 监听data变化的核心API是什么
- Object.difineProperty
- 深度监听，监听数组
- 缺点

## Vue如何监听数组变化
- Object.difineProperty不能监听数组的变化
- 重新定义数组原型，重写push pop等方法，实现监听
- Proxy可以原生支持监听数组变化

## 请描述响应式原理
- 监听data变化的过程
- 组件渲染和更新的流程

## diff算法的时间复杂度
- O(n)
- 在O(n^3)基础上做了一些调整

## 简述diff算法的过程
- patch
- patchVnode addVnodes removeVnodes
- updateChildren(key的重要性)

## Vue为何是异步渲染，$nextTick何用
- 异步渲染(合并data修改)，以提高渲染性能
- $nextTick在DOM更新完成后触发回调

## Vue常见性能优化方式
- 合理使用v-show v-if
- 合理使用computed
- v-for 加key，避免v-if一起使用
- 自定义事件 DOM事件及时销毁
- 合理使用异步组件
- 合理使用keep-alive
- data层级不要太深
- 使用Vue-loader在开发环境做模板编译(预编译)
- webpack层面的优化
- 前端通用性能优化，图片懒加载等
- 使用SSR

