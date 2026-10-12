const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// serve real files first (css, img, icons, html under apps/, etc.)
app.use(express.static(ROOT, {
  index: false,
  maxAge: "1h",
  fallthrough: true
}));

// explicit index
app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

// any other request: if a matching .html exists, serve it; else index
app.get("*", (req, res) => {
  // strip query
  let p = req.path;
  // try exact file
  const exact = path.join(ROOT, p);
  if (p.includes("..")) {
    return res.status(400).send("bad path");
  }
  if (fs.existsSync(exact) && fs.statSync(exact).isFile()) {
    return res.sendFile(exact);
  }
  // try with .html
  const asHtml = exact.endsWith(".html") ? exact : exact + ".html";
  if (fs.existsSync(asHtml) && fs.statSync(asHtml).isFile()) {
    return res.sendFile(asHtml);
  }
  res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`nowgg-fun-rebuild listening on ${PORT}`);
});
