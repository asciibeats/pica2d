//type CanvasFillStyle = string | CanvasGradient | CanvasPattern
type Vector2Types = Vector2 | [number, number] | number
type Vector3Types = Vector3 | [number, number, number] | number
type Vector4Types = Vector4 | [number, number, number, number] | number
type MarginTuple = [number, number, number, number]
type MarginTypes = MarginParams | MarginTuple | number

const INV_S = 1 / 1000
const TWO_PI = 2 * Math.PI

interface TransformParams {
  readonly id?: number
  readonly position?: Vector2Types
  readonly rotation?: number
  readonly rotationIsAbsolute?: boolean
  readonly scale?: Vector2Types
  readonly scaleIsAbsolute?: boolean
  readonly depth?: number
  readonly flip?: { x: boolean, y: boolean }
  readonly hide?: boolean
  readonly hideSelf?: boolean
  readonly hideChildren?: boolean
  readonly events?: boolean
  readonly onDown?: (transform: Transform) => void
  readonly onDouble?: (transform: Transform) => void
  readonly onHold?: (transform: Transform) => void
  readonly onUp?: (transform: Transform) => void
  readonly onEnter?: (transform: Transform) => void
  readonly onExit?: (transform: Transform) => void
  readonly onDrag?: (transform: Transform, target?: Transform) => void
  readonly onDrop?: (transform: Transform, target?: Transform) => void
}

class Transform {
  id: number
  position: Vector2
  rotation: number
  rotationIsAbsolute?: true
  scale: Vector2
  scaleIsAbsolute?: true
  flip: Vector2
  visibleSelf: boolean
  visibleChildren: boolean
  handleEvents?: true
  onDown?: (transform: Transform) => void
  onDouble?: (transform: Transform) => void
  onHold?: (transform: Transform) => void
  onUp?: (transform: Transform) => void
  onEnter?: (transform: Transform) => void
  onExit?: (transform: Transform) => void
  onDrag?: (transform: Transform, target?: Transform) => void
  onDrop?: (transform: Transform, target?: Transform) => void
  protected depth: number
  protected parent: Transform | null
  protected children: Map<number, Transform>
  protected layers: Map<number, Map<number, Transform>>
  protected context!: CanvasRenderingContext2D
  protected static nullID = 0

  constructor(spec?: TransformParams) {
    this.id = spec?.id ?? --Transform.nullID
    this.position = spec?.position != undefined ? new Vector2(spec.position) : Vector2.zero()
    this.rotation = spec?.rotation ?? 0
    this.rotationIsAbsolute = spec?.rotationIsAbsolute || undefined
    this.scale = spec?.scale != undefined ? new Vector2(spec.scale) : Vector2.one()
    this.scaleIsAbsolute = spec?.scaleIsAbsolute || undefined
    this.depth = spec?.depth ?? 0
    this.flip = new Vector2(spec?.flip?.x ? -1 : 1, spec?.flip?.y ? -1 : 1)
    this.visibleSelf = spec?.hide || spec?.hideSelf ? false : true
    this.visibleChildren = spec?.hide || spec?.hideChildren ? false : true
    this.handleEvents = spec?.events ? true : undefined
    this.onDown = spec?.onDown
    this.onDouble = spec?.onDouble
    this.onHold = spec?.onHold
    this.onUp = spec?.onUp
    this.onEnter = spec?.onEnter
    this.onExit = spec?.onExit
    this.onDrag = spec?.onDrag
    this.onDrop = spec?.onDrop
    this.parent = null
    this.children = new Map()
    this.layers = new Map()
  }

  *[Symbol.iterator](): IterableIterator<Transform> {
    for (const child of this.children.values())
      yield child
  }

  add(child: Transform): Transform {
    if (this.children.has(child.id)) {
      console.error('id collision')
      return this
    }

    this.attach(child)
    this.children.set(child.id, child)
    return this
  }

  remove(id: number): Transform {
    const child = this.children.get(id)

    if (child) {
      this.detach(child)
      this.children.delete(id)
    } else
      console.warn('no child')

    return this
  }

  /*getChildren<T extends Transform = Transform>(): Map<number, T> {
    return this.children as Map<number, T>
  }*/

  childCount(): number {
    return this.children.size
  }

  rotatePosition(position: Vector2, rotation: number): void {
    this.position = position.rotate(rotation)
    this.rotation = rotation
  }

  sort<T extends Transform = Transform>(func: (a: T, b: T) => number): void {
    this.children = new Map([...this.children.values() as IterableIterator<T>].sort(func).map(value => [value.id, value]))
  }

  removeAll(): Transform {
    for (const id of this.children.keys())
      this.remove(id)

    return this
  }

  get<T extends Transform = Transform>(id: number): T | undefined {
    return this.children.get(id) as T | undefined
  }

  first<T extends Transform = Transform>(): T | undefined {
    return this.children.values().next().value as T | undefined
  }

  pop<T extends Transform = Transform>(): T | undefined {
    const child = this.children.values().next().value as T | undefined

    if (child) {
      this.detach(child)
      this.children.delete(child.id)
      return child
    }
  }

  has(id: number): boolean {
    return this.children.has(id)
  }

  updateSelf(previous: DOMHighResTimeStamp, elapsed: number, root: Transform): boolean {
    return false
  }

  updateBranch(previous: DOMHighResTimeStamp, elapsed: number, root?: Transform): boolean {
    root ??= this

    if (this.updateSelf(previous, elapsed, root))
      return true

    for (const child of this.children.values()) {
      if (child.updateBranch(previous, elapsed, root))
        this.remove(child.id)
    }

    return false
  }

  renderSelf(root: Transform): void {
    return
  }

  renderBranch(depth: number, root?: Transform): void {
    root ??= this
    this.context.save()
    this.transform(root)
    this.renderLayer(depth, root)
    this.context.restore()
  }

  renderAll(root?: Transform): void {
    root ??= this
    this.context.save()
    this.transform(root)

    for (const depth of this.layers.keys())
      this.renderLayer(depth, root)

    this.context.restore()
  }

  renderLayer(depth: number, root: Transform): void {
    if (this.visibleSelf && depth == this.depth)
      this.renderSelf(root)

    if (this.visibleChildren) {
      const layer = this.layers.get(depth)

      if (layer)
        for (const child of layer.values())
          child.renderBranch(depth, root)
    }
  }

  getMatrix(absolute = false, root?: Transform): DOMMatrix {
    root ??= this
    this.context.save()

    let parent: Transform | null = this

    do {
      parent.transform(root)
      parent = parent.parent
    } while (absolute && parent)

    const matrix = this.context.getTransform()
    this.context.restore()
    return matrix
  }

  containsSelf(position: Vector2): Transform | undefined {
    return
  }

  containsBranch(position: Vector2): Transform | undefined {
    if (this.visibleChildren) {
      for (const layer of [...this.layers.values()].reverse()) {
        for (const child of layer.values()) {
          const transform = child.containsBranch(position.clone().subtract(child.position).rotate(child.rotation).divide(child.scale))

          if (transform)
            return transform
        }
      }
    }

    if (this.handleEvents && this.visibleSelf)
      return this.containsSelf(position)
  }

  find(callback: (transform: Transform) => boolean): Transform | undefined {
    if (callback(this))
      return this

    for (const child of this.children.values()) {
      const found = child.find(callback)

      if (found)
        return found
    }

    return
  }

  each(callback: (transform: Transform) => void): void {
    for (const child of this.children.values())
      callback(child)
  }

  filter(callback: (transform: Transform) => boolean): Transform[] {
    let transforms: Transform[] = []

    if (callback(this))
      transforms.push(this)

    for (const child of this.children.values())
      transforms = transforms.concat(child.filter(callback))

    return transforms
  }

  show(): void {
    this.visibleSelf = true
    this.visibleChildren = true
  }

  hide(): void {
    this.visibleSelf = false
    this.visibleChildren = false
  }

  toggle(): void {
    this.visibleSelf = !this.visibleSelf
    this.visibleChildren = !this.visibleChildren
  }

  showSelf(): void {
    this.visibleSelf = true
  }

  hideSelf(): void {
    this.visibleSelf = false
  }

  toggleSelf(): void {
    this.visibleSelf = !this.visibleSelf
  }

  showChildren(): void {
    this.visibleChildren = true
  }

  hideChildren(): void {
    this.visibleChildren = false
  }

  toggleChildren(): void {
    this.visibleChildren = !this.visibleChildren
  }

  getParent<T extends Transform = Transform>(depth: number): T | null {
    let parent = this.parent

    for (let i = 0; i < depth; i++) {
      if (parent)
        parent = parent.parent
      else
        return null
    }

    return parent as T | null
  }

  protected attach(child: Transform): void {
    for (const depth of child.layers.keys())
      this.addLayer(depth, child)

    this.addLayer(child.depth, child)
    child.setContext(this.context)
    child.parent = this
  }

  protected detach(child: Transform): void {
    for (const depth of child.layers.keys())
      this.removeLayer(depth, child.id)

    this.removeLayer(child.depth, child.id)
    //child.unsetContext()
    child.parent = null
  }

  protected transform(root: Transform): void {
    this.context.translate(this.position.x * this.flip.x, this.position.y * this.flip.y)

    if (this.rotationIsAbsolute)
      this.context.rotate(this.rotation - root.rotation)
    else
      this.context.rotate(this.rotation)

    if (this.scaleIsAbsolute)
      this.context.scale(this.scale.x / root.scale.x * this.flip.x, this.scale.y / root.scale.y * this.flip.y)
    else
      this.context.scale(this.scale.x * this.flip.x, this.scale.y * this.flip.y)
  }

  protected setContext(context: CanvasRenderingContext2D): void {
    this.context = context

    for (const child of this.children.values())
      child.setContext(context)
  }

  /*protected unsetContext(): void {
    this.context = null

    for (const child of this.children.values())
      child.unsetContext()
  }*/

  protected addLayer(depth: number, child: Transform): void {
    const layer = this.layers.get(depth)

    if (layer)
      layer.set(child.id, child)
    else {
      this.layers.set(depth, new Map([[child.id, child]]))
      this.layers = new Map([...this.layers.entries()].sort((a, b) => a[0] - b[0]))
      this.parent?.addLayer(depth, this)
    }
  }

  protected removeLayer(depth: number, id: number): void {
    const layer = this.layers.get(depth)

    if (layer) {
      layer.delete(id)

      if (layer.size == 0) {
        this.layers.delete(depth)
        this.parent?.removeLayer(depth, this.id)
      }
    }/* else
      console.warn('no layer')*/
  }
}

enum LayoutMode { Absolute, Relative, Weighted }

interface LayoutParams extends Omit<TransformParams, 'position'> {
  readonly mode?: [[LayoutMode, number], [LayoutMode, number]]
  readonly origin?: Vector2Types
  readonly margin?: MarginTypes
  readonly aspect?: Vector2Types
}

class Layout extends Transform {
  readonly mode: [[LayoutMode, number], [LayoutMode, number]]
  protected origin: Vector2
  protected margin: Margin
  protected aspect?: Vector2
  protected size: Vector2

  constructor(params?: LayoutParams) {
    super(params)
    this.mode = params?.mode ?? [[LayoutMode.Weighted, 1], [LayoutMode.Weighted, 1]]
    this.origin = params?.origin != undefined ? new Vector2(params.origin) : Vector2.half()
    this.margin = params?.margin != undefined ? new Margin(params.margin) : Margin.zero()
    this.aspect = params?.aspect != undefined ? new Vector2(params.aspect) : undefined
    this.size = Vector2.zero()
  }

  resizeSelf(offset: Vector2, size: Vector2): void {
    this.size = size.clone().subtract(this.margin.leftTop).subtract(this.margin.rightBottom)

    if (this.aspect) {
      if (this.size.x > this.size.y)
        this.size.x = this.size.y * this.aspect.x / this.aspect.y
      else
        this.size.y = this.size.x * this.aspect.y / this.aspect.x
    }

    this.position = offset.clone().subtract(this.size.clone().multiply(Vector2.half().subtract(this.origin)))
    this.size.divide(this.scale)
  }

  resizeChildren(): void {
    for (const child of this) {
      if (child instanceof Layout) {
        const [[mx, sx], [my, sy]] = child.mode
        const offset = this.size.clone().multiply(Vector2.half().subtract(this.origin))
        const size = new Vector2()

        switch (mx) {
          case LayoutMode.Absolute:
            size.x = sx
            break
          case LayoutMode.Relative:
            size.x = sx * this.size.x
            break
          case LayoutMode.Weighted:
            size.x = this.size.x
        }

        switch (my) {
          case LayoutMode.Absolute:
            size.y = sy
            break
          case LayoutMode.Relative:
            size.y = sy * this.size.y
            break
          case LayoutMode.Weighted:
            size.y = this.size.y
        }

        child.resizeBranch(offset, size)
      }
    }
  }

  resizeBranch(offset: Vector2, size: Vector2): void {
    this.resizeSelf(offset, size)
    this.resizeChildren()
  }

  containsSelf(position: Vector2): Transform | undefined {
    const topLeft = this.size.clone().multiply(this.origin.clone().negate())
    const bottomRight = this.size.clone().multiply(Vector2.one().subtract(this.origin))
    return position.x > topLeft.x && position.y > topLeft.y && position.x < bottomRight.x && position.y < bottomRight.y ? this : undefined
  }

  originOffset(): Vector2 {
    return this.size.clone().multiply(this.origin)
  }
}

class Vector2 {
  x: number
  y: number

  constructor(x?: Vector2Types, y?: number) {
    if (x == undefined) {
      this.x = 0
      this.y = 0
    } else if (typeof (x) == 'number') {
      this.x = x
      this.y = y ?? this.x
    } else if (x instanceof Array) {
      this.x = x[0]
      this.y = x[1]
    } else {
      this.x = x.x
      this.y = x.y
    }
  }

  static zero(): Vector2 {
    return new Vector2()
  }

  static half(): Vector2 {
    return new Vector2(0.5)
  }

  static one(): Vector2 {
    return new Vector2(1)
  }

  static angle(a: number): Vector2 {
    return new Vector2(Math.cos(a), Math.sin(a))
  }

  clone(): Vector2 {
    return new Vector2(this)
  }

  isZero(): boolean {
    return this.x === 0 && this.y === 0
  }

  add(v: Vector2Types): Vector2 {
    if (typeof (v) == 'number') {
      this.x += v
      this.y += v
    } else if (v instanceof Array) {
      this.x += v[0]
      this.y += v[1]
    } else {
      this.x += v.x
      this.y += v.y
    }

    return this
  }

  subtract(v: Vector2Types): Vector2 {
    if (typeof (v) == 'number') {
      this.x -= v
      this.y -= v
    } else if (v instanceof Array) {
      this.x -= v[0]
      this.y -= v[1]
    } else {
      this.x -= v.x
      this.y -= v.y
    }

    return this
  }

  multiply(v: Vector2Types): Vector2 {
    if (typeof (v) == 'number') {
      this.x *= v
      this.y *= v
    } else if (v instanceof Array) {
      this.x *= v[0]
      this.y *= v[1]
    } else {
      this.x *= v.x
      this.y *= v.y
    }

    return this
  }

  divide(v: Vector2Types): Vector2 {
    if (typeof (v) == 'number') {
      this.x /= v
      this.y /= v
    } else if (v instanceof Array) {
      this.x /= v[0]
      this.y /= v[1]
    } else {
      this.x /= v.x
      this.y /= v.y
    }

    return this
  }

  negate(): Vector2 {
    this.x = -this.x
    this.y = -this.y
    return this
  }

  invert(): Vector2 {
    this.x = 1 / this.x
    this.y = 1 / this.y
    return this
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  magnitude2(): number {
    return this.x * this.x + this.y * this.y
  }

  normalize(): Vector2 {
    return this.divide(this.magnitude())
  }

  dot(v: Vector2Types): number {
    if (typeof (v) == 'number') {
      return this.x * v + this.y * v
    } else if (v instanceof Array) {
      return this.x * v[0] + this.y * v[1]
    } else {
      return this.x * v.x + this.y * v.y
    }
  }

  rotate(a: number): Vector2 {
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    this.x = this.x * cos - this.y * sin
    this.y = this.x * sin + this.y * cos
    return this
  }

  angle(): number {
    return -Math.atan2(this.x, this.y)
  }

  transform(matrix: DOMMatrix): Vector2 {
    this.x = this.x * matrix.a + this.y * matrix.c + matrix.e
    this.y = this.x * matrix.b + this.y * matrix.d + matrix.f
    return this
  }
}

interface CanvasParams extends RootParams {
  readonly fskey?: string
  readonly double?: number
  readonly hold?: number
  readonly drag?: number
}

abstract class Canvas {
  readonly fskey?: string
  readonly double: number
  readonly hold: number
  readonly drag2: number
  protected element: HTMLCanvasElement
  protected root: Root
  private request!: number
  private previous!: DOMHighResTimeStamp
  private pointerOrigin: Vector2 | null
  private pointerDelta: Vector2
  private pointerTime: number
  private pointerPositions: Map<number, Vector2>
  private previousDistance: number | null
  private doubleCount!: number
  private transformDown: Transform | undefined
  private transformOver: Transform | undefined
  private holdTimeout: number

  constructor(params: CanvasParams) {
    this.fskey = params.fskey
    this.double = params.double ?? 300
    this.hold = params.hold ?? 700
    this.drag2 = params.drag ? params.drag * params.drag : 0.5
    this.element = params.context.canvas
    this.root = new Root(params)
    this.onWindowResize = this.onWindowResize.bind(this)
    this.onAnimationFrame = this.onAnimationFrame.bind(this)
    this.onWindowKeyDown = this.onWindowKeyDown.bind(this)
    this.onCanvasPointerDown = this.onCanvasPointerDown.bind(this)
    this.onCanvasPointerMove = this.onCanvasPointerMove.bind(this)
    this.onCanvasPointerUp = this.onCanvasPointerUp.bind(this)
    this.onCanvasWheel = this.onCanvasWheel.bind(this)
    this.onCanvasContextMenu = this.onCanvasContextMenu.bind(this)
    this.onHold = this.onHold.bind(this)
    this.pointerOrigin = null
    this.pointerDelta = Vector2.zero()
    this.pointerTime = 0
    this.pointerPositions = new Map()
    this.previousDistance = null
    this.holdTimeout = 0
  }

  startAnimation(): void {
    this.previous = performance.now()
    this.onWindowResize()
    this.request = window.requestAnimationFrame(this.onAnimationFrame)
    window.addEventListener('resize', this.onWindowResize)
    window.addEventListener('keydown', this.onWindowKeyDown)
    this.element.addEventListener('pointerdown', this.onCanvasPointerDown)
    this.element.addEventListener('pointermove', this.onCanvasPointerMove)
    this.element.addEventListener('pointerup', this.onCanvasPointerUp)
    this.element.addEventListener('pointercancel', this.onCanvasPointerUp)
    this.element.addEventListener('pointerleave', this.onCanvasPointerUp)
    this.element.addEventListener('pointerout', this.onCanvasPointerUp)
    this.element.addEventListener('wheel', this.onCanvasWheel)
    this.element.addEventListener('contextmenu', this.onCanvasContextMenu)
  }

  stopAnimation(): void {
    window.cancelAnimationFrame(this.request)
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('keydown', this.onWindowKeyDown)
    this.element.removeEventListener('pointerdown', this.onCanvasPointerDown)
    this.element.removeEventListener('pointermove', this.onCanvasPointerMove)
    this.element.removeEventListener('pointerup', this.onCanvasPointerUp)
    this.element.removeEventListener('pointercancel', this.onCanvasPointerUp)
    this.element.removeEventListener('pointerleave', this.onCanvasPointerUp)
    this.element.removeEventListener('pointerout', this.onCanvasPointerUp)
    this.element.removeEventListener('wheel', this.onCanvasWheel)
    this.element.removeEventListener('contextmenu', this.onCanvasContextMenu)
  }

  private onAnimationFrame(timestamp: DOMHighResTimeStamp) {
    const elapsed = (timestamp - this.previous) * INV_S
    this.root.updateBranch(this.previous, elapsed)
    this.previous = timestamp
    this.root.renderAll()
    this.request = window.requestAnimationFrame(this.onAnimationFrame)
  }

  private onWindowResize() {
    const size = new Vector2(this.element.clientWidth, this.element.clientHeight)
    const offset = size.clone().multiply(0.5)
    this.element.width = size.x * this.root.pixels.x
    this.element.height = size.y * this.root.pixels.y
    this.root.resizeBranch(offset, size)
  }

  private onWindowKeyDown(event: KeyboardEvent) {
    if (event.key == this.fskey) {
      //event.preventDefault()

      if (document.fullscreenElement)
        document.exitFullscreen()
      else
        this.element.requestFullscreen()
    }
  }

  private onCanvasPointerDown(event: PointerEvent) {
    event.preventDefault()
    const position1 = this.getPosition1(event)
    this.pointerPositions.set(event.pointerId, position1)

    switch (this.pointerPositions.size) {
      case 1:
        {
          this.pointerOrigin = position1

          if (Date.now() - this.pointerTime < this.double) {
            this.doubleCount++

            if (this.doubleCount == 1) {
              this.onDouble(this.pointerOrigin)
              this.pointerTime = 0
            }
          } else {
            this.pointerTime = Date.now()
            this.doubleCount = 0
            this.onDown(this.pointerOrigin)
          }
        }

        break

      case 2:
        {
          const position2 = this.getPosition2()
          this.pointerOrigin = position2
        }

        break
    }
  }

  private onCanvasPointerMove(event: PointerEvent) {
    event.preventDefault()
    const position1 = this.getPosition1(event)
    this.pointerPositions.set(event.pointerId, position1)

    switch (this.pointerPositions.size) {
      case 1:
        {
          if (this.pointerOrigin) {
            this.pointerDelta = position1.subtract(this.pointerOrigin)
            this.onDrag(this.pointerOrigin, this.pointerDelta)
          } else {
            this.onMove(position1)
          }
        }

        break

      case 2:
        {
          const delta = this.getDelta()
          const position2 = this.getPosition2(delta)

          if (this.pointerOrigin) {
            this.pointerDelta = position2.subtract(this.pointerOrigin)
            this.onDrag(this.pointerOrigin, this.pointerDelta)
          } else {
            this.onMove(position2)
          }

          const distance = delta.magnitude()

          if (this.previousDistance) {
            const level = distance - this.previousDistance
            this.onZoom(position2, level)
          }

          this.previousDistance = distance
        }

        break
    }
  }

  private onCanvasPointerUp(event: PointerEvent) {
    event.preventDefault()

    if (this.pointerOrigin) {
      this.onUp(this.pointerDelta)
      this.pointerOrigin = null
      this.pointerDelta = Vector2.zero()
    }

    this.pointerPositions.delete(event.pointerId)

    if (this.pointerPositions.size == 0)
      this.previousDistance = null
  }

  private onCanvasWheel(event: WheelEvent) {
    event.preventDefault()
    const position = this.getPosition1(event)
    const distance = 0.1 * event.deltaY
    this.onZoom(position, -distance)
  }

  private onCanvasContextMenu(event: MouseEvent) {
    event.preventDefault()
  }

  private onDown(position: Vector2): void {
    const transform = this.root.containsBranch(position)

    if (transform) {
      this.transformDown = transform
      this.transformDown.onDown?.(this.transformDown)
      this.holdTimeout = setTimeout(this.onHold, this.hold)
    }
  }

  private onDouble(position: Vector2): void {
    const transform = this.root.containsBranch(position)

    if (transform) {
      this.transformDown = transform
      this.transformDown.onDouble?.(this.transformDown)
    }
  }

  private onHold(): void {
    this.holdTimeout = 0
    this.transformDown?.onHold?.(this.transformDown)
    this.transformDown = undefined
  }

  private onUp(delta: Vector2): void {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout)
      this.holdTimeout = 0
    }

    const distance2 = delta.magnitude2()

    if (distance2 > this.drag2)
      this.transformDown?.onDrop?.(this.transformDown, this.transformOver)
    else
      this.transformDown?.onUp?.(this.transformDown)

    this.transformDown = undefined
    this.transformOver = undefined
  }

  private onMove(position: Vector2): void {
    const transform = this.root.containsBranch(position)

    if (transform != this.transformOver) {
      this.transformOver?.onExit?.(this.transformOver)
      this.transformOver = transform
      this.transformOver?.onEnter?.(this.transformOver)
    }
  }

  private onDrag(position: Vector2, delta: Vector2): void {
    if (this.holdTimeout) {
      const distance2 = delta.magnitude2()

      if (distance2 > this.drag2) {
        clearTimeout(this.holdTimeout)
        this.holdTimeout = 0
      }
    }

    const transform = this.root.containsBranch(position.clone().add(delta))

    if (transform != this.transformOver) {
      this.transformOver = transform
    }

    this.transformDown?.onDrag?.(this.transformDown, this.transformOver)
  }

  private onZoom(position: Vector2, distance: number): void {
    //console.warn('zoom')
  }

  private getPosition1(event: PointerEvent | WheelEvent) {
    const rect = this.element.getBoundingClientRect()
    return new Vector2(event.clientX - rect.left, event.clientY - rect.top).subtract(this.root.originOffset())
  }

  private getPosition2(delta?: Vector2) {
    if (delta == undefined) {
      const positions = this.pointerPositions.values()
      const position1 = positions.next().value
      const position2 = positions.next().value
      const delta = position1.clone().subtract(position2)
      return position2.clone().add(delta.clone().multiply(0.5))
    } else {
      const positions = this.pointerPositions.values()
      positions.next()
      const position2 = positions.next().value
      return position2.clone().add(delta.clone().multiply(0.5))
    }
  }

  private getDelta() {
    const positions = this.pointerPositions.values()
    const position1 = positions.next().value
    const position2 = positions.next().value
    return position1.clone().subtract(position2)
  }
}

interface CircleParams extends TransformParams {
  readonly origin?: Vector2Types
  readonly radius?: number
  readonly style?: CanvasFillStyle
}

class Circle extends Transform {
  readonly origin: Vector2
  protected radius: number
  protected style: CanvasFillStyle
  protected path: Path2D

  constructor(spec?: CircleParams) {
    super(spec)
    this.origin = spec?.origin != undefined ? new Vector2(spec.origin) : Vector2.half()
    this.radius = spec?.radius ?? 1
    this.style = spec?.style ?? 'white'
    this.path = new Path2D()
    this.path.arc(this.radius * (1 - 2 * this.origin.x), this.radius * (1 - 2 * this.origin.y), this.radius, 0, TWO_PI)
  }

  renderSelf(root: Transform): void {
    this.context.fillStyle = this.style
    this.context.fill(this.path)
  }

  containsSelf(position: Vector2): Circle | undefined {
    return this.context.isPointInPath(this.path, position.x, position.y) ? this : undefined
  }
}

interface ColorParams extends LayoutParams {
  readonly style?: CanvasFillStyle
}

class Color extends Layout {
  protected style: CanvasFillStyle
  protected path: Path2D

  constructor(spec?: ColorParams) {
    super(spec)
    this.style = spec?.style ?? 'white'
    this.path = new Path2D()
  }

  resizeSelf(offset: Vector2, size: Vector2): void {
    super.resizeSelf(offset, size)
    this.path = new Path2D()
    this.path.rect(this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y)
  }

  renderSelf(root: Transform): void {
    this.context.fillStyle = this.style
    this.context.fill(this.path)
  }
}

interface ConsoleParams extends LayoutParams {
  readonly styles?: [CanvasFillStyle, CanvasFillStyle]
}

class Console extends Layout {
  protected styles: [CanvasFillStyle, CanvasFillStyle]
  protected lines: Text

  constructor(params?: ConsoleParams) {
    super({ ...params, origin: 0 })
    this.styles = params?.styles ?? ['white', 'orange']
    this.lines = new Text({ depth: params?.depth, align: 'left', baseline: 'top', reverse: true })
    this.add(this.lines)
  }

  resizeSelf(offset: Vector2, size: Vector2): void {
    super.resizeSelf(offset, size)
    this.removeOverflow()
  }

  info(...line: unknown[]): void {
    this.logLine(this.styles[0], ...line)
  }

  warn(...line: unknown[]): void {
    this.logLine(this.styles[1], ...line)
  }

  protected logLine(style: CanvasFillStyle, ...line: unknown[]): void {
    this.lines.addLine(line.map(v => JSON.stringify(v)).join('  '), style)

    if (this.parent)
      this.removeOverflow()
  }

  protected removeOverflow(): void {
    for (let height = this.lines.getHeight(); height > this.size.y; height -= this.lines.height)
      this.lines.removeLine()
  }
}

interface EntityParams extends TransformParams {
  readonly origin?: Vector2Types
  readonly size?: Vector2Types
}

class Entity extends Transform {
  readonly origin: Vector2
  readonly size: Vector2

  constructor(spec?: EntityParams) {
    super(spec)
    this.origin = spec?.origin != undefined ? new Vector2(spec.origin) : Vector2.half()
    this.size = spec?.size != undefined ? new Vector2(spec.size) : Vector2.one()
  }
}

interface GridParams extends LayoutParams {
  readonly cells?: Vector2Types
}

class Grid extends Layout {
  protected cells: Vector2

  constructor(params?: GridParams) {
    super(params)
    this.cells = params?.cells != undefined ? new Vector2(params.cells) : new Vector2(2)
  }

  add(child: Transform): Transform {
    super.add(child)
    this.resizeChildren()
    return this
  }

  remove(id: number): Transform {
    super.remove(id)
    this.resizeChildren()
    return this
  }

  resize(width: number, height: number): void {
    this.cells = new Vector2(width, height)
    this.resizeChildren()
  }

  resizeChildren(): void {
    const size = this.size.clone().divide(this.cells)
    const offset = this.size.clone().multiply(-0.5).add(size.clone().multiply(0.5))
    const startx = offset.x
    let cols = 0

    for (const child of this) {
      if (child instanceof Layout)
        child.resizeBranch(offset, size)
      else
        child.position = offset

      if (++cols >= this.cells.x) {
        offset.x = startx
        offset.y += size.y
        cols = 0
      } else
        offset.x += size.x
    }
  }
}

//interface ImageParams extends Omit<EntityParams, 'size'> {
interface ImageParams extends EntityParams {
  readonly src?: string
  readonly alpha?: number
}

class Image extends Entity {
  protected image: HTMLImageElement
  protected alpha: number

  constructor(spec?: ImageParams) {
    super(spec)
    this.image = document.createElement('img')

    if (spec?.src) {
      //this.image.addEventListener('load', this.onLoadImage.bind(this), false)
      this.image.src = spec.src
    }

    this.alpha = spec?.alpha ?? 1
  }

  renderSelf(root: Transform): void {
    if (this.image.complete) {
      this.context.globalAlpha = this.alpha
      this.context.drawImage(this.image, this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y)
    }
  }

  containsSelf(position: Vector2): Transform | undefined {
    const topLeft = this.size.clone().multiply(this.origin.clone().negate())
    const bottomRight = this.size.clone().multiply(Vector2.one().subtract(this.origin))
    return position.x > topLeft.x && position.y > topLeft.y && position.x < bottomRight.x && position.y < bottomRight.y ? this : undefined
  }

  setSource(src?: string): void {
    this.image.src = src ?? ''
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha
  }

  /*private onLoadImage(event: Event): void {
    console.log('LOADED')
  }*/
}

interface ListParams extends LayoutParams {
  readonly vertical?: boolean
}

class List extends Layout {
  readonly vertical: boolean
  protected sizes: [Vector2, Vector2, Vector2]

  constructor(spec?: ListParams) {
    super(spec)
    this.vertical = spec?.vertical ?? false
    this.sizes = [Vector2.zero(), Vector2.zero(), Vector2.zero()]
  }

  add(child: Transform): Transform {
    super.add(child)
    this.addModeSize(child)
    this.resizeChildren()
    return this
  }

  remove(id: number): Transform {
    const child = super.remove(id)
    this.removeModeSize(child)
    this.resizeChildren()
    return this
  }

  resizeChildren(): void {
    if (this.vertical) {
      const offset = this.size.clone().multiply([0.5 - this.origin.x, -0.5])

      for (const child of this) {
        if (child instanceof Layout) {
          const [my, sy] = child.mode[1]
          const size = new Vector2()
          const free = this.size.y - this.sizes[LayoutMode.Absolute].y
          const left = free - this.sizes[LayoutMode.Relative].y * free

          switch (my) {
            case LayoutMode.Absolute:
              size.y = sy
              break
            case LayoutMode.Relative:
              size.y = sy * free
              break
            case LayoutMode.Weighted:
              size.y = sy / this.sizes[LayoutMode.Weighted].y * left
          }

          size.x = this.size.x
          offset.y += size.y * 0.5
          child.resizeBranch(offset, size)
          offset.y += size.y * 0.5
        }
      }
    } else {
      const offset = this.size.clone().multiply([-0.5, 0.5 - this.origin.y])

      for (const child of this) {
        if (child instanceof Layout) {
          const [mx, sx] = child.mode[0]
          const size = new Vector2()
          const free = this.size.x - this.sizes[LayoutMode.Absolute].x
          const left = free - this.sizes[LayoutMode.Relative].x * free

          switch (mx) {
            case LayoutMode.Absolute:
              size.x = sx
              break
            case LayoutMode.Relative:
              size.x = sx * free
              break
            case LayoutMode.Weighted:
              size.x = sx / this.sizes[LayoutMode.Weighted].x * left
          }

          size.y = this.size.y
          offset.x += size.x * 0.5
          child.resizeBranch(offset, size)
          offset.x += size.x * 0.5
        }
      }
    }
  }

  private addModeSize(child: Transform): void {
    if (child instanceof Layout) {
      const [[mx, sx], [my, sy]] = child.mode
      this.sizes[mx].x += sx
      this.sizes[my].y += sy
    }
  }

  private removeModeSize(child: Transform): void {
    if (child instanceof Layout) {
      const [[mx, sx], [my, sy]] = child.mode
      this.sizes[mx].x -= sx
      this.sizes[my].y -= sy
    }
  }
}

interface MarginParams {
  readonly left?: number
  readonly top?: number
  readonly right?: number
  readonly bottom?: number
}

class Margin {
  readonly leftTop: Vector2
  readonly rightBottom: Vector2

  constructor(params?: MarginTypes) {
    if (params instanceof Array) {
      this.leftTop = new Vector2(params[0], params[1])
      this.rightBottom = new Vector2(params[2], params[3])
    } else if (typeof params != 'number') {
      this.leftTop = new Vector2(params?.left ?? 0, params?.top ?? 0)
      this.rightBottom = new Vector2(params?.right ?? 0, params?.bottom ?? 0)
    } else {
      this.leftTop = new Vector2(params, params)
      this.rightBottom = new Vector2(params, params)
    }
  }

  static zero(): Margin {
    return new Margin(0)
  }

  static from(other: Margin): Margin {
    return new Margin([other.leftTop.x, other.leftTop.y, other.rightBottom.x, other.rightBottom.y])
  }
}

interface RectParams extends EntityParams {
  readonly style?: CanvasFillStyle
}

class Rect extends Entity {
  style: CanvasFillStyle
  protected path: Path2D

  constructor(spec?: RectParams) {
    super(spec)
    this.style = spec?.style ?? 'white'
    this.path = new Path2D()
    this.path.rect(this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y)
  }

  renderSelf(root: Transform): void {
    this.context.fillStyle = this.style
    this.context.fill(this.path)
  }

  containsSelf(position: Vector2): Transform | undefined {
    return this.context.isPointInPath(this.path, position.x, position.y) ? this : undefined
  }
}

interface RootParams extends LayoutParams {
  readonly context: CanvasRenderingContext2D
  readonly pixels?: Vector2Types
  readonly style?: CanvasFillStyle
  readonly font?: string
  readonly showFPS?: boolean
}

class Root extends Layout {
  readonly pixels: Vector2
  protected showFPS: boolean
  protected fps: number

  constructor(spec: RootParams) {
    super(spec)
    this.context = spec.context
    this.pixels = spec?.pixels != undefined ? new Vector2(spec.pixels) : new Vector2(window.devicePixelRatio, window.devicePixelRatio)
    this.showFPS = spec?.showFPS ?? false
    this.fps = 0
  }

  updateBranch(previous: DOMHighResTimeStamp, elapsed: number, root?: Transform): boolean {
    this.fps = Math.round(1 / elapsed)
    return super.updateBranch(previous, elapsed, root)
  }

  renderAll(root?: Transform): void {
    root ??= this
    this.context.save()
    this.context.scale(this.pixels.x, this.pixels.y)
    this.context.clearRect(0, 0, this.size.x * this.scale.x, this.size.y * this.scale.y)
    this.context.save()
    this.transform(root)

    for (const depth of this.layers.keys()) {
      this.renderLayer(depth, root)
    }

    this.context.restore()

    if (this.showFPS) {
      this.context.fillStyle = 'orange'
      this.context.font = 'sans-serif'
      this.context.textAlign = 'left'
      this.context.textBaseline = 'top'
      this.context.fillText(this.fps.toString(), 0, 0)
    }

    this.context.restore()
  }
}

interface TextParams extends TransformParams {
  readonly font?: string
  readonly style?: CanvasFillStyle
  readonly align?: CanvasTextAlign
  readonly baseline?: CanvasTextBaseline
  readonly lines?: [string, CanvasFillStyle?][]
  readonly offset?: Vector2Types
  readonly height?: number
  readonly reverse?: boolean
}

class Text extends Transform {
  readonly font: string
  readonly style: CanvasFillStyle
  readonly align: CanvasTextAlign
  readonly baseline: CanvasTextBaseline
  readonly offset: Vector2
  readonly height: number
  readonly reverse: boolean

  protected lines: [string, CanvasFillStyle?][]

  constructor(params?: TextParams) {
    super(params)
    this.font = params?.font ?? 'sans-serif'
    this.style = params?.style ?? 'white'
    this.align = params?.align ?? 'center'
    this.baseline = params?.baseline ?? 'middle'
    this.lines = params?.lines ?? []
    this.offset = params?.offset != undefined ? new Vector2(params.offset) : Vector2.zero()
    this.height = params?.height ?? 16
    this.reverse = params?.reverse ?? false
  }

  renderSelf(root?: Transform): void {
    this.context.font = this.font
    this.context.textAlign = this.align
    this.context.textBaseline = this.baseline

    for (const [line, style] of this.lines.values()) {
      this.context.fillStyle = style ?? this.style
      this.context.fillText(line, this.offset.x, this.offset.y)
      this.context.translate(0, this.height)
    }
  }

  getHeight(): number {
    return this.lines.length * this.height
  }

  setLine(line: string, style?: CanvasFillStyle): void {
    this.lines = [[line, style]]
  }

  removeLine(): void {
    if (this.reverse) {
      this.lines.pop()
    } else {
      this.lines.shift()
    }
  }

  addLine(line: string, style?: CanvasFillStyle): void {
    if (this.reverse) {
      this.lines.unshift([line, style])
    } else {
      this.lines.push([line, style])
    }
  }
}

interface TextureParams extends LayoutParams {
  readonly src: string
  readonly alpha?: number
}

class Texture extends Layout {
  protected alpha: number
  protected image: HTMLImageElement

  constructor(params: TextureParams) {
    super(params)
    this.image = document.createElement('img')
    this.image.src = params.src
    this.alpha = params.alpha ?? 1
  }

  renderSelf(root: Transform): void {
    if (this.image.complete) {
      this.context.globalAlpha = this.alpha
      this.context.drawImage(this.image, this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y)
    }
  }
}

interface TimerParams extends TextParams {
  readonly time?: number
  readonly hideOnZero?: boolean
}

class Timer extends Text {
  time: number
  hideOnZero?: true

  private isRunning?: true
  private resolveStart: ((value: void) => void) | null
  private rejectStart: ((value: void) => void) | null

  constructor(params?: TimerParams) {
    super(params)
    this.time = params?.time ? params.time < 0 ? 0 : params.time / 1000 : 0
    this.lines = [[Math.ceil(this.time).toString(), undefined]]
    this.hideOnZero = params?.hideOnZero || undefined
    this.resolveStart = null
    this.rejectStart = null
  }

  updateSelf(previous: DOMHighResTimeStamp, elapsed: number, root: Transform): boolean {
    if (this.isRunning) {
      this.time -= elapsed

      if (this.time <= 0) {
        this.resetTime()

        if (this.resolveStart) {
          this.resolveStart()
          this.resolveStart = null
          this.rejectStart = null
        }
      } else
        this.lines = [[Math.ceil(this.time).toString(), undefined]]
    }

    return false
  }

  start(time?: number): Promise<void> {
    if (time != undefined) {
      this.time = time < 0 ? 0 : time / 1000
    }

    this.isRunning = true

    return new Promise((resolve, reject) => { this.resolveStart = resolve; this.rejectStart = reject })
  }

  stop(): void {
    this.resetTime()

    if (this.rejectStart) {
      this.rejectStart()
      this.rejectStart = null
      this.resolveStart = null
    }
  }

  private resetTime() {
    this.time = 0
    this.lines = [['0', undefined]]
    this.isRunning = undefined
    this.hideOnZero && this.hideSelf()
  }
}

class Vector3 {
  x: number
  y: number
  z: number

  constructor(x?: Vector3Types, y?: number, z?: number) {
    if (x == undefined) {
      this.x = 0
      this.y = 0
      this.z = 0
    } else if (typeof (x) == 'number') {
      this.x = x
      this.y = y ?? this.x
      this.z = z ?? this.y
    } else if (x instanceof Array) {
      this.x = x[0]
      this.y = x[1]
      this.z = x[2]
    } else {
      this.x = x.x
      this.y = x.y
      this.z = x.z
    }
  }

  static zero(): Vector3 {
    return new Vector3()
  }

  static half(): Vector3 {
    return new Vector3(0.5)
  }

  static one(): Vector3 {
    return new Vector3(1)
  }

  clone(): Vector3 {
    return new Vector3(this)
  }

  isZero(): boolean {
    return this.x === 0 && this.y === 0 && this.z === 0
  }

  add(v: Vector3Types): Vector3 {
    if (typeof (v) == 'number') {
      this.x += v
      this.y += v
      this.z += v
    } else if (v instanceof Array) {
      this.x += v[0]
      this.y += v[1]
      this.z += v[2]
    } else {
      this.x += v.x
      this.y += v.y
      this.z += v.z
    }

    return this
  }

  subtract(v: Vector3Types): Vector3 {
    if (typeof (v) == 'number') {
      this.x -= v
      this.y -= v
      this.z -= v
    } else if (v instanceof Array) {
      this.x -= v[0]
      this.y -= v[1]
      this.z -= v[2]
    } else {
      this.x -= v.x
      this.y -= v.y
      this.z -= v.z
    }

    return this
  }

  multiply(v: Vector3Types): Vector3 {
    if (typeof (v) == 'number') {
      this.x *= v
      this.y *= v
      this.z *= v
    } else if (v instanceof Array) {
      this.x *= v[0]
      this.y *= v[1]
      this.z *= v[2]
    } else {
      this.x *= v.x
      this.y *= v.y
      this.z *= v.z
    }

    return this
  }

  divide(v: Vector3Types): Vector3 {
    if (typeof (v) == 'number') {
      this.x /= v
      this.y /= v
      this.z /= v
    } else if (v instanceof Array) {
      this.x /= v[0]
      this.y /= v[1]
      this.z /= v[2]
    } else {
      this.x /= v.x
      this.y /= v.y
      this.z /= v.z
    }

    return this
  }

  negate(): Vector3 {
    this.x = -this.x
    this.y = -this.y
    this.z = -this.z
    return this
  }

  invert(): Vector3 {
    this.x = 1 / this.x
    this.y = 1 / this.y
    this.z = 1 / this.z
    return this
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }

  magnitude2(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  normalize(): Vector3 {
    return this.divide(this.magnitude())
  }

  dot(v: Vector3Types): number {
    if (typeof (v) == 'number') {
      return this.x * v + this.y * v + this.z * v
    } else if (v instanceof Array) {
      return this.x * v[0] + this.y * v[1] + this.z * v[2]
    } else {
      return this.x * v.x + this.y * v.y + this.z + v.z
    }
  }
}

class Vector4 {
  x: number
  y: number
  z: number
  w: number

  constructor(x?: Vector4Types, y?: number, z?: number, w?: number) {
    if (x == undefined) {
      this.x = 0
      this.y = 0
      this.z = 0
      this.w = 0
    } else if (typeof (x) == 'number') {
      this.x = x
      this.y = y ?? this.x
      this.z = z ?? this.y
      this.w = w ?? this.z
    } else if (x instanceof Array) {
      this.x = x[0]
      this.y = x[1]
      this.z = x[2]
      this.w = x[3]
    } else {
      this.x = x.x
      this.y = x.y
      this.z = x.z
      this.w = x.w
    }
  }

  static zero(): Vector4 {
    return new Vector4()
  }

  static half(): Vector4 {
    return new Vector4(0.5)
  }

  static one(): Vector4 {
    return new Vector4(1)
  }

  clone(): Vector4 {
    return new Vector4(this)
  }

  isZero(): boolean {
    return this.x === 0 && this.y === 0 && this.z === 0 && this.w === 0
  }

  xy(): Vector2 {
    return new Vector2(this.x, this.y)
  }

  zw(): Vector2 {
    return new Vector2(this.z, this.w)
  }

  add(v: Vector4Types): Vector4 {
    if (typeof (v) == 'number') {
      this.x += v
      this.y += v
      this.z += v
      this.w += v
    } else if (v instanceof Array) {
      this.x += v[0]
      this.y += v[1]
      this.z += v[2]
      this.w += v[3]
    } else {
      this.x += v.x
      this.y += v.y
      this.z += v.z
      this.w += v.w
    }

    return this
  }

  subtract(v: Vector4Types): Vector4 {
    if (typeof (v) == 'number') {
      this.x -= v
      this.y -= v
      this.z -= v
      this.w -= v
    } else if (v instanceof Array) {
      this.x -= v[0]
      this.y -= v[1]
      this.z -= v[2]
      this.w -= v[3]
    } else {
      this.x -= v.x
      this.y -= v.y
      this.z -= v.z
      this.w -= v.w
    }

    return this
  }

  multiply(v: Vector4Types): Vector4 {
    if (typeof (v) == 'number') {
      this.x *= v
      this.y *= v
      this.z *= v
      this.w *= v
    } else if (v instanceof Array) {
      this.x *= v[0]
      this.y *= v[1]
      this.z *= v[2]
      this.w *= v[3]
    } else {
      this.x *= v.x
      this.y *= v.y
      this.z *= v.z
      this.w *= v.w
    }

    return this
  }

  divide(v: Vector4Types): Vector4 {
    if (typeof (v) == 'number') {
      this.x /= v
      this.y /= v
      this.z /= v
      this.w /= v
    } else if (v instanceof Array) {
      this.x /= v[0]
      this.y /= v[1]
      this.z /= v[2]
      this.w /= v[3]
    } else {
      this.x /= v.x
      this.y /= v.y
      this.z /= v.z
      this.w /= v.w
    }

    return this
  }

  negate(): Vector4 {
    this.x = -this.x
    this.y = -this.y
    this.z = -this.z
    this.w = -this.w
    return this
  }

  invert(): Vector4 {
    this.x = 1 / this.x
    this.y = 1 / this.y
    this.z = 1 / this.z
    this.w = 1 / this.w
    return this
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)
  }

  magnitude2(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
  }

  normalize(): Vector4 {
    return this.divide(this.magnitude())
  }

  dot(v: Vector4Types): number {
    if (typeof (v) == 'number') {
      return this.x * v + this.y * v + this.z * v + this.w * v
    } else if (v instanceof Array) {
      return this.x * v[0] + this.y * v[1] + this.z * v[2] + this.w * v[3]
    } else {
      return this.x * v.x + this.y * v.y + this.z + v.z + this.w * v.w
    }
  }
}

export { Canvas, CanvasParams, Circle, CircleParams, Color, ColorParams, Console, ConsoleParams, Entity, EntityParams, Grid, GridParams, Image, ImageParams, Layout, LayoutParams, LayoutMode, List, ListParams, Margin, MarginTypes, Rect, RectParams, Root, RootParams, Text, TextParams, Texture, TextureParams, Timer, TimerParams, Transform, TransformParams, Vector2, Vector2Types, Vector3, Vector3Types, Vector4, Vector4Types }
