#!/usr/bin/env node

/**
 * Socket.IO Implementation Verification Script
 * Checks if all Socket.IO components are properly set up
 */

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    log(`✅ ${description}`, "green");
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, "red");
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(projectRoot, filePath);

  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description} - File not found`, "red");
    return false;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  if (content.includes(searchString)) {
    log(`✅ ${description}`, "green");
    return true;
  } else {
    log(`⚠️  ${description} - Search string not found`, "yellow");
    return false;
  }
}

function checkPackageJson() {
  log("\n📦 Checking package.json dependencies...", "blue");

  const packagePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    log("❌ package.json not found", "red");
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  let socketIOCheck = true;

  if (packageJson.dependencies?.["socket.io"]) {
    log(`✅ socket.io (${packageJson.dependencies["socket.io"]})`, "green");
  } else {
    log("❌ socket.io not found in dependencies", "red");
    socketIOCheck = false;
  }

  if (packageJson.dependencies?.["socket.io-client"]) {
    log(
      `✅ socket.io-client (${packageJson.dependencies["socket.io-client"]})`,
      "green",
    );
  } else {
    log("⚠️  socket.io-client not found in dependencies", "yellow");
    socketIOCheck = false;
  }

  return socketIOCheck;
}

function checkPrismaSchema() {
  log("\n🗄️  Checking Prisma schema...", "blue");

  const schemaPath = path.join(projectRoot, "prisma/schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    log("⚠️  Prisma schema not found", "yellow");
    return false;
  }

  const schema = fs.readFileSync(schemaPath, "utf8");
  let schemaCheck = true;

  const models = ["model User", "model Room", "model Member", "model Message"];
  models.forEach((model) => {
    if (schema.includes(model)) {
      log(`✅ ${model} found`, "green");
    } else {
      log(`⚠️  ${model} not found`, "yellow");
      schemaCheck = false;
    }
  });

  return schemaCheck;
}

function checkSocketIOCore() {
  log("\n🔌 Checking Socket.IO core files...", "blue");

  let coreCheck = true;

  coreCheck &= checkFileExists(
    "src/lib/socketService.js",
    "Socket.IO Service (socketService.js)",
  );

  coreCheck &= checkFileExists(
    "src/hooks/useSocket.js",
    "Socket.IO Hook (useSocket.js)",
  );

  coreCheck &= checkFileExists(
    "src/app/api/server.js",
    "Server Setup (server.js)",
  );

  coreCheck &= checkFileExists(
    "src/app/api/socket/route.js",
    "Socket Status Route (route.js)",
  );

  return coreCheck;
}

function checkSocketIOEvents() {
  log("\n⚡ Checking Socket.IO events...", "blue");

  const servicePath = path.join(projectRoot, "src/lib/socketService.js");

  if (!fs.existsSync(servicePath)) {
    log("❌ socketService.js not found", "red");
    return false;
  }

  const service = fs.readFileSync(servicePath, "utf8");
  let eventsCheck = true;

  const events = [
    "user:join",
    "room:join",
    "message:send",
    "room:members:get",
    "message:history:get",
    "user:typing",
    "room:leave",
  ];

  events.forEach((event) => {
    if (service.includes(`"${event}"`)) {
      log(`✅ Event handler: ${event}`, "green");
    } else {
      log(`❌ Event handler missing: ${event}`, "red");
      eventsCheck = false;
    }
  });

  return eventsCheck;
}

function checkSocketIOFeatures() {
  log("\n🎯 Checking Socket.IO features...", "blue");

  const servicePath = path.join(projectRoot, "src/lib/socketService.js");

  if (!fs.existsSync(servicePath)) {
    log("❌ socketService.js not found", "red");
    return false;
  }

  const service = fs.readFileSync(servicePath, "utf8");
  let featuresCheck = true;

  const features = [
    ["connectedUsers", "User tracking"],
    ["roomMembers", "Room member tracking"],
    ["io.to", "Message broadcasting"],
    ["prisma.message.create", "Database persistence"],
    ["socket.on", "Event handling"],
  ];

  features.forEach(([searchTerm, description]) => {
    if (service.includes(searchTerm)) {
      log(`✅ ${description}`, "green");
    } else {
      log(`⚠️  ${description} not found`, "yellow");
      featuresCheck = false;
    }
  });

  return featuresCheck;
}

function checkComponents() {
  log("\n🎨 Checking React components...", "blue");

  let componentCheck = true;

  componentCheck &= checkFileExists(
    "src/components/ChatRoom.jsx",
    "Chat Room Component (ChatRoom.jsx)",
  );

  return componentCheck;
}

function checkTests() {
  log("\n🧪 Checking test files...", "blue");

  let testsCheck = true;

  testsCheck &= checkFileExists(
    "__tests__/socket.test.js",
    "Socket.IO Unit Tests (socket.test.js)",
  );

  testsCheck &= checkFileExists(
    "__tests__/socketManualTests.js",
    "Socket.IO Manual Tests (socketManualTests.js)",
  );

  return testsCheck;
}

function checkDocumentation() {
  log("\n📚 Checking documentation...", "blue");

  let docCheck = true;

  docCheck &= checkFileExists(
    "SOCKET_IO_GUIDE.md",
    "Socket.IO Implementation Guide",
  );

  docCheck &= checkFileExists("setup-socket.sh", "Socket.IO Setup Script");

  return docCheck;
}

function checkHookFunctionality() {
  log("\n🪝 Checking useSocket hook functionality...", "blue");

  const hookPath = path.join(projectRoot, "src/hooks/useSocket.js");

  if (!fs.existsSync(hookPath)) {
    log("❌ useSocket.js not found", "red");
    return false;
  }

  const hook = fs.readFileSync(hookPath, "utf8");
  let hookCheck = true;

  const functions = [
    "joinUser",
    "joinRoom",
    "sendMessage",
    "getRoomMembers",
    "getMessageHistory",
    "setTyping",
    "leaveRoom",
  ];

  functions.forEach((func) => {
    if (hook.includes(func)) {
      log(`✅ Hook function: ${func}`, "green");
    } else {
      log(`❌ Hook function missing: ${func}`, "red");
      hookCheck = false;
    }
  });

  return hookCheck;
}

function main() {
  log(
    "\n╔════════════════════════════════════════════════════════════╗",
    "blue",
  );
  log("║        Socket.IO Implementation Verification              ║", "blue");
  log(
    "╚════════════════════════════════════════════════════════════╝\n",
    "blue",
  );

  const checks = [
    checkPackageJson,
    checkPrismaSchema,
    checkSocketIOCore,
    checkSocketIOEvents,
    checkSocketIOFeatures,
    checkComponents,
    checkTests,
    checkDocumentation,
    checkHookFunctionality,
  ];

  const results = checks.map((check) => {
    try {
      return check();
    } catch (error) {
      log(`❌ Error running check: ${error.message}`, "red");
      return false;
    }
  });

  log(
    "\n╔════════════════════════════════════════════════════════════╗",
    "blue",
  );
  log("║                   VERIFICATION SUMMARY                    ║", "blue");
  log(
    "╚════════════════════════════════════════════════════════════╝\n",
    "blue",
  );

  const passed = results.filter((r) => r).length;
  const total = results.length;

  log(
    `Checks passed: ${passed}/${total}`,
    passed === total ? "green" : "yellow",
  );

  if (passed === total) {
    log("\n✅ All Socket.IO components are properly set up!", "green");
    log("\nNext steps:", "blue");
    log("  1. npm install (to install socket.io-client)", "gray");
    log("  2. npm run dev (start development server)", "gray");
    log("  3. Open http://localhost:3000", "gray");
    log("  4. Check browser console for Socket.IO connection", "gray");
    log("\nFor manual testing:", "blue");
    log("  - See /__tests__/socketManualTests.js", "gray");
    log("  - Run: await runCompleteSocketTest()", "gray");
  } else {
    log("\n⚠️  Some checks failed. Please review the issues above.", "yellow");
  }

  log("\n");
  process.exit(passed === total ? 0 : 1);
}

main();
