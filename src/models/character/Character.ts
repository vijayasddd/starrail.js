import { JsonObject, JsonReader } from "config_file.js";
import { StarRail } from "../../client/StarRail";
import { CharacterData } from "./CharacterData";
import { LightCone } from "../light_cone/LightCone";
import { Relic } from "../relic/Relic";
import { SkillTreeNode, LeveledSkillTreeNode } from "./skill/SkillTreeNode";
import { StatPropertyValue } from "../StatProperty";
import { CharacterStats } from "./CharacterStats";
import { LeveledSkill } from "./skill/Skill";
import { SkillLevel } from "./skill/SkillLevel";
import { nonNullable } from "../../utils/ts_utils";

export class Character {
    readonly client: StarRail;

    readonly characterData: CharacterData;
    readonly lightCone: LightCone | null;
    readonly relics: Relic[];
    readonly level: number;
    readonly exp: number;
    readonly ascension: number;
    readonly eidolons: number;
    readonly skillTreeNodes: LeveledSkillTreeNode[];
    readonly skills: LeveledSkill[];
    readonly basicStats: StatPropertyValue[];
    readonly stats: CharacterStats;

    readonly _data: JsonObject;

    constructor(data: JsonObject, client: StarRail) {
        this.client = client;
        this._data = data;

        const json = new JsonReader(this._data);

        this.characterData = new CharacterData(json.getAsNumber("avatarId"), this.client);

        this.lightCone = json.has("equipment", "tid") ? new LightCone(json.getAsJsonObject("equipment"), this.client) : null;
        this.relics = json.getAsJsonArrayWithDefault([], "relicList").map(relic => new Relic(relic as JsonObject, this.client));

        this.level = json.getAsNumber("level");
        this.exp = json.getAsNumberWithDefault(0, "exp");
        this.ascension = json.getAsNumberWithDefault(0, "promotion");
        this.eidolons = json.getAsNumberWithDefault(0, "rank");

        const unlockedEidolons = this.characterData.eidolons.slice(0, this.eidolons);

        this.skillTreeNodes = json.get("skillTreeList").mapArray((_, skill) => {
            const node = new SkillTreeNode(skill.getAsNumber("pointId"), this.client);
            const levelUpByEidolons = node.levelUpSkills.length > 0 ? unlockedEidolons.reduce<number>((levels, eidolon) => levels + (eidolon.skillsLevelUp[node.levelUpSkills[0].id]?.levelUp ?? 0), 0) : 0;
            const level = new SkillLevel(skill.getAsNumber("level"), levelUpByEidolons);
            return node.getSkillTreeNodeByLevel(level);
        });

        this.skills = this.characterData.skills.map(skill => {
            const skillNode = this.skillTreeNodes.find(node => node.levelUpSkills.some(s => s.id === skill.id));

            // set default level to (1, 0) for "MazeNormal" skills.
            const level = skillNode?.level ?? new SkillLevel(1, 0);

            return skill.getSkillByLevel(level);
        }).filter(nonNullable);

        this.basicStats = [
            ...this.characterData.getStatsByLevel(this.ascension, this.level),
            new StatPropertyValue("SPRatioBase", 1, this.client),
            new StatPropertyValue("MaxSP", this.characterData.maxEnergy, this.client),
        ];

        this.stats = new CharacterStats(this);
    }
}
