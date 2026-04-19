const { exec } = require("child_process");

setTimeout(() => {
  exec("start chrome http://localhost:3010");
}, 3000);

