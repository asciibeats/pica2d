const INV_S = 1 / 1000;
const TWO_PI = 2 * Math.PI;
class Transform {
    constructor(spec) {
        var _a, _b, _c, _d, _e;
        this.id = (_a = spec === null || spec === void 0 ? void 0 : spec.id) !== null && _a !== void 0 ? _a : --Transform.nullID;
        this.position = (spec === null || spec === void 0 ? void 0 : spec.position) != undefined ? new Vector2(spec.position) : Vector2.zero();
        this.rotation = (_b = spec === null || spec === void 0 ? void 0 : spec.rotation) !== null && _b !== void 0 ? _b : 0;
        this.rotationIsAbsolute = (spec === null || spec === void 0 ? void 0 : spec.rotationIsAbsolute) || undefined;
        this.scale = (spec === null || spec === void 0 ? void 0 : spec.scale) != undefined ? new Vector2(spec.scale) : Vector2.one();
        this.scaleIsAbsolute = (spec === null || spec === void 0 ? void 0 : spec.scaleIsAbsolute) || undefined;
        this.depth = (_c = spec === null || spec === void 0 ? void 0 : spec.depth) !== null && _c !== void 0 ? _c : 0;
        this.flip = new Vector2(((_d = spec === null || spec === void 0 ? void 0 : spec.flip) === null || _d === void 0 ? void 0 : _d.x) ? -1 : 1, ((_e = spec === null || spec === void 0 ? void 0 : spec.flip) === null || _e === void 0 ? void 0 : _e.y) ? -1 : 1);
        this.visibleSelf = (spec === null || spec === void 0 ? void 0 : spec.hide) || (spec === null || spec === void 0 ? void 0 : spec.hideSelf) ? false : true;
        this.visibleChildren = (spec === null || spec === void 0 ? void 0 : spec.hide) || (spec === null || spec === void 0 ? void 0 : spec.hideChildren) ? false : true;
        this.handleEvents = (spec === null || spec === void 0 ? void 0 : spec.events) ? true : undefined;
        this.onDown = spec === null || spec === void 0 ? void 0 : spec.onDown;
        this.onDouble = spec === null || spec === void 0 ? void 0 : spec.onDouble;
        this.onHold = spec === null || spec === void 0 ? void 0 : spec.onHold;
        this.onUp = spec === null || spec === void 0 ? void 0 : spec.onUp;
        this.onEnter = spec === null || spec === void 0 ? void 0 : spec.onEnter;
        this.onExit = spec === null || spec === void 0 ? void 0 : spec.onExit;
        this.onDrag = spec === null || spec === void 0 ? void 0 : spec.onDrag;
        this.onDrop = spec === null || spec === void 0 ? void 0 : spec.onDrop;
        this.parent = null;
        this.children = new Map();
        this.layers = new Map();
    }
    *[Symbol.iterator]() {
        for (const child of this.children.values())
            yield child;
    }
    add(child) {
        if (this.children.has(child.id)) {
            console.error('id collision');
            return this;
        }
        this.attach(child);
        this.children.set(child.id, child);
        return this;
    }
    remove(id) {
        const child = this.children.get(id);
        if (child) {
            this.detach(child);
            this.children.delete(id);
        }
        else
            console.warn('no child');
        return this;
    }
    /*getChildren<T extends Transform = Transform>(): Map<number, T> {
      return this.children as Map<number, T>
    }*/
    childCount() {
        return this.children.size;
    }
    rotatePosition(position, rotation) {
        this.position = position.rotate(rotation);
        this.rotation = rotation;
    }
    sort(func) {
        this.children = new Map([...this.children.values()].sort(func).map(value => [value.id, value]));
    }
    removeAll() {
        for (const id of this.children.keys())
            this.remove(id);
        return this;
    }
    get(id) {
        return this.children.get(id);
    }
    first() {
        return this.children.values().next().value;
    }
    pop() {
        const child = this.children.values().next().value;
        if (child) {
            this.detach(child);
            this.children.delete(child.id);
            return child;
        }
    }
    has(id) {
        return this.children.has(id);
    }
    updateSelf(previous, elapsed, root) {
        return false;
    }
    updateBranch(previous, elapsed, root) {
        root !== null && root !== void 0 ? root : (root = this);
        if (this.updateSelf(previous, elapsed, root))
            return true;
        for (const child of this.children.values()) {
            if (child.updateBranch(previous, elapsed, root))
                this.remove(child.id);
        }
        return false;
    }
    renderSelf(root) {
        return;
    }
    renderBranch(depth, root) {
        root !== null && root !== void 0 ? root : (root = this);
        this.context.save();
        this.transform(root);
        this.renderLayer(depth, root);
        this.context.restore();
    }
    renderAll(root) {
        root !== null && root !== void 0 ? root : (root = this);
        this.context.save();
        this.transform(root);
        for (const depth of this.layers.keys())
            this.renderLayer(depth, root);
        this.context.restore();
    }
    renderLayer(depth, root) {
        if (this.visibleSelf && depth == this.depth)
            this.renderSelf(root);
        if (this.visibleChildren) {
            const layer = this.layers.get(depth);
            if (layer)
                for (const child of layer.values())
                    child.renderBranch(depth, root);
        }
    }
    getMatrix(absolute = false, root) {
        root !== null && root !== void 0 ? root : (root = this);
        this.context.save();
        let parent = this;
        do {
            parent.transform(root);
            parent = parent.parent;
        } while (absolute && parent);
        const matrix = this.context.getTransform();
        this.context.restore();
        return matrix;
    }
    containsSelf(position) {
        return;
    }
    containsBranch(position) {
        if (this.visibleChildren) {
            for (const layer of [...this.layers.values()].reverse()) {
                for (const child of layer.values()) {
                    const transform = child.containsBranch(position.clone().subtract(child.position).rotate(child.rotation).divide(child.scale));
                    if (transform)
                        return transform;
                }
            }
        }
        if (this.handleEvents && this.visibleSelf)
            return this.containsSelf(position);
    }
    find(callback) {
        if (callback(this))
            return this;
        for (const child of this.children.values()) {
            const found = child.find(callback);
            if (found)
                return found;
        }
        return;
    }
    each(callback) {
        for (const child of this.children.values())
            callback(child);
    }
    filter(callback) {
        let transforms = [];
        if (callback(this))
            transforms.push(this);
        for (const child of this.children.values())
            transforms = transforms.concat(child.filter(callback));
        return transforms;
    }
    show() {
        this.visibleSelf = true;
        this.visibleChildren = true;
    }
    hide() {
        this.visibleSelf = false;
        this.visibleChildren = false;
    }
    toggle() {
        this.visibleSelf = !this.visibleSelf;
        this.visibleChildren = !this.visibleChildren;
    }
    showSelf() {
        this.visibleSelf = true;
    }
    hideSelf() {
        this.visibleSelf = false;
    }
    toggleSelf() {
        this.visibleSelf = !this.visibleSelf;
    }
    showChildren() {
        this.visibleChildren = true;
    }
    hideChildren() {
        this.visibleChildren = false;
    }
    toggleChildren() {
        this.visibleChildren = !this.visibleChildren;
    }
    getParent(depth) {
        let parent = this.parent;
        for (let i = 0; i < depth; i++) {
            if (parent)
                parent = parent.parent;
            else
                return null;
        }
        return parent;
    }
    attach(child) {
        for (const depth of child.layers.keys())
            this.addLayer(depth, child);
        this.addLayer(child.depth, child);
        child.setContext(this.context);
        child.parent = this;
    }
    detach(child) {
        for (const depth of child.layers.keys())
            this.removeLayer(depth, child.id);
        this.removeLayer(child.depth, child.id);
        //child.unsetContext()
        child.parent = null;
    }
    transform(root) {
        this.context.translate(this.position.x * this.flip.x, this.position.y * this.flip.y);
        if (this.rotationIsAbsolute)
            this.context.rotate(this.rotation - root.rotation);
        else
            this.context.rotate(this.rotation);
        if (this.scaleIsAbsolute)
            this.context.scale(this.scale.x / root.scale.x * this.flip.x, this.scale.y / root.scale.y * this.flip.y);
        else
            this.context.scale(this.scale.x * this.flip.x, this.scale.y * this.flip.y);
    }
    setContext(context) {
        this.context = context;
        for (const child of this.children.values())
            child.setContext(context);
    }
    /*protected unsetContext(): void {
      this.context = null
  
      for (const child of this.children.values())
        child.unsetContext()
    }*/
    addLayer(depth, child) {
        var _a;
        const layer = this.layers.get(depth);
        if (layer)
            layer.set(child.id, child);
        else {
            this.layers.set(depth, new Map([[child.id, child]]));
            this.layers = new Map([...this.layers.entries()].sort((a, b) => a[0] - b[0]));
            (_a = this.parent) === null || _a === void 0 ? void 0 : _a.addLayer(depth, this);
        }
    }
    removeLayer(depth, id) {
        var _a;
        const layer = this.layers.get(depth);
        if (layer) {
            layer.delete(id);
            if (layer.size == 0) {
                this.layers.delete(depth);
                (_a = this.parent) === null || _a === void 0 ? void 0 : _a.removeLayer(depth, this.id);
            }
        } /* else
          console.warn('no layer')*/
    }
}
Transform.nullID = 0;
var LayoutMode;
(function (LayoutMode) {
    LayoutMode[LayoutMode["Absolute"] = 0] = "Absolute";
    LayoutMode[LayoutMode["Relative"] = 1] = "Relative";
    LayoutMode[LayoutMode["Weighted"] = 2] = "Weighted";
})(LayoutMode || (LayoutMode = {}));
class Layout extends Transform {
    constructor(params) {
        var _a;
        super(params);
        this.mode = (_a = params === null || params === void 0 ? void 0 : params.mode) !== null && _a !== void 0 ? _a : [[LayoutMode.Weighted, 1], [LayoutMode.Weighted, 1]];
        this.origin = (params === null || params === void 0 ? void 0 : params.origin) != undefined ? new Vector2(params.origin) : Vector2.half();
        this.margin = (params === null || params === void 0 ? void 0 : params.margin) != undefined ? new Margin(params.margin) : Margin.zero();
        this.aspect = (params === null || params === void 0 ? void 0 : params.aspect) != undefined ? new Vector2(params.aspect) : undefined;
        this.size = Vector2.zero();
    }
    resizeSelf(offset, size) {
        this.size = size.clone().subtract(this.margin.leftTop).subtract(this.margin.rightBottom);
        if (this.aspect) {
            if (this.size.x > this.size.y)
                this.size.x = this.size.y * this.aspect.x / this.aspect.y;
            else
                this.size.y = this.size.x * this.aspect.y / this.aspect.x;
        }
        this.position = offset.clone().subtract(this.size.clone().multiply(Vector2.half().subtract(this.origin)));
        this.size.divide(this.scale);
    }
    resizeChildren() {
        for (const child of this) {
            if (child instanceof Layout) {
                const [[mx, sx], [my, sy]] = child.mode;
                const offset = this.size.clone().multiply(Vector2.half().subtract(this.origin));
                const size = new Vector2();
                switch (mx) {
                    case LayoutMode.Absolute:
                        size.x = sx;
                        break;
                    case LayoutMode.Relative:
                        size.x = sx * this.size.x;
                        break;
                    case LayoutMode.Weighted:
                        size.x = this.size.x;
                }
                switch (my) {
                    case LayoutMode.Absolute:
                        size.y = sy;
                        break;
                    case LayoutMode.Relative:
                        size.y = sy * this.size.y;
                        break;
                    case LayoutMode.Weighted:
                        size.y = this.size.y;
                }
                child.resizeBranch(offset, size);
            }
        }
    }
    resizeBranch(offset, size) {
        this.resizeSelf(offset, size);
        this.resizeChildren();
    }
    containsSelf(position) {
        const topLeft = this.size.clone().multiply(this.origin.clone().negate());
        const bottomRight = this.size.clone().multiply(Vector2.one().subtract(this.origin));
        return position.x > topLeft.x && position.y > topLeft.y && position.x < bottomRight.x && position.y < bottomRight.y ? this : undefined;
    }
    originOffset() {
        return this.size.clone().multiply(this.origin);
    }
}
class Vector2 {
    constructor(x, y) {
        if (x == undefined) {
            this.x = 0;
            this.y = 0;
        }
        else if (typeof (x) == 'number') {
            this.x = x;
            this.y = y !== null && y !== void 0 ? y : this.x;
        }
        else if (x instanceof Array) {
            this.x = x[0];
            this.y = x[1];
        }
        else {
            this.x = x.x;
            this.y = x.y;
        }
    }
    static zero() {
        return new Vector2();
    }
    static half() {
        return new Vector2(0.5);
    }
    static one() {
        return new Vector2(1);
    }
    static angle(a) {
        return new Vector2(Math.cos(a), Math.sin(a));
    }
    clone() {
        return new Vector2(this);
    }
    isZero() {
        return this.x === 0 && this.y === 0;
    }
    add(v) {
        if (typeof (v) == 'number') {
            this.x += v;
            this.y += v;
        }
        else if (v instanceof Array) {
            this.x += v[0];
            this.y += v[1];
        }
        else {
            this.x += v.x;
            this.y += v.y;
        }
        return this;
    }
    subtract(v) {
        if (typeof (v) == 'number') {
            this.x -= v;
            this.y -= v;
        }
        else if (v instanceof Array) {
            this.x -= v[0];
            this.y -= v[1];
        }
        else {
            this.x -= v.x;
            this.y -= v.y;
        }
        return this;
    }
    multiply(v) {
        if (typeof (v) == 'number') {
            this.x *= v;
            this.y *= v;
        }
        else if (v instanceof Array) {
            this.x *= v[0];
            this.y *= v[1];
        }
        else {
            this.x *= v.x;
            this.y *= v.y;
        }
        return this;
    }
    divide(v) {
        if (typeof (v) == 'number') {
            this.x /= v;
            this.y /= v;
        }
        else if (v instanceof Array) {
            this.x /= v[0];
            this.y /= v[1];
        }
        else {
            this.x /= v.x;
            this.y /= v.y;
        }
        return this;
    }
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }
    invert() {
        this.x = 1 / this.x;
        this.y = 1 / this.y;
        return this;
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    magnitude2() {
        return this.x * this.x + this.y * this.y;
    }
    normalize() {
        return this.divide(this.magnitude());
    }
    dot(v) {
        if (typeof (v) == 'number') {
            return this.x * v + this.y * v;
        }
        else if (v instanceof Array) {
            return this.x * v[0] + this.y * v[1];
        }
        else {
            return this.x * v.x + this.y * v.y;
        }
    }
    rotate(a) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        this.x = this.x * cos - this.y * sin;
        this.y = this.x * sin + this.y * cos;
        return this;
    }
    angle() {
        return -Math.atan2(this.x, this.y);
    }
    transform(matrix) {
        this.x = this.x * matrix.a + this.y * matrix.c + matrix.e;
        this.y = this.x * matrix.b + this.y * matrix.d + matrix.f;
        return this;
    }
}
class Canvas {
    constructor(params) {
        var _a, _b;
        this.fskey = params.fskey;
        this.double = (_a = params.double) !== null && _a !== void 0 ? _a : 300;
        this.hold = (_b = params.hold) !== null && _b !== void 0 ? _b : 700;
        this.drag2 = params.drag ? params.drag * params.drag : 0.5;
        this.element = params.context.canvas;
        this.root = new Root(params);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onAnimationFrame = this.onAnimationFrame.bind(this);
        this.onWindowKeyDown = this.onWindowKeyDown.bind(this);
        this.onCanvasPointerDown = this.onCanvasPointerDown.bind(this);
        this.onCanvasPointerMove = this.onCanvasPointerMove.bind(this);
        this.onCanvasPointerUp = this.onCanvasPointerUp.bind(this);
        this.onCanvasWheel = this.onCanvasWheel.bind(this);
        this.onCanvasContextMenu = this.onCanvasContextMenu.bind(this);
        this.onHold = this.onHold.bind(this);
        this.pointerOrigin = null;
        this.pointerDelta = Vector2.zero();
        this.pointerTime = 0;
        this.pointerPositions = new Map();
        this.previousDistance = null;
        this.holdTimeout = 0;
    }
    startAnimation() {
        this.previous = performance.now();
        this.onWindowResize();
        this.request = window.requestAnimationFrame(this.onAnimationFrame);
        window.addEventListener('resize', this.onWindowResize);
        window.addEventListener('keydown', this.onWindowKeyDown);
        this.element.addEventListener('pointerdown', this.onCanvasPointerDown);
        this.element.addEventListener('pointermove', this.onCanvasPointerMove);
        this.element.addEventListener('pointerup', this.onCanvasPointerUp);
        this.element.addEventListener('pointercancel', this.onCanvasPointerUp);
        this.element.addEventListener('pointerleave', this.onCanvasPointerUp);
        this.element.addEventListener('pointerout', this.onCanvasPointerUp);
        this.element.addEventListener('wheel', this.onCanvasWheel);
        this.element.addEventListener('contextmenu', this.onCanvasContextMenu);
    }
    stopAnimation() {
        window.cancelAnimationFrame(this.request);
        window.removeEventListener('resize', this.onWindowResize);
        window.removeEventListener('keydown', this.onWindowKeyDown);
        this.element.removeEventListener('pointerdown', this.onCanvasPointerDown);
        this.element.removeEventListener('pointermove', this.onCanvasPointerMove);
        this.element.removeEventListener('pointerup', this.onCanvasPointerUp);
        this.element.removeEventListener('pointercancel', this.onCanvasPointerUp);
        this.element.removeEventListener('pointerleave', this.onCanvasPointerUp);
        this.element.removeEventListener('pointerout', this.onCanvasPointerUp);
        this.element.removeEventListener('wheel', this.onCanvasWheel);
        this.element.removeEventListener('contextmenu', this.onCanvasContextMenu);
    }
    onAnimationFrame(timestamp) {
        const elapsed = (timestamp - this.previous) * INV_S;
        this.root.updateBranch(this.previous, elapsed);
        this.previous = timestamp;
        this.root.renderAll();
        this.request = window.requestAnimationFrame(this.onAnimationFrame);
    }
    onWindowResize() {
        const size = new Vector2(this.element.clientWidth, this.element.clientHeight);
        const offset = size.clone().multiply(0.5);
        this.element.width = size.x * this.root.pixels.x;
        this.element.height = size.y * this.root.pixels.y;
        this.root.resizeBranch(offset, size);
    }
    onWindowKeyDown(event) {
        if (event.key == this.fskey) {
            //event.preventDefault()
            if (document.fullscreenElement)
                document.exitFullscreen();
            else
                this.element.requestFullscreen();
        }
    }
    onCanvasPointerDown(event) {
        event.preventDefault();
        const position1 = this.getPosition1(event);
        this.pointerPositions.set(event.pointerId, position1);
        switch (this.pointerPositions.size) {
            case 1:
                {
                    this.pointerOrigin = position1;
                    if (Date.now() - this.pointerTime < this.double) {
                        this.doubleCount++;
                        if (this.doubleCount == 1) {
                            this.onDouble(this.pointerOrigin);
                            this.pointerTime = 0;
                        }
                    }
                    else {
                        this.pointerTime = Date.now();
                        this.doubleCount = 0;
                        this.onDown(this.pointerOrigin);
                    }
                }
                break;
            case 2:
                {
                    const position2 = this.getPosition2();
                    this.pointerOrigin = position2;
                }
                break;
        }
    }
    onCanvasPointerMove(event) {
        event.preventDefault();
        const position1 = this.getPosition1(event);
        this.pointerPositions.set(event.pointerId, position1);
        switch (this.pointerPositions.size) {
            case 1:
                {
                    if (this.pointerOrigin) {
                        this.pointerDelta = position1.subtract(this.pointerOrigin);
                        this.onDrag(this.pointerOrigin, this.pointerDelta);
                    }
                    else {
                        this.onMove(position1);
                    }
                }
                break;
            case 2:
                {
                    const delta = this.getDelta();
                    const position2 = this.getPosition2(delta);
                    if (this.pointerOrigin) {
                        this.pointerDelta = position2.subtract(this.pointerOrigin);
                        this.onDrag(this.pointerOrigin, this.pointerDelta);
                    }
                    else {
                        this.onMove(position2);
                    }
                    const distance = delta.magnitude();
                    if (this.previousDistance) {
                        const level = distance - this.previousDistance;
                        this.onZoom(position2, level);
                    }
                    this.previousDistance = distance;
                }
                break;
        }
    }
    onCanvasPointerUp(event) {
        event.preventDefault();
        if (this.pointerOrigin) {
            this.onUp(this.pointerDelta);
            this.pointerOrigin = null;
            this.pointerDelta = Vector2.zero();
        }
        this.pointerPositions.delete(event.pointerId);
        if (this.pointerPositions.size == 0)
            this.previousDistance = null;
    }
    onCanvasWheel(event) {
        event.preventDefault();
        const position = this.getPosition1(event);
        const distance = 0.1 * event.deltaY;
        this.onZoom(position, -distance);
    }
    onCanvasContextMenu(event) {
        event.preventDefault();
    }
    onDown(position) {
        var _a, _b;
        const transform = this.root.containsBranch(position);
        if (transform) {
            this.transformDown = transform;
            (_b = (_a = this.transformDown).onDown) === null || _b === void 0 ? void 0 : _b.call(_a, this.transformDown);
            this.holdTimeout = setTimeout(this.onHold, this.hold);
        }
    }
    onDouble(position) {
        var _a, _b;
        const transform = this.root.containsBranch(position);
        if (transform) {
            this.transformDown = transform;
            (_b = (_a = this.transformDown).onDouble) === null || _b === void 0 ? void 0 : _b.call(_a, this.transformDown);
        }
    }
    onHold() {
        var _a, _b;
        this.holdTimeout = 0;
        (_b = (_a = this.transformDown) === null || _a === void 0 ? void 0 : _a.onHold) === null || _b === void 0 ? void 0 : _b.call(_a, this.transformDown);
        this.transformDown = undefined;
    }
    onUp(delta) {
        var _a, _b, _c, _d;
        if (this.holdTimeout) {
            clearTimeout(this.holdTimeout);
            this.holdTimeout = 0;
        }
        const distance2 = delta.magnitude2();
        if (distance2 > this.drag2)
            (_b = (_a = this.transformDown) === null || _a === void 0 ? void 0 : _a.onDrop) === null || _b === void 0 ? void 0 : _b.call(_a, this.transformDown, this.transformOver);
        else
            (_d = (_c = this.transformDown) === null || _c === void 0 ? void 0 : _c.onUp) === null || _d === void 0 ? void 0 : _d.call(_c, this.transformDown);
        this.transformDown = undefined;
        this.transformOver = undefined;
    }
    onMove(position) {
        var _a, _b, _c, _d;
        const transform = this.root.containsBranch(position);
        if (transform != this.transformOver) {
            (_b = (_a = this.transformOver) === null || _a === void 0 ? void 0 : _a.onExit) === null || _b === void 0 ? void 0 : _b.call(_a, this.transformOver);
            this.transformOver = transform;
            (_d = (_c = this.transformOver) === null || _c === void 0 ? void 0 : _c.onEnter) === null || _d === void 0 ? void 0 : _d.call(_c, this.transformOver);
        }
    }
    onDrag(position, delta) {
        var _a, _b;
        if (this.holdTimeout) {
            const distance2 = delta.magnitude2();
            if (distance2 > this.drag2) {
                clearTimeout(this.holdTimeout);
                this.holdTimeout = 0;
            }
        }
        const transform = this.root.containsBranch(position.clone().add(delta));
        if (transform != this.transformOver) {
            this.transformOver = transform;
        }
        (_b = (_a = this.transformDown) === null || _a === void 0 ? void 0 : _a.onDrag) === null || _b === void 0 ? void 0 : _b.call(_a, this.transformDown, this.transformOver);
    }
    onZoom(position, distance) {
        //console.warn('zoom')
    }
    getPosition1(event) {
        const rect = this.element.getBoundingClientRect();
        return new Vector2(event.clientX - rect.left, event.clientY - rect.top).subtract(this.root.originOffset());
    }
    getPosition2(delta) {
        if (delta == undefined) {
            const positions = this.pointerPositions.values();
            const position1 = positions.next().value;
            const position2 = positions.next().value;
            const delta = position1.clone().subtract(position2);
            return position2.clone().add(delta.clone().multiply(0.5));
        }
        else {
            const positions = this.pointerPositions.values();
            positions.next();
            const position2 = positions.next().value;
            return position2.clone().add(delta.clone().multiply(0.5));
        }
    }
    getDelta() {
        const positions = this.pointerPositions.values();
        const position1 = positions.next().value;
        const position2 = positions.next().value;
        return position1.clone().subtract(position2);
    }
}
class Circle extends Transform {
    constructor(spec) {
        var _a, _b;
        super(spec);
        this.origin = (spec === null || spec === void 0 ? void 0 : spec.origin) != undefined ? new Vector2(spec.origin) : Vector2.half();
        this.radius = (_a = spec === null || spec === void 0 ? void 0 : spec.radius) !== null && _a !== void 0 ? _a : 1;
        this.style = (_b = spec === null || spec === void 0 ? void 0 : spec.style) !== null && _b !== void 0 ? _b : 'white';
        this.path = new Path2D();
        this.path.arc(this.radius * (1 - 2 * this.origin.x), this.radius * (1 - 2 * this.origin.y), this.radius, 0, TWO_PI);
    }
    renderSelf(root) {
        this.context.fillStyle = this.style;
        this.context.fill(this.path);
    }
    containsSelf(position) {
        return this.context.isPointInPath(this.path, position.x, position.y) ? this : undefined;
    }
}
class Color extends Layout {
    constructor(spec) {
        var _a;
        super(spec);
        this.style = (_a = spec === null || spec === void 0 ? void 0 : spec.style) !== null && _a !== void 0 ? _a : 'white';
        this.path = new Path2D();
    }
    resizeSelf(offset, size) {
        super.resizeSelf(offset, size);
        this.path = new Path2D();
        this.path.rect(this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y);
    }
    renderSelf(root) {
        this.context.fillStyle = this.style;
        this.context.fill(this.path);
    }
}
class Console extends Layout {
    constructor(params) {
        var _a;
        super(Object.assign(Object.assign({}, params), { origin: 0 }));
        this.styles = (_a = params === null || params === void 0 ? void 0 : params.styles) !== null && _a !== void 0 ? _a : ['white', 'orange'];
        this.lines = new Text({ depth: params === null || params === void 0 ? void 0 : params.depth, align: 'left', baseline: 'top', reverse: true });
        this.add(this.lines);
    }
    resizeSelf(offset, size) {
        super.resizeSelf(offset, size);
        this.removeOverflow();
    }
    info(...line) {
        this.logLine(this.styles[0], ...line);
    }
    warn(...line) {
        this.logLine(this.styles[1], ...line);
    }
    logLine(style, ...line) {
        this.lines.addLine(line.map(v => JSON.stringify(v)).join('  '), style);
        if (this.parent)
            this.removeOverflow();
    }
    removeOverflow() {
        for (let height = this.lines.getHeight(); height > this.size.y; height -= this.lines.height)
            this.lines.removeLine();
    }
}
class Entity extends Transform {
    constructor(spec) {
        super(spec);
        this.origin = (spec === null || spec === void 0 ? void 0 : spec.origin) != undefined ? new Vector2(spec.origin) : Vector2.half();
        this.size = (spec === null || spec === void 0 ? void 0 : spec.size) != undefined ? new Vector2(spec.size) : Vector2.one();
    }
}
class Grid extends Layout {
    constructor(params) {
        super(params);
        this.cells = (params === null || params === void 0 ? void 0 : params.cells) != undefined ? new Vector2(params.cells) : new Vector2(2);
    }
    add(child) {
        super.add(child);
        this.resizeChildren();
        return this;
    }
    remove(id) {
        super.remove(id);
        this.resizeChildren();
        return this;
    }
    resize(width, height) {
        this.cells = new Vector2(width, height);
        this.resizeChildren();
    }
    resizeChildren() {
        const size = this.size.clone().divide(this.cells);
        const offset = this.size.clone().multiply(-0.5).add(size.clone().multiply(0.5));
        const startx = offset.x;
        let cols = 0;
        for (const child of this) {
            if (child instanceof Layout)
                child.resizeBranch(offset, size);
            else
                child.position = offset;
            if (++cols >= this.cells.x) {
                offset.x = startx;
                offset.y += size.y;
                cols = 0;
            }
            else
                offset.x += size.x;
        }
    }
}
class Image extends Entity {
    constructor(spec) {
        var _a;
        super(spec);
        this.image = document.createElement('img');
        if (spec === null || spec === void 0 ? void 0 : spec.src) {
            //this.image.addEventListener('load', this.onLoadImage.bind(this), false)
            this.image.src = spec.src;
        }
        this.alpha = (_a = spec === null || spec === void 0 ? void 0 : spec.alpha) !== null && _a !== void 0 ? _a : 1;
    }
    renderSelf(root) {
        if (this.image.complete) {
            this.context.globalAlpha = this.alpha;
            this.context.drawImage(this.image, this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y);
        }
    }
    containsSelf(position) {
        const topLeft = this.size.clone().multiply(this.origin.clone().negate());
        const bottomRight = this.size.clone().multiply(Vector2.one().subtract(this.origin));
        return position.x > topLeft.x && position.y > topLeft.y && position.x < bottomRight.x && position.y < bottomRight.y ? this : undefined;
    }
    setSource(src) {
        this.image.src = src !== null && src !== void 0 ? src : '';
    }
    setAlpha(alpha) {
        this.alpha = alpha;
    }
}
class List extends Layout {
    constructor(spec) {
        var _a;
        super(spec);
        this.vertical = (_a = spec === null || spec === void 0 ? void 0 : spec.vertical) !== null && _a !== void 0 ? _a : false;
        this.sizes = [Vector2.zero(), Vector2.zero(), Vector2.zero()];
    }
    add(child) {
        super.add(child);
        this.addModeSize(child);
        this.resizeChildren();
        return this;
    }
    remove(id) {
        const child = super.remove(id);
        this.removeModeSize(child);
        this.resizeChildren();
        return this;
    }
    resizeChildren() {
        if (this.vertical) {
            const offset = this.size.clone().multiply([0.5 - this.origin.x, -0.5]);
            for (const child of this) {
                if (child instanceof Layout) {
                    const [my, sy] = child.mode[1];
                    const size = new Vector2();
                    const free = this.size.y - this.sizes[LayoutMode.Absolute].y;
                    const left = free - this.sizes[LayoutMode.Relative].y * free;
                    switch (my) {
                        case LayoutMode.Absolute:
                            size.y = sy;
                            break;
                        case LayoutMode.Relative:
                            size.y = sy * free;
                            break;
                        case LayoutMode.Weighted:
                            size.y = sy / this.sizes[LayoutMode.Weighted].y * left;
                    }
                    size.x = this.size.x;
                    offset.y += size.y * 0.5;
                    child.resizeBranch(offset, size);
                    offset.y += size.y * 0.5;
                }
            }
        }
        else {
            const offset = this.size.clone().multiply([-0.5, 0.5 - this.origin.y]);
            for (const child of this) {
                if (child instanceof Layout) {
                    const [mx, sx] = child.mode[0];
                    const size = new Vector2();
                    const free = this.size.x - this.sizes[LayoutMode.Absolute].x;
                    const left = free - this.sizes[LayoutMode.Relative].x * free;
                    switch (mx) {
                        case LayoutMode.Absolute:
                            size.x = sx;
                            break;
                        case LayoutMode.Relative:
                            size.x = sx * free;
                            break;
                        case LayoutMode.Weighted:
                            size.x = sx / this.sizes[LayoutMode.Weighted].x * left;
                    }
                    size.y = this.size.y;
                    offset.x += size.x * 0.5;
                    child.resizeBranch(offset, size);
                    offset.x += size.x * 0.5;
                }
            }
        }
    }
    addModeSize(child) {
        if (child instanceof Layout) {
            const [[mx, sx], [my, sy]] = child.mode;
            this.sizes[mx].x += sx;
            this.sizes[my].y += sy;
        }
    }
    removeModeSize(child) {
        if (child instanceof Layout) {
            const [[mx, sx], [my, sy]] = child.mode;
            this.sizes[mx].x -= sx;
            this.sizes[my].y -= sy;
        }
    }
}
class Margin {
    constructor(params) {
        var _a, _b, _c, _d;
        if (params instanceof Array) {
            this.leftTop = new Vector2(params[0], params[1]);
            this.rightBottom = new Vector2(params[2], params[3]);
        }
        else if (typeof params != 'number') {
            this.leftTop = new Vector2((_a = params === null || params === void 0 ? void 0 : params.left) !== null && _a !== void 0 ? _a : 0, (_b = params === null || params === void 0 ? void 0 : params.top) !== null && _b !== void 0 ? _b : 0);
            this.rightBottom = new Vector2((_c = params === null || params === void 0 ? void 0 : params.right) !== null && _c !== void 0 ? _c : 0, (_d = params === null || params === void 0 ? void 0 : params.bottom) !== null && _d !== void 0 ? _d : 0);
        }
        else {
            this.leftTop = new Vector2(params, params);
            this.rightBottom = new Vector2(params, params);
        }
    }
    static zero() {
        return new Margin(0);
    }
    static from(other) {
        return new Margin([other.leftTop.x, other.leftTop.y, other.rightBottom.x, other.rightBottom.y]);
    }
}
class Rect extends Entity {
    constructor(spec) {
        var _a;
        super(spec);
        this.style = (_a = spec === null || spec === void 0 ? void 0 : spec.style) !== null && _a !== void 0 ? _a : 'white';
        this.path = new Path2D();
        this.path.rect(this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y);
    }
    renderSelf(root) {
        this.context.fillStyle = this.style;
        this.context.fill(this.path);
    }
    containsSelf(position) {
        return this.context.isPointInPath(this.path, position.x, position.y) ? this : undefined;
    }
}
class Root extends Layout {
    constructor(spec) {
        var _a;
        super(spec);
        this.context = spec.context;
        this.pixels = (spec === null || spec === void 0 ? void 0 : spec.pixels) != undefined ? new Vector2(spec.pixels) : new Vector2(window.devicePixelRatio, window.devicePixelRatio);
        this.showFPS = (_a = spec === null || spec === void 0 ? void 0 : spec.showFPS) !== null && _a !== void 0 ? _a : false;
        this.fps = 0;
    }
    updateBranch(previous, elapsed, root) {
        this.fps = Math.round(1 / elapsed);
        return super.updateBranch(previous, elapsed, root);
    }
    renderAll(root) {
        root !== null && root !== void 0 ? root : (root = this);
        this.context.save();
        this.context.scale(this.pixels.x, this.pixels.y);
        this.context.clearRect(0, 0, this.size.x * this.scale.x, this.size.y * this.scale.y);
        this.context.save();
        this.transform(root);
        for (const depth of this.layers.keys()) {
            this.renderLayer(depth, root);
        }
        this.context.restore();
        if (this.showFPS) {
            this.context.fillStyle = 'orange';
            this.context.font = 'sans-serif';
            this.context.textAlign = 'left';
            this.context.textBaseline = 'top';
            this.context.fillText(this.fps.toString(), 0, 0);
        }
        this.context.restore();
    }
}
class Text extends Transform {
    constructor(params) {
        var _a, _b, _c, _d, _e, _f, _g;
        super(params);
        this.font = (_a = params === null || params === void 0 ? void 0 : params.font) !== null && _a !== void 0 ? _a : 'sans-serif';
        this.style = (_b = params === null || params === void 0 ? void 0 : params.style) !== null && _b !== void 0 ? _b : 'white';
        this.align = (_c = params === null || params === void 0 ? void 0 : params.align) !== null && _c !== void 0 ? _c : 'center';
        this.baseline = (_d = params === null || params === void 0 ? void 0 : params.baseline) !== null && _d !== void 0 ? _d : 'middle';
        this.lines = (_e = params === null || params === void 0 ? void 0 : params.lines) !== null && _e !== void 0 ? _e : [];
        this.offset = (params === null || params === void 0 ? void 0 : params.offset) != undefined ? new Vector2(params.offset) : Vector2.zero();
        this.height = (_f = params === null || params === void 0 ? void 0 : params.height) !== null && _f !== void 0 ? _f : 16;
        this.reverse = (_g = params === null || params === void 0 ? void 0 : params.reverse) !== null && _g !== void 0 ? _g : false;
    }
    renderSelf(root) {
        this.context.font = this.font;
        this.context.textAlign = this.align;
        this.context.textBaseline = this.baseline;
        for (const [line, style] of this.lines.values()) {
            this.context.fillStyle = style !== null && style !== void 0 ? style : this.style;
            this.context.fillText(line, this.offset.x, this.offset.y);
            this.context.translate(0, this.height);
        }
    }
    getHeight() {
        return this.lines.length * this.height;
    }
    setLine(line, style) {
        this.lines = [[line, style]];
    }
    removeLine() {
        if (this.reverse) {
            this.lines.pop();
        }
        else {
            this.lines.shift();
        }
    }
    addLine(line, style) {
        if (this.reverse) {
            this.lines.unshift([line, style]);
        }
        else {
            this.lines.push([line, style]);
        }
    }
}
class Texture extends Layout {
    constructor(params) {
        var _a;
        super(params);
        this.image = document.createElement('img');
        this.image.src = params.src;
        this.alpha = (_a = params.alpha) !== null && _a !== void 0 ? _a : 1;
    }
    renderSelf(root) {
        if (this.image.complete) {
            this.context.globalAlpha = this.alpha;
            this.context.drawImage(this.image, this.size.x * -this.origin.x, this.size.y * -this.origin.y, this.size.x, this.size.y);
        }
    }
}
class Timer extends Text {
    constructor(params) {
        super(params);
        this.time = (params === null || params === void 0 ? void 0 : params.time) ? params.time < 0 ? 0 : params.time / 1000 : 0;
        this.lines = [[Math.ceil(this.time).toString(), undefined]];
        this.hideOnZero = (params === null || params === void 0 ? void 0 : params.hideOnZero) || undefined;
        this.resolveStart = null;
        this.rejectStart = null;
    }
    updateSelf(previous, elapsed, root) {
        if (this.isRunning) {
            this.time -= elapsed;
            if (this.time <= 0) {
                this.resetTime();
                if (this.resolveStart) {
                    this.resolveStart();
                    this.resolveStart = null;
                    this.rejectStart = null;
                }
            }
            else
                this.lines = [[Math.ceil(this.time).toString(), undefined]];
        }
        return false;
    }
    start(time) {
        if (time != undefined) {
            this.time = time < 0 ? 0 : time / 1000;
        }
        this.isRunning = true;
        return new Promise((resolve, reject) => { this.resolveStart = resolve; this.rejectStart = reject; });
    }
    stop() {
        this.resetTime();
        if (this.rejectStart) {
            this.rejectStart();
            this.rejectStart = null;
            this.resolveStart = null;
        }
    }
    resetTime() {
        this.time = 0;
        this.lines = [['0', undefined]];
        this.isRunning = undefined;
        this.hideOnZero && this.hideSelf();
    }
}
class Vector3 {
    constructor(x, y, z) {
        if (x == undefined) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        else if (typeof (x) == 'number') {
            this.x = x;
            this.y = y !== null && y !== void 0 ? y : this.x;
            this.z = z !== null && z !== void 0 ? z : this.y;
        }
        else if (x instanceof Array) {
            this.x = x[0];
            this.y = x[1];
            this.z = x[2];
        }
        else {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        }
    }
    static zero() {
        return new Vector3();
    }
    static half() {
        return new Vector3(0.5);
    }
    static one() {
        return new Vector3(1);
    }
    clone() {
        return new Vector3(this);
    }
    isZero() {
        return this.x === 0 && this.y === 0 && this.z === 0;
    }
    add(v) {
        if (typeof (v) == 'number') {
            this.x += v;
            this.y += v;
            this.z += v;
        }
        else if (v instanceof Array) {
            this.x += v[0];
            this.y += v[1];
            this.z += v[2];
        }
        else {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
        }
        return this;
    }
    subtract(v) {
        if (typeof (v) == 'number') {
            this.x -= v;
            this.y -= v;
            this.z -= v;
        }
        else if (v instanceof Array) {
            this.x -= v[0];
            this.y -= v[1];
            this.z -= v[2];
        }
        else {
            this.x -= v.x;
            this.y -= v.y;
            this.z -= v.z;
        }
        return this;
    }
    multiply(v) {
        if (typeof (v) == 'number') {
            this.x *= v;
            this.y *= v;
            this.z *= v;
        }
        else if (v instanceof Array) {
            this.x *= v[0];
            this.y *= v[1];
            this.z *= v[2];
        }
        else {
            this.x *= v.x;
            this.y *= v.y;
            this.z *= v.z;
        }
        return this;
    }
    divide(v) {
        if (typeof (v) == 'number') {
            this.x /= v;
            this.y /= v;
            this.z /= v;
        }
        else if (v instanceof Array) {
            this.x /= v[0];
            this.y /= v[1];
            this.z /= v[2];
        }
        else {
            this.x /= v.x;
            this.y /= v.y;
            this.z /= v.z;
        }
        return this;
    }
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }
    invert() {
        this.x = 1 / this.x;
        this.y = 1 / this.y;
        this.z = 1 / this.z;
        return this;
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    magnitude2() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    normalize() {
        return this.divide(this.magnitude());
    }
    dot(v) {
        if (typeof (v) == 'number') {
            return this.x * v + this.y * v + this.z * v;
        }
        else if (v instanceof Array) {
            return this.x * v[0] + this.y * v[1] + this.z * v[2];
        }
        else {
            return this.x * v.x + this.y * v.y + this.z + v.z;
        }
    }
}
class Vector4 {
    constructor(x, y, z, w) {
        if (x == undefined) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 0;
        }
        else if (typeof (x) == 'number') {
            this.x = x;
            this.y = y !== null && y !== void 0 ? y : this.x;
            this.z = z !== null && z !== void 0 ? z : this.y;
            this.w = w !== null && w !== void 0 ? w : this.z;
        }
        else if (x instanceof Array) {
            this.x = x[0];
            this.y = x[1];
            this.z = x[2];
            this.w = x[3];
        }
        else {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
            this.w = x.w;
        }
    }
    static zero() {
        return new Vector4();
    }
    static half() {
        return new Vector4(0.5);
    }
    static one() {
        return new Vector4(1);
    }
    clone() {
        return new Vector4(this);
    }
    isZero() {
        return this.x === 0 && this.y === 0 && this.z === 0 && this.w === 0;
    }
    xy() {
        return new Vector2(this.x, this.y);
    }
    zw() {
        return new Vector2(this.z, this.w);
    }
    add(v) {
        if (typeof (v) == 'number') {
            this.x += v;
            this.y += v;
            this.z += v;
            this.w += v;
        }
        else if (v instanceof Array) {
            this.x += v[0];
            this.y += v[1];
            this.z += v[2];
            this.w += v[3];
        }
        else {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
            this.w += v.w;
        }
        return this;
    }
    subtract(v) {
        if (typeof (v) == 'number') {
            this.x -= v;
            this.y -= v;
            this.z -= v;
            this.w -= v;
        }
        else if (v instanceof Array) {
            this.x -= v[0];
            this.y -= v[1];
            this.z -= v[2];
            this.w -= v[3];
        }
        else {
            this.x -= v.x;
            this.y -= v.y;
            this.z -= v.z;
            this.w -= v.w;
        }
        return this;
    }
    multiply(v) {
        if (typeof (v) == 'number') {
            this.x *= v;
            this.y *= v;
            this.z *= v;
            this.w *= v;
        }
        else if (v instanceof Array) {
            this.x *= v[0];
            this.y *= v[1];
            this.z *= v[2];
            this.w *= v[3];
        }
        else {
            this.x *= v.x;
            this.y *= v.y;
            this.z *= v.z;
            this.w *= v.w;
        }
        return this;
    }
    divide(v) {
        if (typeof (v) == 'number') {
            this.x /= v;
            this.y /= v;
            this.z /= v;
            this.w /= v;
        }
        else if (v instanceof Array) {
            this.x /= v[0];
            this.y /= v[1];
            this.z /= v[2];
            this.w /= v[3];
        }
        else {
            this.x /= v.x;
            this.y /= v.y;
            this.z /= v.z;
            this.w /= v.w;
        }
        return this;
    }
    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
        return this;
    }
    invert() {
        this.x = 1 / this.x;
        this.y = 1 / this.y;
        this.z = 1 / this.z;
        this.w = 1 / this.w;
        return this;
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }
    magnitude2() {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }
    normalize() {
        return this.divide(this.magnitude());
    }
    dot(v) {
        if (typeof (v) == 'number') {
            return this.x * v + this.y * v + this.z * v + this.w * v;
        }
        else if (v instanceof Array) {
            return this.x * v[0] + this.y * v[1] + this.z * v[2] + this.w * v[3];
        }
        else {
            return this.x * v.x + this.y * v.y + this.z + v.z + this.w * v.w;
        }
    }
}
export { Canvas, Circle, Color, Console, Entity, Grid, Image, Layout, LayoutMode, List, Margin, Rect, Root, Text, Texture, Timer, Transform, Vector2, Vector3, Vector4 };
