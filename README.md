# Three-Container
---
## 项目介绍
随着三维模型在网页上的应用越来越广泛，用户对三维模型的交互性要求也越来越高。本项目旨在开发一个交互式3D查看器，用户可以在网页上自由旋转、缩放和移动视角查看三维模型。

<details>
  <summary>目录</summary>
  <ol>
    <li>
      <ul>
        <li><a href="#构建工具">构建工具</a></li>
      </ul>
    </li>
    <li>
      <a href="#开始">开始</a>
      <ul>
        <li><a href="#依赖">依赖</a></li>
      </ul>
    </li>
    <li><a href="#标签属性">标签属性</a></li>
    <li><a href="#许可证">许可证</a></li>
    <li><a href="#参考资料">参考资料</a></li>
    <li><a href="#开发日志">开发日志</a></li>
  </ol>
</details>

### 构建工具
* [Three.js](https://Threejs.org/)

## 开始
部署前阅读

### 依赖
在head中添加以下依赖
* javascript
  ```sh
  <!-- Three.js 与 OBJ/MTL加载器 -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/MTLLoader.js"></script>
  <!-- 引入 TensorFlow.js 与 handpose 模型（启用手势交互时需要） -->
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose@latest"></script>
  ```

## 标签属性
| 属性              | 类型    | 默认值       | 说明                       |
|-------------------|---------|--------------|----------------------------|
| src               | String  | -            | 模型文件路径（支持.obj格式）|
| mtl               | String  | 同目录同名mtl| 材质文件路径               |
| width             | Number  | 800          | 画布宽度（像素）           |
| height            | Number  | 600          | 画布高度（像素）           |
| auto-display      | Boolean | false        | 启用自动旋转展示           |
| auto-display-speed| Float   | 0.005        | 自动旋转速度（弧度/帧）    |
| light-position    | String  | "5,5,5"      | 光源坐标（支持多个，分号分隔）|
| camera-position   | String  | 自动计算     | 相机坐标（x,y,z或单数字距离）|
| gesture-control   | Boolean | false        | 集成手势控制函数实现交互新体验|



## 许可证

根据 MIT 许可证分发。打开 [LICENSE.md](LICENSE.md) 查看更多内容。

## 参考资料

* [零基础学习Three.js CSDN](https://blog.csdn.net/qq_39669919/article/details/137512530)
* [Three.js 教程 CSDN](https://blog.csdn.net/qq_39669919/article/details/137512530)
* [Three,js项目实战 知乎](https://zhuanlan.zhihu.com/p/689537920)
* [Ovilia/ThreeExample.js](https://github.com/Ovilia/ThreeExample.js)
* [three.js examples](https://threejs.org/examples/)

## 开发日志

*[3d-container 标签的模拟实现-开发日志](https://blog.csdn.net/2401_87362551/article/details/146158267?spm=1001.2014.3001.5501)

