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
canvas.width = 256;
canvas.height = 256
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
  setPosition: (x: number, y: number) => void;
}

const commands: Command[] = [];
const redoCommands: Command[] = [];

let penWidth = 1;
let cursorImg = "∙";
let cursorPos = 8;

let currentLineCommand: MarkerLineCommand | null = null;
let cursorCommand: CursorCommand | null = null;
let stickerCommand: StickerCommand | null = null;

const createMarkerLineCommand = (x: number, y: number): MarkerLineCommand => {
  const points: {x: number, y: number}[] = [{x, y}];

  return{
    points,
    penWidth,

    display(ctx: CanvasRenderingContext2D): void{
      ctx.strokeStyle = "black";
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
    },
    display(ctx: CanvasRenderingContext2D): void{
      ctx.font = "32px monospace";
      ctx.fillText(cursorImg, this.x - cursorPos, this.y + cursorPos);
    },
    
  }
};

const createStickerCommand = (emoji: string, x: number, y: number): StickerCommand => {
  return{
    emoji,
    x,
    y,
    setPosition(x: number, y: number){
      this.x = x;
      this.y = y;
    },
    display(ctx: CanvasRenderingContext2D): void{
      ctx.font = "32px";
      ctx.fillText(this.emoji, this.x, this.y);
    }
  }
};

const bus = new EventTarget();

function notify(name: string): void{
  bus.dispatchEvent(new Event(name));
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("tool-moved", redraw);

tick();

let isDragging = false;
let currentSticker: StickerCommand | null = null;

canvas.addEventListener("mousedown", (e) => {
  if(stickerCommand){
    const stickerWidth = 32;
    const stickerHeight = 32;

    if (e.offsetX >= stickerCommand.x && e.offsetX <= stickerCommand.x + stickerWidth &&
      e.offsetY >= stickerCommand.y && e.offsetY <= stickerCommand.y + stickerHeight) {
      isDragging = true;
      currentSticker = stickerCommand;
    } else {
      stickerCommand.setPosition(e.offsetX, e.offsetY);
      commands.push(stickerCommand);
      //stickerCommand = null;
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
  }
  cursorCommand?.draw(e.offsetX, e.offsetY);
  notify("tool-moved");
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
  isDragging = false;
  currentLineCommand = null;
  currentSticker = null;
  notify("drawing-changed");
});

function redraw(): void{
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  commands.forEach((cmd) => cmd.display(ctx));

  if(cursorCommand){
    cursorCommand.display(ctx);
  }
  if(stickerCommand){
    stickerCommand.display(ctx);
  }
}

function tick(): void{
  redraw();
  requestAnimationFrame(tick);
}
tick();

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
const createStickerButton = (emoji: string) => {
  const button = document.createElement("button");
  button.innerHTML = emoji;
  button.addEventListener("click", () => {
    stickerCommand = createStickerCommand(emoji, cursorCommand?.x || 0, cursorCommand?.y || 0);
    selectedTool.innerHTML = `Selected Tool: ${emoji}`;cursorImg = emoji;
    cursorPos = 0;
    notify("tool-moved");
  });
  return button;
};

const emojiButtons = ["🐀", "😈", "👾"];
emojiButtons.forEach((emoji) => {
  const stickerButton = createStickerButton(emoji);
  app.append(stickerButton);
  buttonContainer.append(stickerButton);
});

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
  cursorPos = 8;
  cursorImg = "∙";
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
  cursorPos = 8;
  cursorImg = "•";
  stickerCommand = null;
});

//reformatting canvas and buttons
const container = document.createElement("div");
container.className = "canvas-container";
app.append(container);

container.append(canvas);

container.append(buttonContainer);

buttonContainer.append(clearButton, undoButton, redoButton, thinPenButton, thickPenButton);

//ui info
const selectedTool = document.createElement("div");
selectedTool.className = "tool-display";
selectedTool.innerHTML = "Selected Tool: Thin Pen";
app.append(selectedTool);