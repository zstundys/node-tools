import fs from "fs-extra";
import path from "path";

const GAME_DIR = path.resolve("C:/Program Files (x86)/Steam/steamapps/common/Red Dead Redemption 2");

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
console.log("VR:", isBackedUp ? "OFF" : "ON");
console.log();
