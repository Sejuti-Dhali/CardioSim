"use strict";
const fs=require("node:fs");
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const js=fs.readFileSync(path.join(root,"assets/app.js"),"utf8");
for(const id of [
 "architecture","simulation","results","network","wires","nodes",
 "chartPressure","chartArtery","chartVolume","chartFlow","chartPV",
 "hr","contract","resist","blood","speed","run","reset"
]){
 assert.ok(html.includes(`id="${id}"`),"Missing: "+id);
}
assert.match(js,/function simulate\(\)/);
assert.match(js,/function derivative\(/);
assert.match(js,/function pressures\(/);
assert.match(js,/function flows\(/);
assert.match(js,/maxDrift/);
assert.match(js,/requestAnimationFrame/);
assert.ok(!html.includes("assets/report/page-"),"Report screenshot in website");
assert.ok(!html.includes("reference-gallery"),"Old gallery remains");
assert.ok(fs.existsSync(path.join(root,"assets/style.css")));
console.log("PASS: Dynamic cardiac network, numerical engine, results, no PDF gallery");