import deleteEmpty from "delete-empty";

cleanupFolders("C:\\Users\\zstun\\Videos\\Game Recordings");

/**
 * @param {string} folderPath
 */
function cleanupFolders(folderPath) {
    console.log(`Deleting empty folders in ${folderPath}`);
    deleteEmpty(folderPath).then(() => console.log("Done"));
}
