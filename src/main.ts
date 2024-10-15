import "./style.css";

//metadata
const APP_NAME = "Painote: Paint and Note Application";
const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

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
}

const commands: Command[] = [];
const redoCommands: Command[] = [];

let currentLineCommand: MarkerLineCommand | null = null;

const createMarkerLineCommand = (x: number, y: number): MarkerLineCommand => {
  const points: {x: number, y: number}[] = [{x, y}];

  return{
    points,

    display(ctx: CanvasRenderingContext2D): void{
      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
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

/*const createCursorCommand = (x: number, y: number): CursorCommand => {
  return{
    x,
    y,
    execute: () => {
      //cursor shape
    }
  }
}*/

const bus = new EventTarget();

function notify(name: string): void{
  bus.dispatchEvent(new Event(name));
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("cursor-changed", redraw);

tick();

canvas.addEventListener("mousedown", (e) => {
  currentLineCommand = createMarkerLineCommand(e.offsetX, e.offsetY);
  commands.push(currentLineCommand);
  redoCommands.length = 0;
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if(e.buttons === 1 && currentLineCommand){
    currentLineCommand.drag(e.offsetX, e.offsetY);
    notify("drawing-changed");
  }
});

canvas.addEventListener("mouseup", () => {
  currentLineCommand = null;
  notify("drawing-changed");
});

function redraw(): void{
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  commands.forEach((cmd) => cmd.display(ctx));

  /*if(cursorCommand){
    cursorCommand.execute();
  }*/
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