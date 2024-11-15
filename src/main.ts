import "./style.css";

//metadata
const APP_NAME = "Painote: Paint and Note Application";
const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

const buttonContainer = document.createElement("div");
buttonContainer.className = "button-container";

//page title
const title = document.createElement("h1");
title.innerHTML = "Painote: Paint and Note Application";
app.append(title);

//canvas
const canvas = document.createElement("canvas") as HTMLCanvasElement;
canvas.width = 512;
canvas.height = 256;
app.append(canvas);
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

//drawing
interface Command{
  display: (ctx: CanvasRenderingContext2D) => void;
}

interface MarkerLineCommand extends Command{
  drag: (x: number, y: number) => void;
  points: {x: number, y: number}[];
  penWidth: number;
  color: string;
}

interface CursorCommand extends Command{
  x: number,
  y: number,
  draw: (x: number, y: number) => void;
}

interface StickerCommand extends Command{
  emoji: string,
  x: number,
  y: number,
  rotation: number,
  setPosition: (x: number, y: number) => void;
}

const commands: Command[] = [];
const redoCommands: Command[] = [];

let penWidth = 1;
let cursorImage = "∙";
let cursorPosition = 8;

let currentLineCommand: MarkerLineCommand | null = null;
let cursorCommand: CursorCommand | null = null;
let stickerCommand: StickerCommand | null = null;

let currentMarkerColor = "#000000";
let shouldRedraw = true;

const colorPicker = document.createElement("input");
colorPicker.type = "color";
colorPicker.value = currentMarkerColor;
app.append(colorPicker);

colorPicker.addEventListener("input", (e) => {
  const target = e.target as HTMLInputElement | null;
  if(target){
    currentMarkerColor = target.value;
    shouldRedraw = true;
  }
});

const createMarkerLineCommand = (x: number, y: number): MarkerLineCommand => {
  const points: {x: number, y: number}[] = [{x, y}];

  return{
    points,
    penWidth,
    color: currentMarkerColor,

    display(ctx: CanvasRenderingContext2D): void{
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.penWidth;
      ctx?.beginPath();
      ctx?.moveTo(points[0].x, points[0].y);

      for(let i = 1; i < points.length; i++){
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    },

    drag: (x: number, y: number) => {
      points.push({x, y});
      shouldRedraw = true;
    },
  };
};

const createCursorCommand = (x: number, y: number): CursorCommand => {
  return{
    x,
    y,
    draw(x: number, y: number){
      this.x = x;
      this.y = y;
      shouldRedraw = true;
    },
    display(ctx: CanvasRenderingContext2D): void{
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((stickerRotation * Math.PI) / 180);
      ctx.font = "32px monospace";
      ctx.fillText(cursorImage, 0 - cursorPosition, cursorPosition);
      ctx.restore();
    },
    
  }
};

//rotationslider
const rotationSlider = document.createElement("input");
rotationSlider.type = "range";
rotationSlider.min = "0";
rotationSlider.max = "360";
rotationSlider.value = "0";
rotationSlider.style.margin = "10px";
app.append(rotationSlider);

let stickerRotation = 0;

rotationSlider.addEventListener("input", (e) => {
  const target = e.target as HTMLInputElement | null;
  if(target){
    stickerRotation = Number(target.value);
  }
});

const createStickerCommand = (emoji: string, x: number, y: number): StickerCommand => {
  return{
    emoji,
    x,
    y,
    rotation: stickerRotation,
    setPosition(x: number, y: number){
      this.x = x;
      this.y = y;
    },
    display(ctx: CanvasRenderingContext2D): void{
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.font = "32px monospace";
      ctx.fillText(this.emoji, 0, 0);
      ctx.restore();
    }
  }
};

const bus = new EventTarget();

function notify(name: string): void{
  shouldRedraw = true;
  console.log(shouldRedraw);
  bus.dispatchEvent(new Event(name));
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("tool-moved", redraw);

let isDragging = false;
let isMouseDown = false;
let currentSticker: StickerCommand | null = null;

canvas.addEventListener("mousedown", (e) => {
  isMouseDown = true;

  if(stickerCommand){
    const stickerWidth = 32;
    const stickerHeight = 32;

    if (e.offsetX >= stickerCommand.x && e.offsetX <= stickerCommand.x + stickerWidth &&
      e.offsetY >= stickerCommand.y && e.offsetY <= stickerCommand.y + stickerHeight) {
      isDragging = true;
      currentSticker = stickerCommand;
    } else {
      stickerCommand.setPosition(e.offsetX, e.offsetY);
      stickerCommand.rotation = stickerRotation;
      commands.push(stickerCommand);
      notify("drawing-changed");
    }
  }else{
    currentLineCommand = createMarkerLineCommand(e.offsetX, e.offsetY);
    commands.push(currentLineCommand);
    redoCommands.length = 0;
    notify("drawing-changed");
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isDragging && currentSticker) {
    currentSticker.setPosition(e.offsetX, e.offsetY);
    notify("drawing-changed");
  }
  if (e.buttons === 1 && currentLineCommand) {
    currentLineCommand.drag(e.offsetX, e.offsetY);
    notify("drawing-changed");
  }
  if (!cursorCommand) {
    cursorCommand = createCursorCommand(e.offsetX, e.offsetY);
  }else{
    cursorCommand?.draw(e.offsetX, e.offsetY);
    notify("tool-moved");
  }
  
});

canvas.addEventListener("mouseout", (e) => {
  if(isDragging && stickerCommand){
    stickerCommand.setPosition(e.offsetX, e.offsetY);
    notify("tool-moved");
  }

  cursorCommand = null;
  notify("tool-moved");
});

canvas.addEventListener("mouseenter", (e) => {
  cursorCommand = createCursorCommand(e.offsetX, e.offsetY);
  notify("tool-moved");
})

canvas.addEventListener("mouseup", () => {
  isMouseDown = false;
  isDragging = false;
  currentLineCommand = null;
  currentSticker = null;
  notify("drawing-changed");
});

function redraw(): void{
  if (!shouldRedraw) return;
  shouldRedraw = false;

  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  commands.forEach((cmd) => cmd.display(ctx));

  if(cursorCommand && !isMouseDown){
    cursorCommand.display(ctx);
  }
  if(stickerCommand){
    stickerCommand.display(ctx);
  }
}

document.body.append(document.createElement("br"));
//buttons
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
app.append(clearButton);

clearButton.addEventListener("click", () => {
  commands.length = 0;
  notify("drawing-changed");
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
app.append(undoButton);

undoButton.addEventListener("click", () => {
  if(commands.length > 0){
    redoCommands.push(commands.pop()!);
    notify("drawing-changed");
  }
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
app.append(redoButton);

redoButton.addEventListener("click", () => {
  if(redoCommands.length > 0){
    commands.push(redoCommands.pop()!);
    notify("drawing-changed");
  }
});

//making sticker buttons
const emojis = ["🐀", "😈", "👾"];
const emojiButtons: string[] = [...emojis];
const createStickerButton = (emoji: string) => {
  const button = document.createElement("button");
  button.innerHTML = emoji;
  button.addEventListener("click", () => {
    stickerCommand = createStickerCommand(emoji, cursorCommand?.x || -10, cursorCommand?.y || -10);
    selectedTool.innerHTML = `Selected Tool: ${emoji}`;
    cursorImage = emoji;
    cursorPosition = 0;
    notify("tool-moved");
  });
  return button;
};

//pens
const thinPenButton = document.createElement("button");
thinPenButton.innerHTML = "Thin Pen";
thinPenButton.classList.add("active");
app.append(thinPenButton);

thinPenButton.addEventListener("click", () => {
  penWidth = 1;
  thinPenButton.classList.add("active");
  thickPenButton.classList.remove("active");
  selectedTool.innerHTML = "Selected Tool: Thin Pen";
  cursorPosition = 8;
  cursorImage = "∙";
  stickerCommand = null;
});

const thickPenButton = document.createElement("button");
thickPenButton.innerHTML = "Thick Pen";
//thickPenButton.classList.add("active");
app.append(thickPenButton);

thickPenButton.addEventListener("click", () => {
  penWidth = 4;
  thickPenButton.classList.add("active");
  thinPenButton.classList.remove("active");
  selectedTool.innerHTML = "Selected Tool: Thick Pen";
  cursorPosition = 8;
  cursorImage = "•";
  stickerCommand = null;
});

//custom sticker
const customStickerButton = document.createElement("button");
customStickerButton.innerHTML = "Custom Sticker";

customStickerButton.addEventListener("click", () => {
  const customEmoji = prompt("Enter a custom emoji or symbol:");
  if(customEmoji){
    emojis.push(customEmoji);
    const customStickerBTN = createStickerButton(customEmoji);
    buttonContainer.append(customStickerBTN);
  }
});

//reformatting canvas and buttons
const container = document.createElement("div");
container.className = "canvas-container";
app.append(container);

container.append(canvas);

container.append(buttonContainer);

buttonContainer.append(clearButton, undoButton, redoButton, thinPenButton, thickPenButton, customStickerButton);

emojiButtons.forEach((emoji) => {
  const stickerButton = createStickerButton(emoji);
  app.append(stickerButton);
  buttonContainer.append(stickerButton);
});

//ui info
const selectedTool = document.createElement("div");
selectedTool.className = "tool-display";
selectedTool.innerHTML = "Selected Tool: Thin Pen";
app.append(selectedTool);

//export
const exportButton = document.createElement("button");
exportButton.innerHTML = "Export as PNG";
app.append(exportButton);

exportButton.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas") as HTMLCanvasElement;
  exportCanvas.width = 2048;
  exportCanvas.height = 1024;

  const exportContext = exportCanvas.getContext("2d") as CanvasRenderingContext2D;
  exportContext.scale(4, 4);

  commands.forEach((cmd) => cmd.display(exportContext));
  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();
});