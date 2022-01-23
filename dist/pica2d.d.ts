declare type Vector2Types = Vector2 | [number, number] | number;
declare type Vector3Types = Vector3 | [number, number, number] | number;
declare type Vector4Types = Vector4 | [number, number, number, number] | number;
declare type MarginTuple = [number, number, number, number];
declare type MarginTypes = MarginParams | MarginTuple | number;
interface TransformParams {
    readonly id?: number;
    readonly position?: Vector2Types;
    readonly rotation?: number;
    readonly rotationIsAbsolute?: boolean;
    readonly scale?: Vector2Types;
    readonly scaleIsAbsolute?: boolean;
    readonly depth?: number;
    readonly flip?: {
        x: boolean;
        y: boolean;
    };
    readonly hide?: boolean;
    readonly hideSelf?: boolean;
    readonly hideChildren?: boolean;
    readonly events?: boolean;
    readonly onDown?: (transform: Transform) => void;
    readonly onDouble?: (transform: Transform) => void;
    readonly onHold?: (transform: Transform) => void;
    readonly onUp?: (transform: Transform) => void;
    readonly onEnter?: (transform: Transform) => void;
    readonly onExit?: (transform: Transform) => void;
    readonly onDrag?: (transform: Transform, target?: Transform) => void;
    readonly onDrop?: (transform: Transform, target?: Transform) => void;
}
declare class Transform {
    id: number;
    position: Vector2;
    rotation: number;
    rotationIsAbsolute?: true;
    scale: Vector2;
    scaleIsAbsolute?: true;
    flip: Vector2;
    visibleSelf: boolean;
    visibleChildren: boolean;
    handleEvents?: true;
    onDown?: (transform: Transform) => void;
    onDouble?: (transform: Transform) => void;
    onHold?: (transform: Transform) => void;
    onUp?: (transform: Transform) => void;
    onEnter?: (transform: Transform) => void;
    onExit?: (transform: Transform) => void;
    onDrag?: (transform: Transform, target?: Transform) => void;
    onDrop?: (transform: Transform, target?: Transform) => void;
    protected depth: number;
    protected parent: Transform | null;
    protected children: Map<number, Transform>;
    protected layers: Map<number, Map<number, Transform>>;
    protected context: CanvasRenderingContext2D;
    protected static nullID: number;
    constructor(spec?: TransformParams);
    [Symbol.iterator](): IterableIterator<Transform>;
    add(child: Transform): Transform;
    remove(id: number): Transform;
    childCount(): number;
    rotatePosition(position: Vector2, rotation: number): void;
    sort<T extends Transform = Transform>(func: (a: T, b: T) => number): void;
    removeAll(): Transform;
    get<T extends Transform = Transform>(id: number): T | undefined;
    first<T extends Transform = Transform>(): T | undefined;
    pop<T extends Transform = Transform>(): T | undefined;
    has(id: number): boolean;
    updateSelf(previous: DOMHighResTimeStamp, elapsed: number, root: Transform): boolean;
    updateBranch(previous: DOMHighResTimeStamp, elapsed: number, root?: Transform): boolean;
    renderSelf(root: Transform): void;
    renderBranch(depth: number, root?: Transform): void;
    renderAll(root?: Transform): void;
    renderLayer(depth: number, root: Transform): void;
    getMatrix(absolute?: boolean, root?: Transform): DOMMatrix;
    containsSelf(position: Vector2): Transform | undefined;
    containsBranch(position: Vector2): Transform | undefined;
    find(callback: (transform: Transform) => boolean): Transform | undefined;
    each(callback: (transform: Transform) => void): void;
    filter(callback: (transform: Transform) => boolean): Transform[];
    show(): void;
    hide(): void;
    toggle(): void;
    showSelf(): void;
    hideSelf(): void;
    toggleSelf(): void;
    showChildren(): void;
    hideChildren(): void;
    toggleChildren(): void;
    getParent<T extends Transform = Transform>(depth: number): T | null;
    protected attach(child: Transform): void;
    protected detach(child: Transform): void;
    protected transform(root: Transform): void;
    protected setContext(context: CanvasRenderingContext2D): void;
    protected addLayer(depth: number, child: Transform): void;
    protected removeLayer(depth: number, id: number): void;
}
declare enum LayoutMode {
    Absolute = 0,
    Relative = 1,
    Weighted = 2
}
interface LayoutParams extends Omit<TransformParams, 'position'> {
    readonly mode?: [[LayoutMode, number], [LayoutMode, number]];
    readonly origin?: Vector2Types;
    readonly margin?: MarginTypes;
    readonly aspect?: Vector2Types;
}
declare class Layout extends Transform {
    readonly mode: [[LayoutMode, number], [LayoutMode, number]];
    protected origin: Vector2;
    protected margin: Margin;
    protected aspect?: Vector2;
    protected size: Vector2;
    constructor(params?: LayoutParams);
    resizeSelf(offset: Vector2, size: Vector2): void;
    resizeChildren(): void;
    resizeBranch(offset: Vector2, size: Vector2): void;
    containsSelf(position: Vector2): Transform | undefined;
    originOffset(): Vector2;
}
declare class Vector2 {
    x: number;
    y: number;
    constructor(x?: Vector2Types, y?: number);
    static zero(): Vector2;
    static half(): Vector2;
    static one(): Vector2;
    static angle(a: number): Vector2;
    clone(): Vector2;
    isZero(): boolean;
    add(v: Vector2Types): Vector2;
    subtract(v: Vector2Types): Vector2;
    multiply(v: Vector2Types): Vector2;
    divide(v: Vector2Types): Vector2;
    negate(): Vector2;
    invert(): Vector2;
    magnitude(): number;
    magnitude2(): number;
    normalize(): Vector2;
    dot(v: Vector2Types): number;
    rotate(a: number): Vector2;
    angle(): number;
    transform(matrix: DOMMatrix): Vector2;
}
interface CanvasParams extends RootParams {
    readonly fskey?: string;
    readonly double?: number;
    readonly hold?: number;
    readonly drag?: number;
}
declare abstract class Canvas {
    readonly fskey?: string;
    readonly double: number;
    readonly hold: number;
    readonly drag2: number;
    protected element: HTMLCanvasElement;
    protected root: Root;
    private request;
    private previous;
    private pointerOrigin;
    private pointerDelta;
    private pointerTime;
    private pointerPositions;
    private previousDistance;
    private doubleCount;
    private transformDown;
    private transformOver;
    private holdTimeout;
    constructor(params: CanvasParams);
    startAnimation(): void;
    stopAnimation(): void;
    private onAnimationFrame;
    private onWindowResize;
    private onWindowKeyDown;
    private onCanvasPointerDown;
    private onCanvasPointerMove;
    private onCanvasPointerUp;
    private onCanvasWheel;
    private onCanvasContextMenu;
    private onDown;
    private onDouble;
    private onHold;
    private onUp;
    private onMove;
    private onDrag;
    private onZoom;
    private getPosition1;
    private getPosition2;
    private getDelta;
}
interface CircleParams extends TransformParams {
    readonly origin?: Vector2Types;
    readonly radius?: number;
    readonly style?: CanvasFillStyle;
}
declare class Circle extends Transform {
    readonly origin: Vector2;
    protected radius: number;
    protected style: CanvasFillStyle;
    protected path: Path2D;
    constructor(spec?: CircleParams);
    renderSelf(root: Transform): void;
    containsSelf(position: Vector2): Circle | undefined;
}
interface ColorParams extends LayoutParams {
    readonly style?: CanvasFillStyle;
}
declare class Color extends Layout {
    protected style: CanvasFillStyle;
    protected path: Path2D;
    constructor(spec?: ColorParams);
    resizeSelf(offset: Vector2, size: Vector2): void;
    renderSelf(root: Transform): void;
}
interface ConsoleParams extends LayoutParams {
    readonly styles?: [CanvasFillStyle, CanvasFillStyle];
}
declare class Console extends Layout {
    protected styles: [CanvasFillStyle, CanvasFillStyle];
    protected lines: Text;
    constructor(params?: ConsoleParams);
    resizeSelf(offset: Vector2, size: Vector2): void;
    info(...line: unknown[]): void;
    warn(...line: unknown[]): void;
    protected logLine(style: CanvasFillStyle, ...line: unknown[]): void;
    protected removeOverflow(): void;
}
interface EntityParams extends TransformParams {
    readonly origin?: Vector2Types;
    readonly size?: Vector2Types;
}
declare class Entity extends Transform {
    readonly origin: Vector2;
    readonly size: Vector2;
    constructor(spec?: EntityParams);
}
interface GridParams extends LayoutParams {
    readonly cells?: Vector2Types;
}
declare class Grid extends Layout {
    protected cells: Vector2;
    constructor(params?: GridParams);
    add(child: Transform): Transform;
    remove(id: number): Transform;
    resize(width: number, height: number): void;
    resizeChildren(): void;
}
interface ImageParams extends EntityParams {
    readonly src?: string;
    readonly alpha?: number;
}
declare class Image extends Entity {
    protected image: HTMLImageElement;
    protected alpha: number;
    constructor(spec?: ImageParams);
    renderSelf(root: Transform): void;
    containsSelf(position: Vector2): Transform | undefined;
    setSource(src?: string): void;
    setAlpha(alpha: number): void;
}
interface ListParams extends LayoutParams {
    readonly vertical?: boolean;
}
declare class List extends Layout {
    readonly vertical: boolean;
    protected sizes: [Vector2, Vector2, Vector2];
    constructor(spec?: ListParams);
    add(child: Transform): Transform;
    remove(id: number): Transform;
    resizeChildren(): void;
    private addModeSize;
    private removeModeSize;
}
interface MarginParams {
    readonly left?: number;
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
}
declare class Margin {
    readonly leftTop: Vector2;
    readonly rightBottom: Vector2;
    constructor(params?: MarginTypes);
    static zero(): Margin;
    static from(other: Margin): Margin;
}
interface RectParams extends EntityParams {
    readonly style?: CanvasFillStyle;
}
declare class Rect extends Entity {
    style: CanvasFillStyle;
    protected path: Path2D;
    constructor(spec?: RectParams);
    renderSelf(root: Transform): void;
    containsSelf(position: Vector2): Transform | undefined;
}
interface RootParams extends LayoutParams {
    readonly context: CanvasRenderingContext2D;
    readonly pixels?: Vector2Types;
    readonly style?: CanvasFillStyle;
    readonly font?: string;
    readonly showFPS?: boolean;
}
declare class Root extends Layout {
    readonly pixels: Vector2;
    protected showFPS: boolean;
    protected fps: number;
    constructor(spec: RootParams);
    updateBranch(previous: DOMHighResTimeStamp, elapsed: number, root?: Transform): boolean;
    renderAll(root?: Transform): void;
}
interface TextParams extends TransformParams {
    readonly font?: string;
    readonly style?: CanvasFillStyle;
    readonly align?: CanvasTextAlign;
    readonly baseline?: CanvasTextBaseline;
    readonly lines?: [string, CanvasFillStyle?][];
    readonly offset?: Vector2Types;
    readonly height?: number;
    readonly reverse?: boolean;
}
declare class Text extends Transform {
    readonly font: string;
    readonly style: CanvasFillStyle;
    readonly align: CanvasTextAlign;
    readonly baseline: CanvasTextBaseline;
    readonly offset: Vector2;
    readonly height: number;
    readonly reverse: boolean;
    protected lines: [string, CanvasFillStyle?][];
    constructor(params?: TextParams);
    renderSelf(root?: Transform): void;
    getHeight(): number;
    setLine(line: string, style?: CanvasFillStyle): void;
    removeLine(): void;
    addLine(line: string, style?: CanvasFillStyle): void;
}
interface TextureParams extends LayoutParams {
    readonly src: string;
    readonly alpha?: number;
}
declare class Texture extends Layout {
    protected alpha: number;
    protected image: HTMLImageElement;
    constructor(params: TextureParams);
    renderSelf(root: Transform): void;
}
interface TimerParams extends TextParams {
    readonly time?: number;
    readonly hideOnZero?: boolean;
}
declare class Timer extends Text {
    time: number;
    hideOnZero?: true;
    private isRunning?;
    private resolveStart;
    private rejectStart;
    constructor(params?: TimerParams);
    updateSelf(previous: DOMHighResTimeStamp, elapsed: number, root: Transform): boolean;
    start(time?: number): Promise<void>;
    stop(): void;
    private resetTime;
}
declare class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: Vector3Types, y?: number, z?: number);
    static zero(): Vector3;
    static half(): Vector3;
    static one(): Vector3;
    clone(): Vector3;
    isZero(): boolean;
    add(v: Vector3Types): Vector3;
    subtract(v: Vector3Types): Vector3;
    multiply(v: Vector3Types): Vector3;
    divide(v: Vector3Types): Vector3;
    negate(): Vector3;
    invert(): Vector3;
    magnitude(): number;
    magnitude2(): number;
    normalize(): Vector3;
    dot(v: Vector3Types): number;
}
declare class Vector4 {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: Vector4Types, y?: number, z?: number, w?: number);
    static zero(): Vector4;
    static half(): Vector4;
    static one(): Vector4;
    clone(): Vector4;
    isZero(): boolean;
    xy(): Vector2;
    zw(): Vector2;
    add(v: Vector4Types): Vector4;
    subtract(v: Vector4Types): Vector4;
    multiply(v: Vector4Types): Vector4;
    divide(v: Vector4Types): Vector4;
    negate(): Vector4;
    invert(): Vector4;
    magnitude(): number;
    magnitude2(): number;
    normalize(): Vector4;
    dot(v: Vector4Types): number;
}
export { Canvas, CanvasParams, Circle, CircleParams, Color, ColorParams, Console, ConsoleParams, Entity, EntityParams, Grid, GridParams, Image, ImageParams, Layout, LayoutParams, LayoutMode, List, ListParams, Margin, MarginTypes, Rect, RectParams, Root, RootParams, Text, TextParams, Texture, TextureParams, Timer, TimerParams, Transform, TransformParams, Vector2, Vector2Types, Vector3, Vector3Types, Vector4, Vector4Types };
