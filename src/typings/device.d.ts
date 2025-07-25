import type { AndroidImagesMover } from "../transfer-android-images.js";

declare global {
    type DeviceKey = keyof typeof AndroidImagesMover.DEVICE_TARGETS;
}

export {};
