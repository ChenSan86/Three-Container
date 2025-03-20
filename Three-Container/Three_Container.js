class ThreeContainer extends HTMLElement {
  static get observedAttributes() {
    return [
      "src",
      "mtl",
      "width",
      "height",
      "alt",
      "auto-display",
      "auto-display-speed",
      "light-position",
      "camera-position",
      "gesture-control",
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // 初始化定向光数组
    this.directionalLights = [];
    this.initElements();
    this.initScene();
    this.keyState = {};
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    // 自动旋转相关变量
    this.autoRotate = false;
    this.autoRotateSpeed = 0.005;
    this.userInteracting = false;
    this.resumeAutoRotateTimer = null;
    // 手势交互相关变量
    this.gestureControlEnabled = false;
    this.handposeModel = null;
    this.prevFingerPos = null; // 上一帧食指位置
    this.gestureThreshold = 40; // 拇指与食指接触阈值（像素）
    // 平滑系数与灵敏度调整：平滑系数较大，位移映射系数降低
    //
    //
    //
    this.smoothingFactor = 0.1; //核心参数
    this.positionMultiplier = 0.005; //核心参数
    //
    //
    //
    //
  }

  initElements() {
    this.loadingElement = document.createElement("div");
    this.loadingElement.className = "loading-overlay";
    this.loadingElement.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      </svg>
      <div style="margin-top:12px;">加载中...</div>
    `;
    this.shadowRoot.appendChild(this.loadingElement);

    if (this.getAttribute("gesture-control") === "true") {
      this.gestureControlEnabled = true;
      const gestureContainer = document.createElement("div");
      gestureContainer.className = "gesture-container";
      gestureContainer.innerHTML = `<video autoplay id="gestureVideo" width="60" height="40" style="transform: scaleX(-1);"></video>`;
      this.shadowRoot.appendChild(gestureContainer);
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000);

    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    // 初始位置将在 adjustCamera 中设置

    // 添加环境光（始终存在）
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    // 设置定向光（光源位置可自定义）
    this.setupLights();
  }

  setupLights() {
    this.directionalLights.forEach((light) => this.scene.remove(light));
    this.directionalLights = [];
    const lightPosAttr = this.getAttribute("light-position");
    if (lightPosAttr) {
      const positions = lightPosAttr
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s);
      positions.forEach((posStr) => {
        const coords = posStr.split(",").map(Number);
        if (coords.length >= 3 && coords.every((num) => !isNaN(num))) {
          const directional = new THREE.DirectionalLight(0xffffff, 0.8);
          directional.position.set(coords[0], coords[1], coords[2]);
          this.scene.add(directional);
          this.directionalLights.push(directional);
        }
      });
    }
    if (this.directionalLights.length === 0) {
      const defaultLight = new THREE.DirectionalLight(0xffffff, 0.8);
      defaultLight.position.set(5, 5, 5);
      this.scene.add(defaultLight);
      this.directionalLights.push(defaultLight);
    }
  }

  connectedCallback() {
    this.updateSize();
    this.shadowRoot.appendChild(this.renderer.domElement);
    this.setupEventListeners();
    this.autoRotate = this.getAttribute("auto-display") === "true";
    const speedAttr = this.getAttribute("auto-display-speed");
    if (speedAttr) this.autoRotateSpeed = parseFloat(speedAttr);
    this.loadModel();
    this.startRendering();
    if (this.gestureControlEnabled) this.initGestureControl();
  }

  attributeChangedCallback(name) {
    if (["width", "height"].includes(name)) this.updateSize();
    if (name === "auto-display")
      this.autoRotate = this.getAttribute("auto-display") === "true";
    if (name === "auto-display-speed") {
      const speedAttr = this.getAttribute("auto-display-speed");
      if (speedAttr) this.autoRotateSpeed = parseFloat(speedAttr);
    }
    if (name === "light-position") this.setupLights();
    if (name === "camera-position") this.adjustCamera();
    if (name === "gesture-control") {
      this.gestureControlEnabled =
        this.getAttribute("gesture-control") === "true";
      if (this.gestureControlEnabled && !this.handposeModel)
        this.initGestureControl();
    }
  }

  updateSize() {
    const width = parseInt(this.getAttribute("width")) || 800;
    const height = parseInt(this.getAttribute("height")) || 600;
    this.style.width = `${width}px`;
    this.style.height = `${height}px`;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  async loadModel() {
    try {
      this.showLoading();
      await this.loadModelData();
      this.processModel();
    } catch (error) {
      this.showError(error ? error.toString() : "加载模型时出错");
    } finally {
      this.hideLoading();
    }
  }

  async loadModelData() {
    const src = this.getAttribute("src");
    if (!src) throw new Error("模型路径未指定");
    if (src.toLowerCase().endsWith(".obj")) await this.loadOBJWithMTL();
  }

  async loadOBJWithMTL() {
    let [objPath, mtlPath] = this.getModelPaths();
    let materials;
    try {
      if (mtlPath.includes("/")) {
        materials = await new THREE.MTLLoader().loadAsync(mtlPath);
      } else {
        const basePath = this.getBasePath(objPath);
        materials = await new THREE.MTLLoader()
          .setPath(basePath)
          .loadAsync(mtlPath);
      }
      materials.preload();
    } catch (error) {
      console.warn("使用默认材质:", error);
      materials = this.createFallbackMaterial();
    }
    this.model = await new THREE.OBJLoader()
      .setMaterials(materials)
      .loadAsync(objPath);
  }

  getModelPaths() {
    const objSrc = this.getAttribute("src");
    const mtlSrc =
      this.getAttribute("mtl") || objSrc.replace(/\.obj$/i, ".mtl");
    return [objSrc, mtlSrc];
  }

  getBasePath(filePath) {
    return filePath.substring(0, filePath.lastIndexOf("/") + 1);
  }

  createFallbackMaterial() {
    const material = new THREE.MeshPhongMaterial({
      color: 0x888888,
      specular: 0x111111,
      shininess: 30,
    });
    return { create: () => material };
  }

  processModel() {
    this.scene.add(this.model);
    this.centerModel();
    this.adjustCamera();
  }

  centerModel() {
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    this.model.position.sub(center);
    const size = box.getSize(new THREE.Vector3());
    const scale = 5 / Math.max(size.x, size.y, size.z);
    this.model.scale.set(scale, scale, scale);
  }

  adjustCamera() {
    if (!this.model) return;
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    let defaultDistance = size.length() * 2;
    const cameraPosAttr = this.getAttribute("camera-position");
    if (cameraPosAttr) {
      const parts = cameraPosAttr
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));
      if (parts.length === 1) {
        this.camera.position.set(0, 0, parts[0]);
      } else if (parts.length >= 3) {
        this.camera.position.set(parts[0], parts[1], parts[2]);
      } else {
        this.camera.position.set(0, 0, defaultDistance);
      }
    } else {
      this.camera.position.set(0, 0, defaultDistance);
    }
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
  }

  setupEventListeners() {
    let isDragging = false,
      prevX = 0,
      prevY = 0;
    const onMouseDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      this.pauseAutoRotate();
    };
    const onMouseMove = (e) => {
      if (!isDragging || !this.model) return;
      const deltaX = e.clientX - prevX,
        deltaY = e.clientY - prevY;
      this.model.rotation.y += deltaX * 0.005;
      this.model.rotation.x += deltaY * 0.005;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseUp = () => {
      isDragging = false;
      this.resumeAutoRotateAfterDelay();
    };
    this.addEventListener("mousedown", onMouseDown);
    this.addEventListener("mousemove", onMouseMove);
    this.addEventListener("mouseup", onMouseUp);
    this.addEventListener("mouseleave", onMouseUp);
    this.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.pauseAutoRotate();
        const delta = e.deltaY * 0.002;
        this.camera.translateZ(delta * 15);
        this.camera.lookAt(this.cameraTarget);
        this.resumeAutoRotateAfterDelay();
      },
      { passive: false }
    );
    this._onKeyDown = (e) => {
      this.keyState[e.key.toLowerCase()] = true;
      this.pauseAutoRotate();
    };
    this._onKeyUp = (e) => {
      this.keyState[e.key.toLowerCase()] = false;
      this.resumeAutoRotateAfterDelay();
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  pauseAutoRotate() {
    this.userInteracting = true;
    if (this.resumeAutoRotateTimer) {
      clearTimeout(this.resumeAutoRotateTimer);
      this.resumeAutoRotateTimer = null;
    }
  }

  resumeAutoRotateAfterDelay() {
    if (!this.autoRotate) return;
    if (this.resumeAutoRotateTimer) clearTimeout(this.resumeAutoRotateTimer);
    this.resumeAutoRotateTimer = setTimeout(() => {
      this.userInteracting = false;
    }, 1000);
  }

  handleCameraMovement() {
    const baseSpeed = 0.15,
      speed = this.keyState.shift ? baseSpeed * 2 : baseSpeed;
    if (this.keyState.w || this.keyState.arrowup)
      this.camera.translateZ(-speed);
    if (this.keyState.s || this.keyState.arrowdown)
      this.camera.translateZ(speed);
    if (this.keyState.a || this.keyState.arrowleft)
      this.camera.translateX(-speed);
    if (this.keyState.d || this.keyState.arrowright)
      this.camera.translateX(speed);
    if (this.keyState.q) this.camera.position.y += speed;
    if (this.keyState.e) this.camera.position.y -= speed;
    this.camera.lookAt(this.cameraTarget);
  }

  startRendering() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.handleCameraMovement();
      if (this.autoRotate && !this.userInteracting && this.model) {
        this.model.rotation.y += this.autoRotateSpeed;
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  async initGestureControl() {
    try {
      const videoElem = this.shadowRoot.getElementById("gestureVideo");
      if (!videoElem) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElem.srcObject = stream;
      await new Promise(
        (resolve) => (videoElem.onloadedmetadata = () => resolve(videoElem))
      );
      this.handposeModel = await handpose.load();
      console.log("手势模型加载完成");
      this.detectHands();
    } catch (err) {
      console.error("手势控制初始化失败:", err);
    }
  }

  // 手势检测：检测拇指与食指接触时，模拟鼠标长按拖拽模型（平移 x 和 y）
  async detectHands() {
    if (!this.handposeModel) return;
    const videoElem = this.shadowRoot.getElementById("gestureVideo");
    if (!videoElem) return;
    const predictions = await this.handposeModel.estimateHands(videoElem);
    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks;
      const thumbTip = landmarks[4],
        indexTip = landmarks[8];
      // 判断是否接触
      if (
        Math.hypot(thumbTip[0] - indexTip[0], thumbTip[1] - indexTip[1]) <
        this.gestureThreshold
      ) {
        // 将食指坐标镜像转换（仅 x 坐标翻转）并映射到窗口坐标
        const mapped = { x: 640 - indexTip[0], y: indexTip[1] };
        const winPos = {
          x: (mapped.x / 640) * window.innerWidth,
          y: (mapped.y / 480) * window.innerHeight,
        };
        // 平滑处理：更新记录，降低灵敏度
        if (this.prevFingerPos) {
          const deltaX =
            (winPos.x - this.prevFingerPos.x) * this.positionMultiplier;
          const deltaY =
            (winPos.y - this.prevFingerPos.y) * this.positionMultiplier;
          this.model.rotation.x += deltaY * 0.2; //核心参数
          this.model.rotation.y += deltaX * 0.2; //核心参数
        }
        // 更新平滑记录（采用较大平滑系数，保证缓慢跟随）
        if (!this.prevFingerPos) {
          this.prevFingerPos = winPos;
        } else {
          this.prevFingerPos.x =
            this.prevFingerPos.x +
            this.smoothingFactor * (winPos.x - this.prevFingerPos.x);
          this.prevFingerPos.y =
            this.prevFingerPos.y +
            this.smoothingFactor * (winPos.y - this.prevFingerPos.y);
        }
      } else {
        this.prevFingerPos = null;
      }
    } else {
      this.prevFingerPos = null;
    }
    requestAnimationFrame(() => this.detectHands());
  }

  showLoading() {
    this.loadingElement.style.display = "flex";
  }

  hideLoading() {
    this.loadingElement.style.display = "none";
  }

  showError(message) {
    this.loadingElement.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2">
        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <div style="color:#ff4444; margin-top:12px;">${message}</div>
    `;
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.renderer.dispose();
    if (this.model) {
      this.model.traverse((child) => {
        if (child.material) child.material.dispose();
        if (child.geometry) child.geometry.dispose();
      });
    }
  }
}

customElements.define("three-container", ThreeContainer);
