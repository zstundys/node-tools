import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

const GAME_DIR = path.resolve("C:/Program Files (x86)/Steam/steamapps/common/Red Dead Redemption 2");
const GAME_SETTINGS_DIR = "C:/Users/zstun/Documents/Rockstar Games/Red Dead Redemption 2/Settings";

const filesToSwap = [
    path.join(GAME_DIR, "RealVR_RDR2.asi"),
    path.join(GAME_DIR, "RealVR64.dll"),
    path.join(GAME_DIR, "ScriptHookRDR2.dll"),
    path.join(GAME_DIR, "dinput8.dll"),
    path.join(GAME_DIR, "openvr_api.dll"),
];

let isBackedUp = false;

for (const file of filesToSwap) {
    const backupFile = file + ".bak";
    isBackedUp = fs.existsSync(backupFile);

    if (isBackedUp) {
        console.log(`Swapping ${path.basename(file)} with ${path.basename(backupFile)}`);
        fs.renameSync(backupFile, file);

        isBackedUp = false;
    } else {
        console.log(`Backing up ${path.basename(file)} to ${path.basename(backupFile)}`);
        fs.renameSync(file, backupFile);

        isBackedUp = true;
    }
}

console.log();

if (isBackedUp) {
    execSync("git checkout NORMAL", { cwd: GAME_SETTINGS_DIR });
    console.log("VR: OFF");
} else {
    execSync("git checkout VR", { cwd: GAME_SETTINGS_DIR });
    console.log("VR: ON");
}

console.log();
