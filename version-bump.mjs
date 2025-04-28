import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.argv[2];
const manifestFile = "manifest.json";
const versionsFile = "versions.json";

// 버전 유효성 검사
if (!targetVersion) {
    console.error("버전 번호를 지정해주세요!");
    process.exit(1);
}

const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(targetVersion)) {
    console.error("유효한 버전 형식이 아닙니다 (예: 1.0.0)");
    process.exit(1);
}

// manifest.json 업데이트
let manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
const currentVersion = manifest.version;
manifest.version = targetVersion;
writeFileSync(manifestFile, JSON.stringify(manifest, null, "\t"));

// versions.json 업데이트
let versions = JSON.parse(readFileSync(versionsFile, "utf8"));
versions[targetVersion] = manifest.minAppVersion;
writeFileSync(versionsFile, JSON.stringify(versions, null, "\t"));

console.log(`버전이 ${currentVersion}에서 ${targetVersion}으로 업데이트되었습니다.`);
