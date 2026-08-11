---
layout: mypost
title:  "前端面试——React 基本使用"
date:   2021-03-31 15:07:24 +0800
categories: ['前端', '面试', 'React', '基础', ]
---

注：React17和React16基本一致

## 事件
### bind this
- this默认是undefined
- bind写在constructor中，只有初始化的时候绑定一次
- 使用静态方法（箭头函数）定义的事件，this默认指向实例

### event 参数
- event.preventDefault阻止默认行为 
- event.stopPropagation阻止冒泡

- event是React封装的，__proto__.constructor是SyntheticEvent 组合事件，不是原生的event
- event.target
- event.currentTarget

注意：
1. event是SyntheticEvent，模拟了DOM的所有事件额能力
2. event.nativeEvent 是原生事件对象
3. 所有的事件，都被挂载到 document上(React16)  (React17绑定到root组件上，有利于多个React版本共存，如微前端)
4. 不同于DOM事件，也不同于Vue的事件

### 传递自定义参数
- 无参数的函数，第一个参数默认为event
- 带参数的函数，最后一个参数为event

## 表单
- 受控组件 组件的值与变量关联，可通过修改变量的值来更改组件内容
- input textarea select 用 value
- checkbox radio 用 checked

## 组件使用
- props 传递数据
- props 传递函数
- props 类型检查
- 状态提升：较复杂的数据提升到父组件来进行管理，子组件只负责接收数据，进行较为简单的渲染和数据处理等

## setState
- 不可变值
- 可能是异步更新
- 可能会被合并

1. 只有class组件中有state,一定在constructor中定义
2. state值不可直接更改，只能用setState进行修改
3. setTimeout中，自己定义的DOM事件中setState是同步的；页面渲染是异步的
异步
```JS
this.setState({
    count: this.state.count + 1
}, () => {
    // 联想 Vue $nextTick - DOM
    console.log('count by callback', this.state.count) // 回调函数中可以拿到最新的 state
})
console.log('count', this.state.count) // 异步的，拿不到最新值
```
同步
```JS
// setTimeout 中 setState 是同步的
setTimeout(() => {
    this.setState({
        count: this.state.count + 1
    })
    console.log('count in setTimeout', this.state.count)
}, 0)
```

- 传入对象，会被合并
```JS
    // 传入对象，会被合并（类似 Object.assign ）。执行结果只一次 +1
    this.setState({
        count: this.state.count + 1
    })
    this.setState({
        count: this.state.count + 1
    })
    this.setState({
        count: this.state.count + 1
    })
```

- 传入函数，不会被合并
```JS
    // 传入函数，不会被合并。执行结果是 +3
    this.setState((prevState, props) => {
        return {
            count: prevState.count + 1
        }
    })
    this.setState((prevState, props) => {
        return {
            count: prevState.count + 1
        }
    })
    this.setState((prevState, props) => {
        return {
            count: prevState.count + 1
        }
    })
```

## 组件生命周期
### 单组件生命周期
![react单组件生命周期](react-lifecycle.png)
