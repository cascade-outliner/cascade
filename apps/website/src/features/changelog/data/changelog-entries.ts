import rawChangelog from "../../../../../../CHANGELOG.md?raw";
import { parseChangelog } from "../model/changelog-parser";

export const changelogEntries = parseChangelog(rawChangelog);
