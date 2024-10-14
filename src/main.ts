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
const ctx = canvas.getContext("2d");

//drawing
interface Point{
  x: number;
  y: number;
}

const lines: Point[][] = [];
const redoLines: Point[][] = [];

let currentLine: Point[] | null = null;

const cursor = {
  active: false,
  x: 0,
  y: 0
};

//custom drawing event
function drawingChangedEvent(){
  const event = new Event("drawing-changed");
  canvas.dispatchEvent(event);
}

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  currentLine = [];
  lines.push(currentLine);
  redoLines.splice(0, redoLines.length);
  currentLine.push({x: cursor.x, y: cursor.y});

  drawingChangedEvent();
});

canvas.addEventListener("mousemove", (e) => {
  if(cursor.active && currentLine){
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentLine.push({x: cursor.x, y: cursor.y});

    drawingChangedEvent();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentLine = null;
  drawingChangedEvent();
});

canvas.addEventListener("drawing-changed", () => {
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  redraw();
});

function redraw(){
  for(const line of lines){
    if(line.length > 1){
      ctx?.beginPath();
      const{x, y} = line[0];
      ctx?.moveTo(x, y);
      for(const{x, y} of line){
        ctx?.lineTo(x, y);
      }
      ctx?.stroke();
    }
  }
}

document.body.append(document.createElement("br"));

//buttons
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
app.append(clearButton);

clearButton.addEventListener("click", () => {
  lines.splice(0, lines.length);
  drawingChangedEvent();
});

