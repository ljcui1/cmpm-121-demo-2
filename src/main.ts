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
if(ctx){
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 256, 256);
}


