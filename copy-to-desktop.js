//@ts-check
const fs = require("fs-extra");

const EXTERNAL_DRIVE_DIR = "D:/Canon 600D";
const LOCAL_DRIVE_DIR = "C:/Users/zstun/Pictures/Photos";
const TARGET_DIR = "C:/Users/zstun/Desktop/Timelapse Footage";

// copyTimelapseFolders(EXTERNAL_DRIVE_DIR, TARGET_DIR);
copyTimelapseFolders(LOCAL_DRIVE_DIR, TARGET_DIR);

console.log(`Done!`);

function copyTimelapseFolders(fromDir, toDir, lrExportFolder = "LR Export") {
  const rootDirFolders = fs.readdirSync(fromDir);

  console.log(`Checking ${rootDirFolders.length} folders...`);

  const timelapseFolders = rootDirFolders.filter((rf) =>
    fs.existsSync(`${fromDir}/${rf}/${lrExportFolder}`)
  );

  timelapseFolders.sort((a, b) => a.localeCompare(b));

  console.log(`Found ${timelapseFolders.length} folders with timelapses...`);

  timelapseFolders.forEach((tf, i) => {
    const progress = `${i + 1}/${timelapseFolders.length}:`.padEnd(5);
    const from = `${fromDir}/${tf}/${lrExportFolder}`;
    const to = `${toDir}/${tf}`;

    const fromFiles = fs.existsSync(from) ? fs.readdirSync(from) : [];
    const toFiles = fs.existsSync(to) ? fs.readdirSync(to) : [];

    if (fromFiles.length === toFiles.length) {
      console.log(`"${progress} ${tf}" is already copied. Skipping...`);
    } else {
      console.log(
        `${progress} Copying\n${"from:".padEnd(
          progress.length + 1
        )}${from}\n${"to:".padEnd(progress.length + 1)}${to}`
      );
      fs.copySync(from, to);
    }

    console.log();
  });
}
